package services

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
	appconfig "github.com/knowledgegraph/auth-service/internal/config"
)

type CognitoService struct {
	client     *cognitoidentityprovider.Client
	userPoolID string
	clientID   string
}

func NewCognitoService(cfg *appconfig.Config) (*CognitoService, error) {
	awsCfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(cfg.AWSRegion),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := cognitoidentityprovider.NewFromConfig(awsCfg)

	return &CognitoService{
		client:     client,
		userPoolID: cfg.CognitoUserPoolID,
		clientID:   cfg.CognitoClientID,
	}, nil
}

// AuthenticateUser authenticates a user with username and password
func (s *CognitoService) AuthenticateUser(ctx context.Context, username, password string) (*AuthResult, error) {
	input := &cognitoidentityprovider.InitiateAuthInput{
		AuthFlow: types.AuthFlowTypeUserPasswordAuth,
		ClientId: aws.String(s.clientID),
		AuthParameters: map[string]string{
			"USERNAME": username,
			"PASSWORD": password,
		},
	}

	result, err := s.client.InitiateAuth(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("authentication failed: %w", err)
	}

	if result.AuthenticationResult == nil {
		return nil, fmt.Errorf("authentication challenge required")
	}

	return &AuthResult{
		AccessToken:  aws.ToString(result.AuthenticationResult.AccessToken),
		RefreshToken: aws.ToString(result.AuthenticationResult.RefreshToken),
		IDToken:      aws.ToString(result.AuthenticationResult.IdToken),
		ExpiresIn:    int(result.AuthenticationResult.ExpiresIn),
	}, nil
}

// RefreshToken refreshes an access token using a refresh token
func (s *CognitoService) RefreshToken(ctx context.Context, refreshToken string) (*AuthResult, error) {
	input := &cognitoidentityprovider.InitiateAuthInput{
		AuthFlow: types.AuthFlowTypeRefreshTokenAuth,
		ClientId: aws.String(s.clientID),
		AuthParameters: map[string]string{
			"REFRESH_TOKEN": refreshToken,
		},
	}

	result, err := s.client.InitiateAuth(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("token refresh failed: %w", err)
	}

	if result.AuthenticationResult == nil {
		return nil, fmt.Errorf("token refresh failed: no result")
	}

	return &AuthResult{
		AccessToken: aws.ToString(result.AuthenticationResult.AccessToken),
		IDToken:     aws.ToString(result.AuthenticationResult.IdToken),
		ExpiresIn:   int(result.AuthenticationResult.ExpiresIn),
	}, nil
}

// GetUser retrieves user information from Cognito
func (s *CognitoService) GetUser(ctx context.Context, accessToken string) (*CognitoUser, error) {
	input := &cognitoidentityprovider.GetUserInput{
		AccessToken: aws.String(accessToken),
	}

	result, err := s.client.GetUser(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	user := &CognitoUser{
		Username: aws.ToString(result.Username),
	}

	// Extract attributes
	for _, attr := range result.UserAttributes {
		switch aws.ToString(attr.Name) {
		case "sub":
			user.Sub = aws.ToString(attr.Value)
		case "email":
			user.Email = aws.ToString(attr.Value)
		case "name":
			user.Name = aws.ToString(attr.Value)
		case "email_verified":
			user.EmailVerified = aws.ToString(attr.Value) == "true"
		}
	}

	return user, nil
}

// RevokeToken revokes a refresh token
func (s *CognitoService) RevokeToken(ctx context.Context, refreshToken string) error {
	input := &cognitoidentityprovider.RevokeTokenInput{
		Token:    aws.String(refreshToken),
		ClientId: aws.String(s.clientID),
	}

	_, err := s.client.RevokeToken(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to revoke token: %w", err)
	}

	return nil
}

// GlobalSignOut signs out user from all devices
func (s *CognitoService) GlobalSignOut(ctx context.Context, accessToken string) error {
	input := &cognitoidentityprovider.GlobalSignOutInput{
		AccessToken: aws.String(accessToken),
	}

	_, err := s.client.GlobalSignOut(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to sign out: %w", err)
	}

	return nil
}

// AuthResult represents the result of authentication
type AuthResult struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	IDToken      string `json:"id_token"`
	ExpiresIn    int    `json:"expires_in"`
}

// CognitoUser represents a user from Cognito
type CognitoUser struct {
	Sub           string `json:"sub"`
	Username      string `json:"username"`
	Email         string `json:"email"`
	Name          string `json:"name"`
	EmailVerified bool   `json:"email_verified"`
}
