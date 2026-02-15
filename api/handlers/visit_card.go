package handlers

import (
	"net/http"
	"regexp"
	"strconv"

	"api/db"
	"api/models"

	"github.com/gin-gonic/gin"
)

type VisitCardHandler struct{}

type CreateVisitCardRequest struct {
	Title            string `json:"title" binding:"required"`
	Description      string `json:"description"`
	LogoURL          string `json:"logo_url"`
	Domain           string `json:"domain"`
	TelegramBotToken string `json:"telegram_bot_token"`
}

type UpdateVisitCardRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	LogoURL     string `json:"logo_url"`
	Domain      string `json:"domain"`
	TelegramBotToken string `json:"telegram_bot_token"`
}

func (h *VisitCardHandler) CreateVisitCard(c *gin.Context) {
	userID, _ := c.Get("userID")
	
	var req CreateVisitCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate bot token format if provided
	if req.TelegramBotToken != "" && !isValidBotTokenFormat(req.TelegramBotToken) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bot token format"})
		return
	}

	// Set initial validity based on whether token is provided
	initialTokenValid := true
	if req.TelegramBotToken != "" {
		initialTokenValid = isValidBotTokenFormat(req.TelegramBotToken)
	}

	visitCard := models.VisitCard{
		Title:              req.Title,
		Description:        req.Description,
		LogoURL:            req.LogoURL,
		Domain:             req.Domain,
		TelegramBotToken:   req.TelegramBotToken,
		TokenValid:         initialTokenValid,
		TokenErrorMessage:  "",
		UserID:             userID.(uint),
	}

	result := db.DB.Create(&visitCard)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"visit_card": visitCard})
}

func (h *VisitCardHandler) GetVisitCard(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	var visitCard models.VisitCard
	if err := db.DB.Preload("User").First(&visitCard, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Visit card not found"})
		return
	}

	// Return the visit card without incrementing view count (for editing purposes)
	c.JSON(http.StatusOK, gin.H{"visit_card": visitCard})
}

func (h *VisitCardHandler) GetMyVisitCards(c *gin.Context) {
	userID, _ := c.Get("userID")
	
	var visitCards []models.VisitCard
	if err := db.DB.Where("user_id = ?", userID).Find(&visitCards).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"visit_cards": visitCards})
}

func (h *VisitCardHandler) UpdateVisitCard(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID, _ := c.Get("userID")

	var req UpdateVisitCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var visitCard models.VisitCard
	if err := db.DB.First(&visitCard, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Visit card not found"})
		return
	}

	// Check ownership
	if visitCard.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to update this visit card"})
		return
	}

	if req.Title != "" {
		visitCard.Title = req.Title
	}
	if req.Description != "" {
		visitCard.Description = req.Description
	}
	if req.LogoURL != "" {
		visitCard.LogoURL = req.LogoURL
	}
	if req.Domain != "" {
		visitCard.Domain = req.Domain
	}
	if req.TelegramBotToken != "" {
		// Validate the bot token format using regex
		if !isValidBotTokenFormat(req.TelegramBotToken) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bot token format"})
			return
		}
		
		// If the token is changing, reset validation status
		if visitCard.TelegramBotToken != req.TelegramBotToken {
			visitCard.TelegramBotToken = req.TelegramBotToken
			visitCard.TokenValid = true // Reset to valid initially, bot service will validate
			visitCard.TokenErrorMessage = ""
		} else {
			// If token is the same, just update it (might be re-saving)
			visitCard.TelegramBotToken = req.TelegramBotToken
		}
	} else if req.TelegramBotToken == "" && visitCard.TelegramBotToken != "" {
		// If the token is being cleared (set to empty), clear it in the database
		visitCard.TelegramBotToken = ""
		visitCard.TokenValid = true // Valid because it's empty
		visitCard.TokenErrorMessage = ""
	}

	if err := db.DB.Save(&visitCard).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"visit_card": visitCard})
}

