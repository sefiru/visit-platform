package models

import (
	"gorm.io/gorm"
	"time"
)

type VisitCardBotView struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"deleted_at" gorm:"index"`

	VisitCardID uint      `json:"visit_card_id" gorm:"not null"`
	IPAddress   string    `json:"ip_address" gorm:"type:varchar(45);not null"` // IPv6 addresses can be up to 45 chars
	LastViewed  time.Time `json:"last_viewed" gorm:"not null"`

	// Relations
	VisitCard VisitCard `json:"-" gorm:"foreignKey:VisitCardID"`
}