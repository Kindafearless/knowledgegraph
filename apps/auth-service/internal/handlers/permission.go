package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/knowledgegraph/auth-service/internal/models"
	"github.com/knowledgegraph/auth-service/internal/services"
	"go.uber.org/zap"
)

type PermissionHandler struct {
	rbacService *services.RBACService
	abacService *services.ABACService
	logger      *zap.Logger
}

func NewPermissionHandler(rbacService *services.RBACService, abacService *services.ABACService, logger *zap.Logger) *PermissionHandler {
	return &PermissionHandler{
		rbacService: rbacService,
		abacService: abacService,
		logger:      logger,
	}
}

// CheckPermissionRequest represents a permission check request
type CheckPermissionRequest struct {
	Resource string            `json:"resource" binding:"required"`
	Action   string            `json:"action" binding:"required"`
	Context  map[string]string `json:"context,omitempty"`
}

// CheckPermission checks if the user has a specific permission
func (h *PermissionHandler) CheckPermission(c *gin.Context) {
	var req CheckPermissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	claims, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	tokenClaims := claims.(*models.TokenClaims)

	// First check RBAC
	check := models.PermissionCheck{
		Resource: req.Resource,
		Action:   req.Action,
		Context:  req.Context,
	}

	rbacResult := h.rbacService.CheckPermission(c.Request.Context(), tokenClaims, check)
	if !rbacResult.Allowed {
		c.JSON(http.StatusOK, rbacResult)
		return
	}

	// Then check ABAC (if RBAC allows)
	abacResult := h.abacService.CheckPolicy(c.Request.Context(), tokenClaims, check)
	c.JSON(http.StatusOK, abacResult)
}

// CheckPermissionBatchRequest represents a batch permission check request
type CheckPermissionBatchRequest struct {
	Checks []CheckPermissionRequest `json:"checks" binding:"required"`
}

// CheckPermissionBatch checks multiple permissions at once
func (h *PermissionHandler) CheckPermissionBatch(c *gin.Context) {
	var req CheckPermissionBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	claims, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	tokenClaims := claims.(*models.TokenClaims)

	results := make(map[string]models.PermissionCheckResult)

	for _, checkReq := range req.Checks {
		check := models.PermissionCheck{
			Resource: checkReq.Resource,
			Action:   checkReq.Action,
			Context:  checkReq.Context,
		}

		key := checkReq.Resource + ":" + checkReq.Action

		// Check RBAC first
		rbacResult := h.rbacService.CheckPermission(c.Request.Context(), tokenClaims, check)
		if !rbacResult.Allowed {
			results[key] = rbacResult
			continue
		}

		// Then ABAC
		abacResult := h.abacService.CheckPolicy(c.Request.Context(), tokenClaims, check)
		results[key] = abacResult
	}

	c.JSON(http.StatusOK, gin.H{"results": results})
}

// ListRoles returns all roles
func (h *PermissionHandler) ListRoles(c *gin.Context) {
	roles, err := h.rbacService.GetRoles(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to list roles", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list roles"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"roles": roles})
}

// CreateRoleRequest represents a request to create a role
type CreateRoleRequest struct {
	Name        string   `json:"name" binding:"required"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions" binding:"required"`
	Inherits    []string `json:"inherits,omitempty"`
}

// CreateRole creates a new role
func (h *PermissionHandler) CreateRole(c *gin.Context) {
	var req CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	inherits := make([]uuid.UUID, len(req.Inherits))
	for i, id := range req.Inherits {
		parsed, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid inherit ID"})
			return
		}
		inherits[i] = parsed
	}

	role := &models.Role{
		Name:        req.Name,
		Description: req.Description,
		Permissions: req.Permissions,
		Inherits:    inherits,
	}

	if err := h.rbacService.CreateRole(c.Request.Context(), role); err != nil {
		h.logger.Error("Failed to create role", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create role"})
		return
	}

	c.JSON(http.StatusCreated, role)
}

// UpdateRole updates an existing role
func (h *PermissionHandler) UpdateRole(c *gin.Context) {
	idStr := c.Param("id")
	roleID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	var req CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	inherits := make([]uuid.UUID, len(req.Inherits))
	for i, id := range req.Inherits {
		parsed, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid inherit ID"})
			return
		}
		inherits[i] = parsed
	}

	role := &models.Role{
		ID:          roleID,
		Name:        req.Name,
		Description: req.Description,
		Permissions: req.Permissions,
		Inherits:    inherits,
	}

	if err := h.rbacService.UpdateRole(c.Request.Context(), role); err != nil {
		h.logger.Error("Failed to update role", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update role"})
		return
	}

	c.JSON(http.StatusOK, role)
}

// DeleteRole deletes a role
func (h *PermissionHandler) DeleteRole(c *gin.Context) {
	idStr := c.Param("id")
	roleID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
		return
	}

	if err := h.rbacService.DeleteRole(c.Request.Context(), roleID); err != nil {
		h.logger.Error("Failed to delete role", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete role"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role deleted"})
}

// ListPolicies returns all ABAC policies
func (h *PermissionHandler) ListPolicies(c *gin.Context) {
	policies, err := h.abacService.GetPolicies(c.Request.Context())
	if err != nil {
		h.logger.Error("Failed to list policies", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list policies"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"policies": policies})
}

// CreatePolicy creates a new ABAC policy
func (h *PermissionHandler) CreatePolicy(c *gin.Context) {
	var policy models.ABACPolicy
	if err := c.ShouldBindJSON(&policy); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if err := h.abacService.CreatePolicy(c.Request.Context(), &policy); err != nil {
		h.logger.Error("Failed to create policy", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create policy"})
		return
	}

	c.JSON(http.StatusCreated, policy)
}