func (h *VisitCardHandler) DeleteVisitCard(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID, _ := c.Get("userID")
	
	var visitCard models.VisitCard
	if err := db.DB.First(&visitCard, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Visit card not found"})
		return
	}

	// Check ownership
	if visitCard.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to delete this visit card"})
		return
	}

	result := db.DB.Delete(&visitCard)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Visit card deleted successfully"})
}

func (h *VisitCardHandler) GetAllVisitCards(c *gin.Context) {
	role, _ := c.Get("role")
	if role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}
	
	var visitCards []models.VisitCard
	if err := db.DB.Preload("User").Find(&visitCards).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"visit_cards": visitCards})
}

func (h *VisitCardHandler) GetPublicVisitCard(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	var visitCard models.VisitCard
	if err := db.DB.First(&visitCard, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Visit card not found"})
		return
	}

	// Increment view count
	db.DB.Model(&visitCard).UpdateColumn("view_count", visitCard.ViewCount+1)

	// Return only public fields (without sensitive stats)
	publicVisitCard := gin.H{
		"id":          visitCard.ID,
		"title":       visitCard.Title,
		"description": visitCard.Description,
		"logo_url":    visitCard.LogoURL,
		"domain":      visitCard.Domain, // Include domain for domain-based access
		"created_at":  visitCard.CreatedAt,
		"updated_at":  visitCard.UpdatedAt,
	}

	c.JSON(http.StatusOK, gin.H{"visit_card": publicVisitCard})
}

// GetVisitCardDetails returns detailed information including stats for authorized users, basic info for others
func (h *VisitCardHandler) GetVisitCardDetails(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID, hasAuth := c.Get("userID")
	role, _ := c.Get("role")

	var visitCard models.VisitCard
	if err := db.DB.Preload("User").First(&visitCard, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Visit card not found"})
		return
	}

	// Increment view count for all visitors (both authorized and unauthorized)
	db.DB.Model(&visitCard).UpdateColumn("view_count", visitCard.ViewCount+1)

	// Check if user is authorized (owner or admin)
	isOwner := hasAuth && visitCard.UserID == userID.(uint)
	isAdmin := role == "admin"
	isAuthorized := isOwner || isAdmin

	if isAuthorized {
		// Return detailed information including stats for authorized users
		detailedVisitCard := gin.H{
			"id":               visitCard.ID,
			"title":            visitCard.Title,
			"description":      visitCard.Description,
			"logo_url":         visitCard.LogoURL,
			"domain":           visitCard.Domain,
			"telegram_bot_token": visitCard.TelegramBotToken,
			"view_count":       visitCard.ViewCount + 1, // Show the incremented value
			"bot_view_count":   visitCard.BotViewCount,
			"created_at":       visitCard.CreatedAt,
			"updated_at":       visitCard.UpdatedAt,
			"user": gin.H{
				"id":         visitCard.User.ID,
				"name":       visitCard.User.Name,
				"email":      visitCard.User.Email,
				"company_name": visitCard.User.CompanyName,
			},
		}

		c.JSON(http.StatusOK, gin.H{"visit_card": detailedVisitCard})
	} else {
		// Return only basic information for unauthorized users (same as public endpoint but without view count)
		basicVisitCard := gin.H{
			"id":          visitCard.ID,
			"title":       visitCard.Title,
			"description": visitCard.Description,
			"logo_url":    visitCard.LogoURL,
			"created_at":  visitCard.CreatedAt,
			"updated_at":  visitCard.UpdatedAt,
		}

		c.JSON(http.StatusOK, gin.H{"visit_card": basicVisitCard})
	}
}

func (h *VisitCardHandler) GetPublicVisitCardByDomain(c *gin.Context) {
	domain := c.Param("domain")

	var visitCard models.VisitCard
	if err := db.DB.Where("domain = ?", domain).First(&visitCard).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Visit card not found"})
		return
	}

	// Increment view count on every visit
	db.DB.Model(&visitCard).UpdateColumn("view_count", visitCard.ViewCount+1)

	// Return only public fields (without sensitive stats)
	publicVisitCard := gin.H{
		"id":          visitCard.ID,
		"title":       visitCard.Title,
		"description": visitCard.Description,
		"logo_url":    visitCard.LogoURL,
		"domain":      visitCard.Domain, // Include domain for domain-based access
		"created_at":  visitCard.CreatedAt,
		"updated_at":  visitCard.UpdatedAt,
	}

	c.JSON(http.StatusOK, gin.H{"visit_card": publicVisitCard})
}

