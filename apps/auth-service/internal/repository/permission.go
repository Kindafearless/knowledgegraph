package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/knowledgegraph/auth-service/internal/models"
)

type PermissionRepository struct {
	db *pgxpool.Pool
}

func NewPermissionRepository(db *pgxpool.Pool) *PermissionRepository {
	return &PermissionRepository{db: db}
}

// GetEffectivePermissions returns all permissions for a set of roles
func (r *PermissionRepository) GetEffectivePermissions(ctx context.Context, roles []string) ([]string, error) {
	if len(roles) == 0 {
		return []string{}, nil
	}

	query := `
		WITH RECURSIVE role_hierarchy AS (
			SELECT id, name, permissions, inherits
			FROM roles
			WHERE name = ANY($1)

			UNION

			SELECT r.id, r.name, r.permissions, r.inherits
			FROM roles r
			INNER JOIN role_hierarchy rh ON r.id = ANY(rh.inherits)
		)
		SELECT DISTINCT unnest(permissions)
		FROM role_hierarchy
	`

	rows, err := r.db.Query(ctx, query, roles)
	if err != nil {
		return nil, fmt.Errorf("failed to get permissions: %w", err)
	}
	defer rows.Close()

	permissions := make([]string, 0)
	for rows.Next() {
		var permission string
		if err := rows.Scan(&permission); err != nil {
			return nil, fmt.Errorf("failed to scan permission: %w", err)
		}
		permissions = append(permissions, permission)
	}

	return permissions, nil
}

// GetAllRoles returns all roles
func (r *PermissionRepository) GetAllRoles(ctx context.Context) ([]models.Role, error) {
	query := `SELECT id, name, description, permissions, inherits, created_at, updated_at FROM roles ORDER BY name`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get roles: %w", err)
	}
	defer rows.Close()

	roles := make([]models.Role, 0)
	for rows.Next() {
		var role models.Role
		var permissionsJSON, inheritsJSON []byte

		if err := rows.Scan(&role.ID, &role.Name, &role.Description, &permissionsJSON, &inheritsJSON, &role.CreatedAt, &role.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan role: %w", err)
		}

		json.Unmarshal(permissionsJSON, &role.Permissions)
		json.Unmarshal(inheritsJSON, &role.Inherits)

		roles = append(roles, role)
	}

	return roles, nil
}

// GetRoleByID returns a role by ID
func (r *PermissionRepository) GetRoleByID(ctx context.Context, id uuid.UUID) (*models.Role, error) {
	query := `SELECT id, name, description, permissions, inherits, created_at, updated_at FROM roles WHERE id = $1`

	var role models.Role
	var permissionsJSON, inheritsJSON []byte

	err := r.db.QueryRow(ctx, query, id).Scan(&role.ID, &role.Name, &role.Description, &permissionsJSON, &inheritsJSON, &role.CreatedAt, &role.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get role: %w", err)
	}

	json.Unmarshal(permissionsJSON, &role.Permissions)
	json.Unmarshal(inheritsJSON, &role.Inherits)

	return &role, nil
}

// CreateRole creates a new role
func (r *PermissionRepository) CreateRole(ctx context.Context, role *models.Role) error {
	permissionsJSON, _ := json.Marshal(role.Permissions)
	inheritsJSON, _ := json.Marshal(role.Inherits)

	query := `
		INSERT INTO roles (id, name, description, permissions, inherits, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
	`

	_, err := r.db.Exec(ctx, query, role.ID, role.Name, role.Description, permissionsJSON, inheritsJSON)
	if err != nil {
		return fmt.Errorf("failed to create role: %w", err)
	}

	return nil
}

// UpdateRole updates a role
func (r *PermissionRepository) UpdateRole(ctx context.Context, role *models.Role) error {
	permissionsJSON, _ := json.Marshal(role.Permissions)
	inheritsJSON, _ := json.Marshal(role.Inherits)

	query := `
		UPDATE roles
		SET name = $2, description = $3, permissions = $4, inherits = $5, updated_at = NOW()
		WHERE id = $1
	`

	_, err := r.db.Exec(ctx, query, role.ID, role.Name, role.Description, permissionsJSON, inheritsJSON)
	if err != nil {
		return fmt.Errorf("failed to update role: %w", err)
	}

	return nil
}

