package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// Define the same models locally for the bot service
type Role int

const (
	UserRole Role = iota
	AdminRole
)

func (r Role) String() string {
	switch r {
	case UserRole:
		return "user"
	case AdminRole:
		return "admin"
	default:
		return "unknown"
	}
}

type User struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Email     string         `json:"email" gorm:"uniqueIndex;not null"`
	Password  string         `json:"password" gorm:"not null"`
	Name      string         `json:"name"`
	Role      Role           `json:"role" gorm:"default:0"`
}

type VisitCard struct {
	ID               uint   `json:"id" gorm:"primaryKey"`
	Title            string `json:"title" gorm:"not null"`
	Description      string `json:"description" gorm:"type:text"`
	LogoURL          string `json:"logo_url"`
	Domain           string `json:"domain" gorm:"uniqueIndex"`
	TelegramBotToken string `json:"telegram_bot_token" gorm:"column:telegram_bot_token"`
	TokenValid       bool   `json:"token_valid" gorm:"default:true"` // Track if token is valid
	TokenErrorMessage string `json:"token_error_message" gorm:"default:''"` // Store error message if token is invalid
	ViewCount        uint   `json:"view_count" gorm:"default:0"`
	BotViewCount     uint   `json:"bot_view_count" gorm:"default:0"`
	UserID           uint   `json:"user_id" gorm:"not null"`
	DeletedAt        gorm.DeletedAt `json:"deleted_at" gorm:"index"` // Soft delete for deleted cards
}

// BotInstance represents a running bot instance
type BotInstance struct {
	bot         *tgbotapi.BotAPI
	cancelFunc  context.CancelFunc
	visitCardID uint
	token       string
	stopCh      chan struct{} // Channel to signal stopping
	wg          sync.WaitGroup // Wait group to wait for goroutine to finish
}

// BotManager manages all bot instances with proper synchronization
type BotManager struct {
	botsByCard map[uint]*BotInstance    // Map visit card ID to bot instance
	botsByToken map[string]*BotInstance // Map bot token to bot instance
	mutex       sync.RWMutex            // Mutex to protect the maps
	ctx         context.Context         // Global context
}

// NewBotManager creates a new BotManager instance
func NewBotManager(ctx context.Context) *BotManager {
	return &BotManager{
		botsByCard:  make(map[uint]*BotInstance),
		botsByToken: make(map[string]*BotInstance),
		ctx:         ctx,
	}
}

