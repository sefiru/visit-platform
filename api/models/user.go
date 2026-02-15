package models

import (
	"encoding/json"
	"gorm.io/gorm"
	"time"
)

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
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at" gorm:"index"`

	Email       string `json:"email" gorm:"type:varchar(255);uniqueIndex:idx_users_email;not null"`
	Password    string `json:"password" gorm:"type:varchar(255);not null"`
	Name        string `json:"name" gorm:"type:varchar(255)"`
	CompanyName string `json:"company_name" gorm:"type:varchar(255)"`
	Role        Role   `json:"-" gorm:"default:0"` // Don't serialize the numeric role directly

	// Relations
	VisitCards []VisitCard `json:"visit_cards"`
}

// MarshalJSON customizes JSON serialization to return role as string
func (u User) MarshalJSON() ([]byte, error) {
	type Alias User
	return json.Marshal(&struct {
		Role string `json:"role"`
		*Alias
	}{
		Role:  u.Role.String(),
		Alias: (*Alias)(&u),
	})
}