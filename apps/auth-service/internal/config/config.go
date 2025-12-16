package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Environment string
	Port        string

	// Local development mode (bypass Cognito)
	LocalMode bool

	// Database
	DatabaseURL string

	// Redis
	RedisURL string

	// AWS Cognito (not required in LocalMode)
	AWSRegion         string
	CognitoUserPoolID string
	CognitoClientID   string
	CognitoDomain     string

	// Security
	JWTSecret   string
	CORSOrigins []string

	// Session
	SessionTTL int // seconds
}

func Load() (*Config, error) {
	localMode := getEnv("LOCAL_MODE", "false") == "true" || getEnv("AUTH_LOCAL_MODE", "false") == "true"

	cfg := &Config{
		Environment:       getEnv("ENVIRONMENT", "development"),
		Port:              getEnv("PORT", "8080"),
		LocalMode:         localMode,
		DatabaseURL:       getEnv("DATABASE_URL", ""),
		RedisURL:          getEnv("REDIS_URL", "redis://localhost:6379"),
		AWSRegion:         getEnv("AWS_REGION", "us-gov-west-1"),
		CognitoUserPoolID: getEnv("COGNITO_USER_POOL_ID", ""),
		CognitoClientID:   getEnv("COGNITO_CLIENT_ID", ""),
		CognitoDomain:     getEnv("COGNITO_DOMAIN", ""),
		JWTSecret:         getEnv("JWT_SECRET", "local-dev-secret-key-change-in-production"),
		CORSOrigins:       strings.Split(getEnv("CORS_ORIGINS", "http://localhost:3000"), ","),
		SessionTTL:        3600, // 1 hour default
	}

	// Validate required fields
	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	// Only require Cognito config when not in local mode
	if !cfg.LocalMode {
		if cfg.CognitoUserPoolID == "" {
			return nil, fmt.Errorf("COGNITO_USER_POOL_ID is required (set LOCAL_MODE=true for local development)")
		}
		if cfg.CognitoClientID == "" {
			return nil, fmt.Errorf("COGNITO_CLIENT_ID is required (set LOCAL_MODE=true for local development)")
		}
	}

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
