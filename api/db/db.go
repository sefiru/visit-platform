package db

import (
	"fmt"
	"log"
	"os"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"api/models"
)

var DB *gorm.DB

func InitDB() {
	var err error

	// Get environment variables with fallback defaults
	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "platform_user"
	}
	
	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		dbPassword = "password"
	}
	
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "db" // Default to 'db' service name in Docker environment
	}
	
	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "3306"
	}
	
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "visit_platform"
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser,
		dbPassword,
		dbHost,
		dbPort,
		dbName,
	)
	
	log.Printf("Attempting to connect to database with DSN: %s", dsn)
	log.Printf("Environment variables - Host: %s, Port: %s, User: %s, DB: %s", dbHost, dbPort, dbUser, dbName)
	
	// Retry connecting to the database with exponential backoff
	maxRetries := 10
	for i := 0; i < maxRetries; i++ {
		DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
		if err == nil {
			log.Println("Connected to database successfully")
			break
		}

		log.Printf("Failed to connect to database (attempt %d/%d): %v", i+1, maxRetries, err)
		time.Sleep(time.Duration(i+1) * time.Second)
	}

	if err != nil {
		log.Fatal("Failed to connect to database after", maxRetries, "attempts")
	}
	
	// Migrate the schema
	err = DB.AutoMigrate(&models.User{}, &models.VisitCard{}, &models.VisitCardView{}, &models.VisitCardBotView{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
}