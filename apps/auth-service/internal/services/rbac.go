package services

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/knowledgegraph/auth-service/internal/models"
	"github.com/knowledgegraph/auth-service/internal/repository"
	"go.uber.org/zap"
)

type RBACService struct {
	permissionRepo *repository.PermissionRepository
	logger         *zap.Logger
}

func NewRBACService(permissionRepo *repository.PermissionRepository, logger *zap.Logger) *RBACService {
	return &RBACService{
		permissionRepo: permissionRepo,
		logger:         logger,
	}
}

// CheckPermission checks if a user has a specific permission
func (s *RBACService) CheckPermission(ctx context.Context, claims *models.TokenClaims, check models.PermissionCheck) models.PermissionCheckResult {
	// Check for wildcard permission
	if contains(claims.Permissions, "*") {
		return models.PermissionCheckResult{Allowed: true, Reason: "wildcard permission"}
	}

	// Build permission string
	requiredPermission := check.Resource + ":" + check.Action

	// Check exact match
	if contains(claims.Permissions, requiredPermission) {
		return models.PermissionCheckResult{Allowed: true, Reason: "exact permission match"}
	}

	// Check resource wildcard (e.g., "graph:*" matches "graph:entity:read")
	resourceParts := strings.Split(check.Resource, ":")
	for i := range resourceParts {
		wildcardPerm := strings.Join(resourceParts[:i+1], ":") + ":*"
		if contains(claims.Permissions, wildcardPerm) {
			return models.PermissionCheckResult{Allowed: true, Reason: "wildcard resource match"}
		}
	}

	// Check action wildcard (e.g., "graph:entity:*" matches any action on graph:entity)
	wildcardAction := check.Resource + ":*"
	if contains(claims.Permissions, wildcardAction) {
		return models.PermissionCheckResult{Allowed: true, Reason: "wildcard action match"}
	}

	return models.PermissionCheckResult{Allowed: false, Reason: "no matching permission"}
}

// GetRoles retrieves all roles
func (s *RBACService) GetRoles(ctx context.Context) ([]models.Role, error) {
	return s.permissionRepo.GetAllRoles(ctx)
}

// GetRole retrieves a role by ID
func (s *RBACService) GetRole(ctx context.Context, roleID uuid.UUID) (*models.Role, error) {
	return s.permissionRepo.GetRoleByID(ctx, roleID)
}

// CreateRole creates a new role
func (s *RBACService) CreateRole(ctx context.Context, role *models.Role) error {
	role.ID = uuid.New()
	return s.permissionRepo.CreateRole(ctx, role)
}

// UpdateRole updates an existing role
func (s *RBACService) UpdateRole(ctx context.Context, role *models.Role) error {
	return s.permissionRepo.UpdateRole(ctx, role)
}

// DeleteRole deletes a role
func (s *RBACService) DeleteRole(ctx context.Context, roleID uuid.UUID) error {
	return s.permissionRepo.DeleteRole(ctx, roleID)
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
