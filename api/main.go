package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"

	"api/db"
	"api/handlers"
	"api/middleware"
	"api/utils"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
	}

	// Initialize database
	db.InitDB()

	// Initialize MinIO
	if err := utils.InitMinIO(); err != nil {
		log.Fatalf("Failed to initialize MinIO: %v", err)
	}
	log.Println("MinIO initialized successfully")

	// Setup router
	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Header("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Public routes
	public := r.Group("/api")
	{
		public.POST("/register", (&handlers.UserHandler{}).Register)
		public.POST("/login", (&handlers.UserHandler{}).Login)
		public.GET("/visit-cards/:id/public", (&handlers.VisitCardHandler{}).GetPublicVisitCard)
		public.GET("/visit-cards/public", (&handlers.VisitCardHandler{}).GetAllPublicVisitCards)
		public.POST("/visit-cards/:id/increment-bot-view", (&handlers.VisitCardHandler{}).IncrementBotView)
		public.GET("/v/:domain", (&handlers.VisitCardHandler{}).GetPublicVisitCardByDomain)

		// Image proxy route (public, for serving logos)
		public.GET("/images/*filepath", (&handlers.VisitCardHandler{}).ServeImage)
	}

	// Protected routes
	protected := r.Group("/api")
	protected.Use(middleware.AuthMiddleware())
	{
		// User routes
		protected.GET("/profile", (&handlers.UserHandler{}).GetProfile)
		protected.PUT("/profile", (&handlers.UserHandler{}).UpdateProfile)
		protected.PUT("/profile/password", (&handlers.UserHandler{}).UpdatePassword)
		protected.DELETE("/profile", (&handlers.UserHandler{}).DeleteAccount)
		
		// Visit card routes
		protected.POST("/visit-cards", (&handlers.VisitCardHandler{}).CreateVisitCard)
		protected.GET("/visit-cards/my", (&handlers.VisitCardHandler{}).GetMyVisitCards)
		protected.GET("/visit-cards/:id", (&handlers.VisitCardHandler{}).GetVisitCardDetails) // Return detailed info for owners, basic info for others
		protected.PUT("/visit-cards/:id", (&handlers.VisitCardHandler{}).UpdateVisitCard)
		protected.DELETE("/visit-cards/:id", (&handlers.VisitCardHandler{}).DeleteVisitCard)
		protected.GET("/visit-cards/:id/stats", (&handlers.VisitCardHandler{}).GetVisitCardStats)

		// Logo routes
		protected.PUT("/visit-cards/:id/logo", (&handlers.VisitCardHandler{}).UploadLogo)
		protected.DELETE("/visit-cards/:id/logo", (&handlers.VisitCardHandler{}).DeleteLogo)
	}

	// Admin routes
	admin := r.Group("/api/admin")
	admin.Use(middleware.AuthMiddleware())
	admin.Use(middleware.AdminMiddleware())
	{
		// User management
		admin.GET("/users", (&handlers.UserHandler{}).GetAllUsers)
		admin.GET("/users/:id", (&handlers.UserHandler{}).GetUserByID)
		admin.PUT("/users/:id", (&handlers.UserHandler{}).UpdateUser)
		admin.DELETE("/users/:id", (&handlers.UserHandler{}).DeleteUser)
		
		// Visit card management
		admin.GET("/visit-cards", (&handlers.VisitCardHandler{}).GetAllVisitCards)
		admin.GET("/visit-cards/stats", (&handlers.VisitCardHandler{}).GetAllVisitCardStats)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	
	r.Run(":" + port)
}