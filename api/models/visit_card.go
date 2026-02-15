package models

import (
	"gorm.io/gorm"
	"time"
)

type VisitCard struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"deleted_at" gorm:"index"`
	
	Title       string `json:"title" gorm:"type:varchar(255);not null"`
	Description string `json:"description" gorm:"type:longtext"`
	LogoURL     string `json:"logo_url" gorm:"type:varchar(255)"`
	Domain      string `json:"domain" gorm:"type:varchar(255);uniqueIndex:idx_visit_cards_domain"`
	TelegramBotToken string `json:"telegram_bot_token" gorm:"column:telegram_bot_token;type:varchar(255)"`
	TokenValid       bool   `json:"token_valid" gorm:"default:true"` // Track if token is valid
	TokenErrorMessage string `json:"token_error_message" gorm:"type:varchar(255);default:''"` // Store error message if token is invalid

	ViewCount     uint `json:"view_count" gorm:"default:0"`
	BotViewCount  uint `json:"bot_view_count" gorm:"default:0"`

	UserID uint `json:"user_id" gorm:"not null"`
	User   User `json:"-" gorm:"foreignKey:UserID"`

	// Relations for views
	Views []VisitCardView `json:"-" gorm:"foreignKey:VisitCardID"`

	// Relations for bot views
	BotViews []VisitCardBotView `json:"-" gorm:"foreignKey:VisitCardID"`
}