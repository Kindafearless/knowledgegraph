package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Environment string
	Port        string

	// Database
	DatabaseURL string

	// Redis
	RedisURL string

	// AWS Cognito
	AWSRegion        string
	CognitoUserPoolID string
	CognitoClientID   string
	CognitoDomain     string

	// Security
	JWTSecret    string
	CORSOrigins  []string

	// Session
	SessionTTL int // seconds
}

func Load() (*Config, error) {
	cfg := &Config{
		Environment:       getEnv("ENVIRONMENT", "development"),
		Port:              getEnv("PORT", "8080"),
		DatabaseURL:       getEnv("DATABASE_URL", ""),
		RedisURL:          getEnv("REDIS_URL", "redis://localhost:6379"),
		AWSRegion:         getEnv("AWS_REGION", "us-gov-west-1"),
		CognitoUserPoolID: getEnv("COGNITO_USER_POOL_ID", ""),
		CognitoClientID:   getEnv("COGNITO_CLIENT_ID", ""),
		CognitoDomain:     getEnv("COGNITO_DOMAIN", ""),
		JWTSecret:         getEnv("JWT_SECRET", ""),
		CORSOrigins:       strings.Split(getEnv("CORS_ORIGINS", "http://localhost:3000"), ","),
		SessionTTL:        3600, // 1 hour default
	}

	// Validate required fields
	if cfg.CognitoUserPoolID == "" {
		return nil, fmt.Errorf("COGNITO_USER_POOL_ID is required")
	}
	if cfg.CognitoClientID == "" {
		return nil, fmt.Errorf("COGNITO_CLIENT_ID is required")
	}
	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
