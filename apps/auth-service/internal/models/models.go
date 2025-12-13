package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user in the system
type User struct {
	ID            uuid.UUID         `json:"id" db:"id"`
	CognitoSub    string            `json:"cognito_sub" db:"cognito_sub"`
	Email         string            `json:"email" db:"email"`
	Name          string            `json:"name" db:"name"`
	Roles         []string          `json:"roles" db:"roles"`
	Attributes    map[string]string `json:"attributes" db:"attributes"`
	DataSources   []string          `json:"data_sources" db:"data_sources"`
	Classification string           `json:"classification" db:"classification"`
	CreatedAt     time.Time         `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time         `json:"updated_at" db:"updated_at"`
	LastLoginAt   *time.Time        `json:"last_login_at" db:"last_login_at"`
	IsActive      bool              `json:"is_active" db:"is_active"`
}

// Role represents an RBAC role
type Role struct {
	ID          uuid.UUID   `json:"id" db:"id"`
	Name        string      `json:"name" db:"name"`
	Description string      `json:"description" db:"description"`
	Permissions []string    `json:"permissions" db:"permissions"`
	Inherits    []uuid.UUID `json:"inherits" db:"inherits"` // Parent roles
	CreatedAt   time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at" db:"updated_at"`
}

// Permission represents a specific permission
type Permission struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Resource    string    `json:"resource" db:"resource"`    // e.g., "graph:entity", "datasource:*"
	Action      string    `json:"action" db:"action"`        // e.g., "read", "write", "delete"
	Description string    `json:"description" db:"description"`
}

// ABACPolicy represents an attribute-based access control policy
type ABACPolicy struct {
	ID         uuid.UUID              `json:"id" db:"id"`
	Name       string                 `json:"name" db:"name"`
	Effect     string                 `json:"effect" db:"effect"` // "allow" or "deny"
	Resources  []string               `json:"resources" db:"resources"`
	Actions    []string               `json:"actions" db:"actions"`
	Conditions []PolicyCondition      `json:"conditions" db:"conditions"`
	Priority   int                    `json:"priority" db:"priority"`
	CreatedAt  time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time              `json:"updated_at" db:"updated_at"`
}

// PolicyCondition represents a condition in an ABAC policy
type PolicyCondition struct {
	Attribute string      `json:"attribute"` // e.g., "user.clearance", "resource.classification"
	Operator  string      `json:"operator"`  // e.g., "equals", "contains", ">=", "<="
	Value     interface{} `json:"value"`
}

// Session represents a user session
type Session struct {
	ID           string    `json:"id"`
	UserID       uuid.UUID `json:"user_id"`
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	CreatedAt    time.Time `json:"created_at"`
	IPAddress    string    `json:"ip_address"`
	UserAgent    string    `json:"user_agent"`
}

// TokenClaims represents JWT token claims
type TokenClaims struct {
	UserID       uuid.UUID         `json:"user_id"`
	Email        string            `json:"email"`
	Name         string            `json:"name"`
	Roles        []string          `json:"roles"`
	Permissions  []string          `json:"permissions"`
	Attributes   map[string]string `json:"attributes"`
	DataSources  []string          `json:"data_sources"`
	Classification string          `json:"classification"`
}

// PermissionCheck represents a permission check request
type PermissionCheck struct {
	Resource   string            `json:"resource"`
	Action     string            `json:"action"`
	Context    map[string]string `json:"context,omitempty"` // Additional context for ABAC
}

// PermissionCheckResult represents the result of a permission check
type PermissionCheckResult struct {
	Allowed bool   `json:"allowed"`
	Reason  string `json:"reason,omitempty"`
}

// AuditLog represents an audit log entry
type AuditLog struct {
	ID            uuid.UUID         `json:"id" db:"id"`
	Timestamp     time.Time         `json:"timestamp" db:"timestamp"`
	UserID        uuid.UUID         `json:"user_id" db:"user_id"`
	SessionID     string            `json:"session_id" db:"session_id"`
	Action        string            `json:"action" db:"action"`
	Resource      string            `json:"resource" db:"resource"`
	ResourceType  string            `json:"resource_type" db:"resource_type"`
	Outcome       string            `json:"outcome" db:"outcome"` // "success", "failure", "denied"
	SourceIP      string            `json:"source_ip" db:"source_ip"`
	UserAgent     string            `json:"user_agent" db:"user_agent"`
	RequestParams map[string]interface{} `json:"request_params" db:"request_params"`
	Classification string           `json:"classification" db:"classification"`
}
