package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/knowledgegraph/auth-service/internal/models"
)

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{db: db}
}

// Create creates a new user
func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	rolesJSON, _ := json.Marshal(user.Roles)
	attributesJSON, _ := json.Marshal(user.Attributes)
	dataSourcesJSON, _ := json.Marshal(user.DataSources)

	query := `
		INSERT INTO users (id, cognito_sub, email, name, roles, attributes, data_sources, classification, created_at, updated_at, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	_, err := r.db.Exec(ctx, query,
		user.ID,
		user.CognitoSub,
		user.Email,
		user.Name,
		rolesJSON,
		attributesJSON,
		dataSourcesJSON,
		user.Classification,
		user.CreatedAt,
		user.UpdatedAt,
		user.IsActive,
	)

	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

// FindByID finds a user by ID
func (r *UserRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	query := `
		SELECT id, cognito_sub, email, name, roles, attributes, data_sources, classification, created_at, updated_at, last_login_at, is_active
		FROM users
		WHERE id = $1
	`

	var user models.User
	var rolesJSON, attributesJSON, dataSourcesJSON []byte

	err := r.db.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.CognitoSub,
		&user.Email,
		&user.Name,
		&rolesJSON,
		&attributesJSON,
		&dataSourcesJSON,
		&user.Classification,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
		&user.IsActive,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	json.Unmarshal(rolesJSON, &user.Roles)
	json.Unmarshal(attributesJSON, &user.Attributes)
	json.Unmarshal(dataSourcesJSON, &user.DataSources)

	return &user, nil
}

// FindByCognitoSub finds a user by Cognito sub
func (r *UserRepository) FindByCognitoSub(ctx context.Context, sub string) (*models.User, error) {
	query := `
		SELECT id, cognito_sub, email, name, roles, attributes, data_sources, classification, created_at, updated_at, last_login_at, is_active
		FROM users
		WHERE cognito_sub = $1
	`

	var user models.User
	var rolesJSON, attributesJSON, dataSourcesJSON []byte

	err := r.db.QueryRow(ctx, query, sub).Scan(
		&user.ID,
		&user.CognitoSub,
		&user.Email,
		&user.Name,
		&rolesJSON,
		&attributesJSON,
		&dataSourcesJSON,
		&user.Classification,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
		&user.IsActive,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	json.Unmarshal(rolesJSON, &user.Roles)
	json.Unmarshal(attributesJSON, &user.Attributes)
	json.Unmarshal(dataSourcesJSON, &user.DataSources)

	return &user, nil
}

// Update updates a user
func (r *UserRepository) Update(ctx context.Context, user *models.User) error {
	rolesJSON, _ := json.Marshal(user.Roles)
	attributesJSON, _ := json.Marshal(user.Attributes)
	dataSourcesJSON, _ := json.Marshal(user.DataSources)

	query := `
		UPDATE users
		SET email = $2, name = $3, roles = $4, attributes = $5, data_sources = $6, classification = $7, updated_at = $8, last_login_at = $9, is_active = $10
		WHERE id = $1
	`

	_, err := r.db.Exec(ctx, query,
		user.ID,
		user.Email,
		user.Name,
		rolesJSON,
		attributesJSON,
		dataSourcesJSON,
		user.Classification,
		user.UpdatedAt,
		user.LastLoginAt,
		user.IsActive,
	)

	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	return nil
}

// Delete deletes a user
func (r *UserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM users WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}
	return nil
}