// StartBot starts a bot instance for a specific visit card
func (bm *BotManager) StartBot(token string, visitCardID uint) error {
	bm.mutex.Lock()
	defer bm.mutex.Unlock()

	// Check if a bot is already running for this visit card
	if existingInstance, exists := bm.botsByCard[visitCardID]; exists {
		if existingInstance.token != token {
			// Different token for the same card - stop the old bot first
			log.Printf("Visit card %d had different token %s, stopping old bot before starting new bot with token %s", visitCardID, existingInstance.token[:10], token[:10])
			bm.stopBotUnlocked(existingInstance.token)
			// Wait a bit for the old bot to fully stop
			time.Sleep(1 * time.Second)
		} else {
			// Same token, bot is already running
			log.Printf("Bot with token %s is already running for visit card %d", token[:10]+"...", visitCardID)
			return nil
		}
	}

	// Check if this token is already being used by another card
	if existingInstance, exists := bm.botsByToken[token]; exists {
		log.Printf("Token %s is already in use by visit card %d, skipping", token[:10]+"...", existingInstance.visitCardID)
		return fmt.Errorf("token already in use by another visit card")
	}

	// Create new bot instance
	bot, err := tgbotapi.NewBotAPI(token)
	if err != nil {
		return err
	}

	// Validate the token by getting bot info
	_, err = bot.GetMe()
	if err != nil {
		return err
	}

	// Delete any existing webhook to ensure we can use getUpdates method
	_, err = bot.Request(tgbotapi.DeleteWebhookConfig{})
	if err != nil {
		log.Printf("Warning: Could not delete webhook for bot %d: %v", visitCardID, err)
	} else {
		log.Printf("Successfully deleted webhook for bot %d", visitCardID)
	}

	bot.Debug = true
	log.Printf("Authorized bot for visit card %d on account %s", visitCardID, bot.Self.UserName)

	// Create update config
	u := tgbotapi.NewUpdate(0)
	u.Timeout = 60

	// Create a context for this specific bot
	botCtx, cancelFunc := context.WithCancel(bm.ctx)

	// Create the bot instance
	instance := &BotInstance{
		bot:         bot,
		cancelFunc:  cancelFunc,
		visitCardID: visitCardID,
		token:       token,
		stopCh:      make(chan struct{}),
	}

	// Use ticker-based approach instead of GetUpdatesChan to have better control
	// This avoids the persistent connection issue that causes conflicts
	updateTicker := time.NewTicker(1 * time.Second)
	lastUpdateID := 0

	// Increment the wait group before starting the goroutine
	instance.wg.Add(1)
	go func() {
		defer instance.wg.Done() // Signal that the goroutine is done
		defer cancelFunc()       // Ensure the context is cancelled when the goroutine exits
		defer updateTicker.Stop()

		for {
			select {
			case <-botCtx.Done():
				log.Printf("Context cancelled for bot on visit card %d", visitCardID)
				return
			case <-instance.stopCh:
				log.Printf("Stop signal received for bot on visit card %d", visitCardID)
				return
			case <-updateTicker.C:
				// Create update config with offset to get new updates
				config := tgbotapi.NewUpdate(lastUpdateID + 1)
				config.Timeout = 60

				// Get updates using GetUpdates instead of GetUpdatesChan
				updates, err := bot.GetUpdates(config)
				if err != nil {
					// Check if this is a network error (temporary) or authentication error (permanent)
					errStr := err.Error()
					if isNetworkError(errStr) {
						// This is a temporary network issue, just log and continue
						log.Printf("Network error getting updates for visit card %d: %v", visitCardID, err)
						continue
					} else {
						// This might be an authentication error, log and continue
						// Don't mark the token as invalid for temporary network issues
						log.Printf("Error getting updates for visit card %d: %v", visitCardID, err)
						continue
					}
				}

				for _, update := range updates {
					if update.Message != nil {
						if update.Message.IsCommand() {
							bm.handleCommand(bot, update.Message, visitCardID)
						} else {
							bm.handleMessage(bot, update.Message, visitCardID)
						}
					}
					// Keep track of the highest update ID to avoid processing the same update again
					if update.UpdateID > lastUpdateID {
						lastUpdateID = update.UpdateID
					}
				}
			}
		}
	}()

	// Store the bot instance in both maps
	bm.botsByCard[visitCardID] = instance
	bm.botsByToken[token] = instance

	log.Printf("Started bot for visit card %d with token %s", visitCardID, token[:10]+"...")
	return nil
}

// stopBotUnlocked stops a bot instance (internal method, assumes mutex is already locked)
func (bm *BotManager) stopBotUnlocked(token string) {
	if instance, exists := bm.botsByToken[token]; exists {
		// Signal the goroutine to stop
		close(instance.stopCh)
		
		// Cancel the context
		instance.cancelFunc()
		
		// Wait for the goroutine to finish
		instance.wg.Wait()
		
		// Remove from both maps
		delete(bm.botsByCard, instance.visitCardID)
		delete(bm.botsByToken, token)
		
		log.Printf("Stopped bot with token %s for visit card %d", token[:10]+"...", instance.visitCardID)
	}
}

// StopBot stops a bot instance by token
func (bm *BotManager) StopBot(token string) {
	bm.mutex.Lock()
	defer bm.mutex.Unlock()
	
	bm.stopBotUnlocked(token)
}

// StopBotByCard stops a bot instance by visit card ID
func (bm *BotManager) StopBotByCard(visitCardID uint) {
	bm.mutex.Lock()
	defer bm.mutex.Unlock()
	
	if instance, exists := bm.botsByCard[visitCardID]; exists {
		// Signal the goroutine to stop
		close(instance.stopCh)
		
		// Cancel the context
		instance.cancelFunc()
		
		// Wait for the goroutine to finish
		instance.wg.Wait()
		
		// Remove from both maps
		delete(bm.botsByCard, visitCardID)
		delete(bm.botsByToken, instance.token)
		
		log.Printf("Stopped bot with token %s for visit card %d", instance.token[:10]+"...", visitCardID)
	}
}

// GetRunningBots returns a list of running bot tokens
func (bm *BotManager) GetRunningBots() []string {
	bm.mutex.RLock()
	defer bm.mutex.RUnlock()

	tokens := make([]string, 0, len(bm.botsByToken))
	for token := range bm.botsByToken {
		tokens = append(tokens, token)
	}
	return tokens
}

// GetRunningBotCount returns the number of running bots
func (bm *BotManager) GetRunningBotCount() int {
	bm.mutex.RLock()
	defer bm.mutex.RUnlock()
	return len(bm.botsByToken)
}