// DeleteRole deletes a role
func (r *PermissionRepository) DeleteRole(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM roles WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete role: %w", err)
	}
	return nil
}

// GetPoliciesForResource returns ABAC policies applicable to a resource
func (r *PermissionRepository) GetPoliciesForResource(ctx context.Context, resource string) ([]models.ABACPolicy, error) {
	query := `
		SELECT id, name, effect, resources, actions, conditions, priority, created_at, updated_at
		FROM abac_policies
		WHERE $1 LIKE ANY(resources) OR '*' = ANY(resources)
		ORDER BY priority DESC
	`

	rows, err := r.db.Query(ctx, query, resource)
	if err != nil {
		return nil, fmt.Errorf("failed to get policies: %w", err)
	}
	defer rows.Close()

	policies := make([]models.ABACPolicy, 0)
	for rows.Next() {
		var policy models.ABACPolicy
		var resourcesJSON, actionsJSON, conditionsJSON []byte

		if err := rows.Scan(&policy.ID, &policy.Name, &policy.Effect, &resourcesJSON, &actionsJSON, &conditionsJSON, &policy.Priority, &policy.CreatedAt, &policy.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan policy: %w", err)
		}

		json.Unmarshal(resourcesJSON, &policy.Resources)
		json.Unmarshal(actionsJSON, &policy.Actions)
		json.Unmarshal(conditionsJSON, &policy.Conditions)

		policies = append(policies, policy)
	}

	return policies, nil
}

// GetAllPolicies returns all ABAC policies
func (r *PermissionRepository) GetAllPolicies(ctx context.Context) ([]models.ABACPolicy, error) {
	query := `SELECT id, name, effect, resources, actions, conditions, priority, created_at, updated_at FROM abac_policies ORDER BY priority DESC`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get policies: %w", err)
	}
	defer rows.Close()

	policies := make([]models.ABACPolicy, 0)
	for rows.Next() {
		var policy models.ABACPolicy
		var resourcesJSON, actionsJSON, conditionsJSON []byte

		if err := rows.Scan(&policy.ID, &policy.Name, &policy.Effect, &resourcesJSON, &actionsJSON, &conditionsJSON, &policy.Priority, &policy.CreatedAt, &policy.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan policy: %w", err)
		}

		json.Unmarshal(resourcesJSON, &policy.Resources)
		json.Unmarshal(actionsJSON, &policy.Actions)
		json.Unmarshal(conditionsJSON, &policy.Conditions)

		policies = append(policies, policy)
	}

	return policies, nil
}

// CreatePolicy creates a new ABAC policy
func (r *PermissionRepository) CreatePolicy(ctx context.Context, policy *models.ABACPolicy) error {
	resourcesJSON, _ := json.Marshal(policy.Resources)
	actionsJSON, _ := json.Marshal(policy.Actions)
	conditionsJSON, _ := json.Marshal(policy.Conditions)

	query := `
		INSERT INTO abac_policies (id, name, effect, resources, actions, conditions, priority, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
	`

	_, err := r.db.Exec(ctx, query, policy.ID, policy.Name, policy.Effect, resourcesJSON, actionsJSON, conditionsJSON, policy.Priority)
	if err != nil {
		return fmt.Errorf("failed to create policy: %w", err)
	}

	return nil
}

// UpdatePolicy updates an ABAC policy
func (r *PermissionRepository) UpdatePolicy(ctx context.Context, policy *models.ABACPolicy) error {
	resourcesJSON, _ := json.Marshal(policy.Resources)
	actionsJSON, _ := json.Marshal(policy.Actions)
	conditionsJSON, _ := json.Marshal(policy.Conditions)

	query := `
		UPDATE abac_policies
		SET name = $2, effect = $3, resources = $4, actions = $5, conditions = $6, priority = $7, updated_at = NOW()
		WHERE id = $1
	`

	_, err := r.db.Exec(ctx, query, policy.ID, policy.Name, policy.Effect, resourcesJSON, actionsJSON, conditionsJSON, policy.Priority)
	if err != nil {
		return fmt.Errorf("failed to update policy: %w", err)
	}

	return nil
}

// DeletePolicy deletes an ABAC policy
func (r *PermissionRepository) DeletePolicy(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM abac_policies WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete policy: %w", err)
	}
	return nil
}
