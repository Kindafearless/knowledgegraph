package services

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/knowledgegraph/auth-service/internal/config"
	"github.com/knowledgegraph/auth-service/internal/models"
	"github.com/knowledgegraph/auth-service/internal/repository"
	"go.uber.org/zap"
)

type AuthService struct {
	authProvider   AuthProvider
	userRepo       *repository.UserRepository
	permissionRepo *repository.PermissionRepository
	sessionRepo    *repository.SessionRepository
	config         *config.Config
	logger         *zap.Logger
}

func NewAuthService(
	authProvider AuthProvider,
	userRepo *repository.UserRepository,
	permissionRepo *repository.PermissionRepository,
	sessionRepo *repository.SessionRepository,
	cfg *config.Config,
	logger *zap.Logger,
) *AuthService {
	return &AuthService{
		authProvider:   authProvider,
		userRepo:       userRepo,
		permissionRepo: permissionRepo,
		sessionRepo:    sessionRepo,
		config:         cfg,
		logger:         logger,
	}
}

// Login authenticates a user and returns tokens
func (s *AuthService) Login(ctx context.Context, username, password string) (*LoginResponse, error) {
	// Authenticate with auth provider (Cognito or local)
	authResult, err := s.authProvider.AuthenticateUser(ctx, username, password)
	if err != nil {
		s.logger.Warn("Authentication failed", zap.String("username", username), zap.Error(err))
		return nil, fmt.Errorf("authentication failed: %w", err)
	}

	// Get user info from auth provider
	authUser, err := s.authProvider.GetUser(ctx, authResult.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}

	// Find or create user in our database
	user, err := s.userRepo.FindByCognitoSub(ctx, authUser.Sub)
	if err != nil {
		// Create new user if not exists
		user = &models.User{
			ID:         uuid.New(),
			CognitoSub: authUser.Sub,
			Email:      authUser.Email,
			Name:       authUser.Name,
			Roles:      []string{"viewer"}, // Default role
			Attributes: make(map[string]string),
			IsActive:   true,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}
		if err := s.userRepo.Create(ctx, user); err != nil {
			return nil, fmt.Errorf("failed to create user: %w", err)
		}
	}

	// Update last login
	now := time.Now()
	user.LastLoginAt = &now
	if err := s.userRepo.Update(ctx, user); err != nil {
		s.logger.Warn("Failed to update last login", zap.Error(err))
	}

	// Get user's effective permissions
	permissions, err := s.permissionRepo.GetEffectivePermissions(ctx, user.Roles)
	if err != nil {
		s.logger.Warn("Failed to get permissions", zap.Error(err))
		permissions = []string{}
	}

	// Create session
	session := &models.Session{
		ID:           uuid.New().String(),
		UserID:       user.ID,
		AccessToken:  authResult.AccessToken,
		RefreshToken: authResult.RefreshToken,
		ExpiresAt:    time.Now().Add(time.Duration(authResult.ExpiresIn) * time.Second),
		CreatedAt:    time.Now(),
	}
	if err := s.sessionRepo.Create(ctx, session); err != nil {
		s.logger.Warn("Failed to create session", zap.Error(err))
	}

	// Generate our own JWT with permissions
	token, err := s.generateToken(user, permissions)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &LoginResponse{
		AccessToken:  token,
		RefreshToken: authResult.RefreshToken,
		ExpiresIn:    authResult.ExpiresIn,
		User: UserResponse{
			ID:             user.ID.String(),
			Email:          user.Email,
			Name:           user.Name,
			Roles:          user.Roles,
			Permissions:    permissions,
			Attributes:     user.Attributes,
			DataSources:    user.DataSources,
			Classification: user.Classification,
		},
	}, nil
}

// Logout invalidates a user's session
func (s *AuthService) Logout(ctx context.Context, accessToken string) error {
	// Revoke token via auth provider
	if err := s.authProvider.GlobalSignOut(ctx, accessToken); err != nil {
		s.logger.Warn("Failed to sign out from auth provider", zap.Error(err))
	}

	// Delete session from Redis
	if err := s.sessionRepo.DeleteByToken(ctx, accessToken); err != nil {
		s.logger.Warn("Failed to delete session", zap.Error(err))
	}

	return nil
}