// handleCommand handles incoming commands
func (bm *BotManager) handleCommand(bot *tgbotapi.BotAPI, message *tgbotapi.Message, visitCardID uint) {
	switch message.Command() {
	case "start":
		bm.sendWelcomeMessage(bot, message.Chat.ID, visitCardID)
	case "help":
		helpMsg := tgbotapi.NewMessage(message.Chat.ID, "Commands:\n/start - Welcome message\n/help - Show this help message")
		bot.Send(helpMsg)
	default:
		unknownMsg := tgbotapi.NewMessage(message.Chat.ID, "Unknown command. Type /help for available commands.")
		bot.Send(unknownMsg)
	}
}

// handleMessage handles incoming messages
func (bm *BotManager) handleMessage(bot *tgbotapi.BotAPI, message *tgbotapi.Message, visitCardID uint) {
	// Send the welcome message when any message is received
	bm.sendWelcomeMessage(bot, message.Chat.ID, visitCardID)
}

// sendWelcomeMessage sends the welcome message to the user
func (bm *BotManager) sendWelcomeMessage(bot *tgbotapi.BotAPI, chatID int64, visitCardID uint) {
	// Find the visit card by ID
	var visitCard VisitCard
	if err := db.First(&visitCard, visitCardID).Error; err != nil {
		log.Printf("Error finding visit card %d: %v", visitCardID, err)
		errorMsg := tgbotapi.NewMessage(chatID, "Sorry, there was an error retrieving company information.")
		bot.Send(errorMsg)
		return
	}

	// Increment bot view count
	incrementBotView(visitCardID)

	// Prepare the welcome message
	welcomeText := /*"🏢 " +*/ visitCard.Title + "\n\n" + visitCard.Description
	if visitCard.LogoURL != "" {
		// Send logo if available
		photoConfig := tgbotapi.NewPhoto(chatID, tgbotapi.FileURL(visitCard.LogoURL))
		photoConfig.Caption = welcomeText
		bot.Send(photoConfig)
	} else {
		// Just send the text
		msg := tgbotapi.NewMessage(chatID, welcomeText)
		bot.Send(msg)
	}
}

// incrementBotView increments the bot view count for a visit card
func incrementBotView(visitCardID uint) {
	// Find the visit card
	var visitCard VisitCard
	if err := db.First(&visitCard, visitCardID).Error; err != nil {
		log.Printf("Error finding visit card %d for view increment: %v", visitCardID, err)
		return
	}

	// Increment bot view count
	db.Model(&visitCard).UpdateColumn("bot_view_count", visitCard.BotViewCount+1)
	log.Printf("Incremented bot view count for visit card %d, new count: %d", visitCardID, visitCard.BotViewCount+1)
}

// validateBotToken validates a bot token by attempting to connect to the API
func isNetworkError(errStr string) bool {
	// Check if the error is related to network connectivity issues
	// Common network error patterns
	networkPatterns := []string{
		"connection refused",
		"connection reset",
		"connection closed",
		"timeout",
		"wsarecv",
		"wsasend",
		"broken pipe",
		"network is unreachable",
		"no route to host",
		"connection timed out",
		"transport error",
		"read: connection reset",
		"write: connection reset",
		"forcibly closed by the remote host",
	}

	for _, pattern := range networkPatterns {
		if strings.Contains(strings.ToLower(errStr), pattern) {
			return true
		}
	}
	return false
}

func validateBotToken(token string) error {
	// Attempt to create a bot instance with the token to validate it
	bot, err := tgbotapi.NewBotAPI(token)
	if err != nil {
		return err
	}

	// Try to get bot info to confirm the token is valid
	_, err = bot.GetMe()
	if err != nil {
		// Check if this is a network error (temporary) or authentication error (permanent)
		errStr := err.Error()
		if isNetworkError(errStr) {
			// This is a temporary network issue, not an invalid token
			return fmt.Errorf("network error during token validation: %v", err)
		}
		// This is likely an authentication error (invalid token)
		return err
	}

	return nil
}

var db *gorm.DB

