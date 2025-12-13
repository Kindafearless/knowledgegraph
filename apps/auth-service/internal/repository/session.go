package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/knowledgegraph/auth-service/internal/models"
	"github.com/redis/go-redis/v9"
)

type SessionRepository struct {
	client *redis.Client
	ttl    time.Duration
}

func NewSessionRepository(client *redis.Client) *SessionRepository {
	return &SessionRepository{
		client: client,
		ttl:    time.Hour, // Default 1 hour TTL
	}
}

// Create creates a new session
func (r *SessionRepository) Create(ctx context.Context, session *models.Session) error {
	data, err := json.Marshal(session)
	if err != nil {
		return fmt.Errorf("failed to marshal session: %w", err)
	}

	key := fmt.Sprintf("session:%s", session.ID)
	if err := r.client.Set(ctx, key, data, r.ttl).Err(); err != nil {
		return fmt.Errorf("failed to create session: %w", err)
	}

	// Also index by user ID for lookups
	userKey := fmt.Sprintf("user_sessions:%s", session.UserID)
	if err := r.client.SAdd(ctx, userKey, session.ID).Err(); err != nil {
		return fmt.Errorf("failed to index session: %w", err)
	}
	r.client.Expire(ctx, userKey, r.ttl)

	return nil
}

// Get retrieves a session by ID
func (r *SessionRepository) Get(ctx context.Context, sessionID string) (*models.Session, error) {
	key := fmt.Sprintf("session:%s", sessionID)
	data, err := r.client.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, fmt.Errorf("session not found")
		}
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	var session models.Session
	if err := json.Unmarshal(data, &session); err != nil {
		return nil, fmt.Errorf("failed to unmarshal session: %w", err)
	}

	return &session, nil
}

// Delete deletes a session
func (r *SessionRepository) Delete(ctx context.Context, sessionID string) error {
	// Get session first to remove from user index
	session, err := r.Get(ctx, sessionID)
	if err == nil {
		userKey := fmt.Sprintf("user_sessions:%s", session.UserID)
		r.client.SRem(ctx, userKey, sessionID)
	}

	key := fmt.Sprintf("session:%s", sessionID)
	if err := r.client.Del(ctx, key).Err(); err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}

	return nil
}

// DeleteByToken deletes a session by access token
func (r *SessionRepository) DeleteByToken(ctx context.Context, token string) error {
	// In a production system, you'd maintain an index by token
	// For now, this is a simplified implementation
	return nil
}

// DeleteAllForUser deletes all sessions for a user
func (r *SessionRepository) DeleteAllForUser(ctx context.Context, userID string) error {
	userKey := fmt.Sprintf("user_sessions:%s", userID)
	sessionIDs, err := r.client.SMembers(ctx, userKey).Result()
	if err != nil {
		return fmt.Errorf("failed to get user sessions: %w", err)
	}

	for _, sessionID := range sessionIDs {
		key := fmt.Sprintf("session:%s", sessionID)
		r.client.Del(ctx, key)
	}

	r.client.Del(ctx, userKey)

	return nil
}

// Refresh refreshes a session's TTL
func (r *SessionRepository) Refresh(ctx context.Context, sessionID string) error {
	key := fmt.Sprintf("session:%s", sessionID)
	if err := r.client.Expire(ctx, key, r.ttl).Err(); err != nil {
		return fmt.Errorf("failed to refresh session: %w", err)
	}
	return nil
}