// RefreshToken refreshes the access token
func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*LoginResponse, error) {
	authResult, err := s.authProvider.RefreshToken(ctx, refreshToken)
	if err != nil {
		return nil, fmt.Errorf("failed to refresh token: %w", err)
	}

	// Get user info
	authUser, err := s.authProvider.GetUser(ctx, authResult.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}

	user, err := s.userRepo.FindByCognitoSub(ctx, authUser.Sub)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	permissions, err := s.permissionRepo.GetEffectivePermissions(ctx, user.Roles)
	if err != nil {
		permissions = []string{}
	}

	token, err := s.generateToken(user, permissions)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &LoginResponse{
		AccessToken: token,
		ExpiresIn:   authResult.ExpiresIn,
		User: UserResponse{
			ID:             user.ID.String(),
			Email:          user.Email,
			Name:           user.Name,
			Roles:          user.Roles,
			Permissions:    permissions,
			Attributes:     user.Attributes,
			DataSources:    user.DataSources,
			Classification: user.Classification,
		},
	}, nil
}

// ValidateToken validates a JWT token and returns claims
func (s *AuthService) ValidateToken(ctx context.Context, tokenString string) (*models.TokenClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.config.JWTSecret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	userID, err := uuid.Parse(claims["user_id"].(string))
	if err != nil {
		return nil, fmt.Errorf("invalid user ID in token")
	}

	// Convert roles and permissions
	roles := make([]string, 0)
	if r, ok := claims["roles"].([]interface{}); ok {
		for _, v := range r {
			if str, ok := v.(string); ok {
				roles = append(roles, str)
			}
		}
	}

	permissions := make([]string, 0)
	if p, ok := claims["permissions"].([]interface{}); ok {
		for _, v := range p {
			if str, ok := v.(string); ok {
				permissions = append(permissions, str)
			}
		}
	}

	attributes := make(map[string]string)
	if a, ok := claims["attributes"].(map[string]interface{}); ok {
		for k, v := range a {
			if str, ok := v.(string); ok {
				attributes[k] = str
			}
		}
	}

	dataSources := make([]string, 0)
	if ds, ok := claims["data_sources"].([]interface{}); ok {
		for _, v := range ds {
			if str, ok := v.(string); ok {
				dataSources = append(dataSources, str)
			}
		}
	}

	return &models.TokenClaims{
		UserID:         userID,
		Email:          claims["email"].(string),
		Name:           claims["name"].(string),
		Roles:          roles,
		Permissions:    permissions,
		Attributes:     attributes,
		DataSources:    dataSources,
		Classification: claims["classification"].(string),
	}, nil
}

// generateToken generates a JWT token for a user
func (s *AuthService) generateToken(user *models.User, permissions []string) (string, error) {
	claims := jwt.MapClaims{
		"user_id":        user.ID.String(),
		"email":          user.Email,
		"name":           user.Name,
		"roles":          user.Roles,
		"permissions":    permissions,
		"attributes":     user.Attributes,
		"data_sources":   user.DataSources,
		"classification": user.Classification,
		"exp":            time.Now().Add(time.Hour).Unix(),
		"iat":            time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.config.JWTSecret))
}

// GetUser retrieves a user by ID
func (s *AuthService) GetUser(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	return s.userRepo.FindByID(ctx, userID)
}

// GetUserWithPermissions retrieves a user by ID with their effective permissions
func (s *AuthService) GetUserWithPermissions(ctx context.Context, userID uuid.UUID) (*UserResponse, error) {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Get effective permissions based on user's roles
	permissions, err := s.permissionRepo.GetEffectivePermissions(ctx, user.Roles)
	if err != nil {
		s.logger.Warn("Failed to get permissions", zap.Error(err))
		permissions = []string{}
	}

	return &UserResponse{
		ID:             user.ID.String(),
		Email:          user.Email,
		Name:           user.Name,
		Roles:          user.Roles,
		Permissions:    permissions,
		Attributes:     user.Attributes,
		DataSources:    user.DataSources,
		Classification: user.Classification,
	}, nil
}

// LoginResponse represents the login response
type LoginResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token,omitempty"`
	ExpiresIn    int          `json:"expires_in"`
	User         UserResponse `json:"user"`
}

// UserResponse represents user data in responses
type UserResponse struct {
	ID             string            `json:"id"`
	Email          string            `json:"email"`
	Name           string            `json:"name"`
	Roles          []string          `json:"roles"`
	Permissions    []string          `json:"permissions"`
	Attributes     map[string]string `json:"attributes"`
	DataSources    []string          `json:"data_sources"`
	Classification string            `json:"classification"`
}