func initDB() {
	var err error

	// Construct DSN from individual environment variables with Docker-friendly defaults
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "db" // Default to 'db' service name in Docker environment
	}

	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "3306"
	}

	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "platform_user"
	}

	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		dbPassword = "password"
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "visit_platform"
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser, dbPassword, dbHost, dbPort, dbName)

	// Retry connecting to the database with exponential backoff
	maxRetries := 10
	for i := 0; i < maxRetries; i++ {
		db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
		if err == nil {
			log.Printf("Connected to database successfully on %s:%s", dbHost, dbPort)
			return
		}

		log.Printf("Failed to connect to database (attempt %d/%d): %v", i+1, maxRetries, err)
		time.Sleep(time.Duration(i+1) * time.Second)
	}

	log.Fatal("Failed to connect to database after", maxRetries, "attempts")
}

// syncBots synchronizes the bot instances with the database
func syncBots(bm *BotManager) {
	ticker := time.NewTicker(10 * time.Second) // Sync every 10 seconds for faster detection
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			log.Println("Starting bot sync cycle...")

			// Fetch all non-deleted visit cards with bot tokens
			var visitCards []VisitCard
			if err := db.Unscoped().Where("telegram_bot_token != '' AND telegram_bot_token != 'token was not valid' AND token_valid = true AND deleted_at IS NULL").Find(&visitCards).Error; err != nil {
				log.Printf("Error fetching visit cards for bot sync: %v", err)
				continue
			}

			log.Printf("Found %d active visit cards in database", len(visitCards))

			// Process each visit card
			for _, vc := range visitCards {
				log.Printf("Processing visit card %d with bot token: %s...", vc.ID, vc.TelegramBotToken[:10])

				// Validate the token
				if err := validateBotToken(vc.TelegramBotToken); err != nil {
					errStr := err.Error()
					if isNetworkError(errStr) {
						// This is a network error, not an invalid token - don't mark as invalid
						log.Printf("Network error validating token for visit card %d (not marking as invalid): %v", vc.ID, err)
						// Don't skip processing this card - it might work when network recovers
					} else {
						// This is likely an authentication error, mark the token as invalid
						log.Printf("Invalid token for visit card %d: %v", vc.ID, err)

						// Update the database to mark the token as invalid
						db.Model(&VisitCard{}).Where("id = ?", vc.ID).Updates(map[string]interface{}{
							"token_valid": false,
							"token_error_message": "Token validation failed: " + err.Error(),
						})

						// Stop the bot if it's currently running
						bm.StopBot(vc.TelegramBotToken)
						continue // Skip processing this card
					}
				} else {
					// Token is valid, update the database if it was previously marked as invalid
					if !vc.TokenValid || vc.TokenErrorMessage != "" {
						db.Model(&VisitCard{}).Where("id = ?", vc.ID).Updates(map[string]interface{}{
							"token_valid": true,
							"token_error_message": "",
						})
						log.Printf("Token validated successfully for visit card %d", vc.ID)
					}
				}

				// Check if the current token is already running for this visit card
				bm.mutex.RLock()
				botExists := false
				if instance, exists := bm.botsByCard[vc.ID]; exists {
					if instance.token == vc.TelegramBotToken {
						botExists = true
						log.Printf("Bot for visit card %d is already running with correct token", vc.ID)
					} else {
						log.Printf("Bot for visit card %d has different token, will be replaced", vc.ID)
					}
				}
				bm.mutex.RUnlock()

				if !botExists {
					log.Printf("Attempting to start new bot for visit card %d", vc.ID)
					if err := bm.StartBot(vc.TelegramBotToken, vc.ID); err != nil {
						log.Printf("Failed to start bot for visit card %d: %v", vc.ID, err)
					} else {
						log.Printf("Successfully started bot for visit card %d", vc.ID)
					}
				}
			}

			// Stop bots for visit cards that no longer have valid tokens or have been deleted
			runningTokens := bm.GetRunningBots()
			log.Printf("Currently running bots: %d", len(runningTokens))

			for _, token := range runningTokens {
				found := false
				for _, vc := range visitCards {
					// Only consider running if the token is valid and matches
					if vc.TelegramBotToken == token {
						found = true
						break
					}
				}

				if !found {
					log.Printf("Stopping bot with token %s (visit card no longer exists, token removed, marked invalid, or deleted)", token[:10]+"...")
					bm.StopBot(token)
				}
			}

			log.Printf("Sync complete. Running bots: %d", bm.GetRunningBotCount())
		}
	}
}

func main() {
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
	}

	initDB()

	// Create context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Create bot manager
	botManager := NewBotManager(ctx)

	// Start the sync routine to keep track of bot tokens
	go syncBots(botManager)

	// Log startup message
	log.Println("Bot manager started, monitoring for visit cards with bot tokens...")

	// Keep the process alive
	select {}
}