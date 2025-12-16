package services

import "context"

// AuthProvider defines the interface for authentication providers
// This can be implemented by CognitoService for production or LocalAuthProvider for development
type AuthProvider interface {
	// AuthenticateUser authenticates a user with username/email and password
	AuthenticateUser(ctx context.Context, username, password string) (*AuthResult, error)

	// RefreshToken refreshes an access token using a refresh token
	RefreshToken(ctx context.Context, refreshToken string) (*AuthResult, error)

	// GetUser retrieves user information
	GetUser(ctx context.Context, accessToken string) (*CognitoUser, error)

	// GlobalSignOut signs out user from all devices
	GlobalSignOut(ctx context.Context, accessToken string) error

	// RevokeToken revokes a refresh token
	RevokeToken(ctx context.Context, refreshToken string) error
}