func (h *VisitCardHandler) GetAllPublicVisitCards(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")
	offset := (page - 1) * limit

	var visitCards []models.VisitCard
	var total int64

	// Build query with optional search
	query := db.DB.Preload("User")
	
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("title LIKE ? OR description LIKE ?", searchPattern, searchPattern)
	}
	
	// Count total records
	query.Model(&visitCards).Count(&total)

	// Get records with pagination
	if err := query.Offset(offset).Limit(limit).Find(&visitCards).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Prepare public response (exclude sensitive stats)
	publicVisitCards := make([]gin.H, len(visitCards))
	for i, card := range visitCards {
		publicVisitCards[i] = gin.H{
			"id":           card.ID,
			"title":        card.Title,
			"description":  card.Description,
			"logo_url":     card.LogoURL,
			"domain":       card.Domain, // Include domain for domain-based access
			"created_at":   card.CreatedAt,
			"updated_at":   card.UpdatedAt,
			"user": gin.H{
				"name":         card.User.Name,
				"company_name": card.User.CompanyName,
			},
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"visit_cards": publicVisitCards,
		"pagination": gin.H{
			"current_page": page,
			"limit":        limit,
			"total":        total,
			"pages":        (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// Method to increment bot view count (for use by the bot service)
func (h *VisitCardHandler) IncrementBotView(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	var visitCard models.VisitCard
	if err := db.DB.First(&visitCard, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Visit card not found"})
		return
	}

	// Only increment if the visit card has a bot token set
	if visitCard.TelegramBotToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Visit card does not have a bot token"})
		return
	}

	// Increment bot view count on every bot interaction
	db.DB.Model(&visitCard).UpdateColumn("bot_view_count", visitCard.BotViewCount+1)

	c.JSON(http.StatusOK, gin.H{
		"message":        "Bot view counted",
		"bot_view_count": visitCard.BotViewCount + 1, // Show the incremented value
	})
}

// isValidBotTokenFormat validates the format of a Telegram bot token using regex
func isValidBotTokenFormat(token string) bool {
	// Telegram bot tokens follow the format: digits:letters
	// Example: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyz
	// The pattern is: digits+:letters (typically 8-10 digits followed by 35-character base64-like string)
	match, _ := regexp.MatchString(`^\d+:[a-zA-Z0-9_-]{35}$`, token)
	return match
}

func (h *VisitCardHandler) GetVisitCardStats(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	var visitCard models.VisitCard
	if err := db.DB.First(&visitCard, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Visit card not found"})
		return
	}

	// Check ownership or admin role
	if visitCard.UserID != userID.(uint) && role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to view stats for this visit card"})
		return
	}

	stats := gin.H{
		"view_count":     visitCard.ViewCount,
		"bot_view_count": visitCard.BotViewCount,
	}

	c.JSON(http.StatusOK, gin.H{"stats": stats})
}

// Admin endpoint to get statistics for all visit cards
func (h *VisitCardHandler) GetAllVisitCardStats(c *gin.Context) {
	role, _ := c.Get("role")
	if role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	var visitCards []models.VisitCard
	if err := db.DB.Preload("User").Find(&visitCards).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Prepare stats for all visit cards
	allStats := make([]gin.H, len(visitCards))
	for i, card := range visitCards {
		allStats[i] = gin.H{
			"id":               card.ID,
			"title":            card.Title,
			"view_count":       card.ViewCount,
			"bot_view_count":   card.BotViewCount,
			"user": gin.H{
				"id":         card.User.ID,
				"name":       card.User.Name,
				"email":      card.User.Email,
				"company_name": card.User.CompanyName,
			},
		}
	}

	c.JSON(http.StatusOK, gin.H{"all_stats": allStats})
}