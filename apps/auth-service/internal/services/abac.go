package services

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/knowledgegraph/auth-service/internal/models"
	"github.com/knowledgegraph/auth-service/internal/repository"
	"go.uber.org/zap"
)

type ABACService struct {
	permissionRepo *repository.PermissionRepository
	logger         *zap.Logger
}

func NewABACService(permissionRepo *repository.PermissionRepository, logger *zap.Logger) *ABACService {
	return &ABACService{
		permissionRepo: permissionRepo,
		logger:         logger,
	}
}

// CheckPolicy evaluates ABAC policies for a given request
func (s *ABACService) CheckPolicy(
	ctx context.Context,
	claims *models.TokenClaims,
	check models.PermissionCheck,
) models.PermissionCheckResult {
	// Get applicable policies
	policies, err := s.permissionRepo.GetPoliciesForResource(ctx, check.Resource)
	if err != nil {
		s.logger.Error("Failed to get policies", zap.Error(err))
		return models.PermissionCheckResult{Allowed: false, Reason: "policy evaluation error"}
	}

	// If no policies defined, default to allow (RBAC already checked)
	if len(policies) == 0 {
		return models.PermissionCheckResult{Allowed: true, Reason: "no ABAC policies defined"}
	}

	// Evaluate policies in priority order
	for _, policy := range policies {
		// Check if action matches
		if !matchesAction(policy.Actions, check.Action) {
			continue
		}

		// Check if resource matches
		if !matchesResource(policy.Resources, check.Resource) {
			continue
		}

		// Evaluate conditions
		conditionsMet := s.evaluateConditions(claims, policy.Conditions, check.Context)

		if conditionsMet {
			if policy.Effect == "deny" {
				return models.PermissionCheckResult{
					Allowed: false,
					Reason:  fmt.Sprintf("denied by policy: %s", policy.Name),
				}
			}
			if policy.Effect == "allow" {
				return models.PermissionCheckResult{
					Allowed: true,
					Reason:  fmt.Sprintf("allowed by policy: %s", policy.Name),
				}
			}
		}
	}

	// No matching policy - default deny for ABAC-controlled resources
	return models.PermissionCheckResult{Allowed: false, Reason: "no matching ABAC policy"}
}

// evaluateConditions checks if all conditions are met
func (s *ABACService) evaluateConditions(
	claims *models.TokenClaims,
	conditions []models.PolicyCondition,
	context map[string]string,
) bool {
	for _, condition := range conditions {
		if !s.evaluateCondition(claims, condition, context) {
			return false
		}
	}
	return true
}

// evaluateCondition evaluates a single condition
func (s *ABACService) evaluateCondition(
	claims *models.TokenClaims,
	condition models.PolicyCondition,
	context map[string]string,
) bool {
	// Get the attribute value
	attrValue := s.getAttributeValue(claims, condition.Attribute, context)
	if attrValue == "" {
		return false
	}

	// Evaluate based on operator
	switch condition.Operator {
	case "equals", "==":
		return attrValue == fmt.Sprintf("%v", condition.Value)

	case "not_equals", "!=":
		return attrValue != fmt.Sprintf("%v", condition.Value)

	case "contains":
		return strings.Contains(attrValue, fmt.Sprintf("%v", condition.Value))

	case "in":
		if values, ok := condition.Value.([]interface{}); ok {
			for _, v := range values {
				if attrValue == fmt.Sprintf("%v", v) {
					return true
				}
			}
		}
		return false

	case ">=":
		return compareClassification(attrValue, fmt.Sprintf("%v", condition.Value)) >= 0

	case "<=":
		return compareClassification(attrValue, fmt.Sprintf("%v", condition.Value)) <= 0

	case ">":
		return compareClassification(attrValue, fmt.Sprintf("%v", condition.Value)) > 0

	case "<":
		return compareClassification(attrValue, fmt.Sprintf("%v", condition.Value)) < 0

	default:
		s.logger.Warn("Unknown operator", zap.String("operator", condition.Operator))
		return false
	}
}

// getAttributeValue retrieves the value of an attribute from claims or context
func (s *ABACService) getAttributeValue(
	claims *models.TokenClaims,
	attribute string,
	context map[string]string,
) string {
	parts := strings.SplitN(attribute, ".", 2)
	if len(parts) != 2 {
		return ""
	}

	source, key := parts[0], parts[1]

	switch source {
	case "user":
		switch key {
		case "classification", "clearance":
			return claims.Classification
		case "email":
			return claims.Email
		case "name":
			return claims.Name
		default:
			if val, ok := claims.Attributes[key]; ok {
				return val
			}
		}

	case "resource":
		if val, ok := context[key]; ok {
			return val
		}

	case "context":
		if val, ok := context[key]; ok {
			return val
		}
	}

	return ""
}

// GetPolicies retrieves all ABAC policies
func (s *ABACService) GetPolicies(ctx context.Context) ([]models.ABACPolicy, error) {
	return s.permissionRepo.GetAllPolicies(ctx)
}

// CreatePolicy creates a new ABAC policy
func (s *ABACService) CreatePolicy(ctx context.Context, policy *models.ABACPolicy) error {
	policy.ID = uuid.New()
	return s.permissionRepo.CreatePolicy(ctx, policy)
}

// UpdatePolicy updates an existing ABAC policy
func (s *ABACService) UpdatePolicy(ctx context.Context, policy *models.ABACPolicy) error {
	return s.permissionRepo.UpdatePolicy(ctx, policy)
}

// DeletePolicy deletes an ABAC policy
func (s *ABACService) DeletePolicy(ctx context.Context, policyID uuid.UUID) error {
	return s.permissionRepo.DeletePolicy(ctx, policyID)
}

// matchesAction checks if any of the policy actions match the requested action
func matchesAction(policyActions []string, requestedAction string) bool {
	for _, action := range policyActions {
		if action == "*" || action == requestedAction {
			return true
		}
	}
	return false
}

// matchesResource checks if any of the policy resources match the requested resource
func matchesResource(policyResources []string, requestedResource string) bool {
	for _, resource := range policyResources {
		if resource == "*" {
			return true
		}
		if strings.HasSuffix(resource, "*") {
			prefix := strings.TrimSuffix(resource, "*")
			if strings.HasPrefix(requestedResource, prefix) {
				return true
			}
		}
		if resource == requestedResource {
			return true
		}
	}
	return false
}

// compareClassification compares two classification levels
// Returns: -1 if a < b, 0 if a == b, 1 if a > b
func compareClassification(a, b string) int {
	levels := map[string]int{
		"unclassified": 0,
		"cui":          1,
		"confidential": 2,
		"secret":       3,
		"top_secret":   4,
	}

	aLevel, aOk := levels[strings.ToLower(a)]
	bLevel, bOk := levels[strings.ToLower(b)]

	if !aOk || !bOk {
		return 0
	}

	if aLevel < bLevel {
		return -1
	}
	if aLevel > bLevel {
		return 1
	}
	return 0
}
