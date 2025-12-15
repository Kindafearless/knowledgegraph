.PHONY: help dev up down build logs clean seed reset db-shell redis-cli test lint

# Default target
help:
	@echo "Knowledge Graph - Development Commands"
	@echo ""
	@echo "Quick Start:"
	@echo "  make dev          - Start all services for development"
	@echo "  make seed         - Load seed data (run after 'make dev')"
	@echo ""
	@echo "Docker Commands:"
	@echo "  make up           - Start all services in background"
	@echo "  make down         - Stop all services"
	@echo "  make build        - Build all Docker images"
	@echo "  make logs         - View logs from all services"
	@echo "  make clean        - Stop services and remove volumes"
	@echo ""
	@echo "Database:"
	@echo "  make db-shell     - Open PostgreSQL shell"
	@echo "  make redis-cli    - Open Redis CLI"
	@echo "  make reset        - Reset database (delete and recreate)"
	@echo ""
	@echo "Development:"
	@echo "  make test         - Run tests for all services"
	@echo "  make lint         - Run linters for all services"
	@echo ""
	@echo "Individual Services:"
	@echo "  make logs-web     - View web frontend logs"
	@echo "  make logs-auth    - View auth service logs"
	@echo "  make logs-graph   - View graph service logs"
	@echo "  make logs-llm     - View LLM service logs"
	@echo "  make logs-ccv     - View CCV service logs"

# ============================================
# Quick Start
# ============================================

# Start everything for development
dev: build up
	@echo ""
	@echo "✓ Services are starting..."
	@echo ""
	@echo "Wait for services to be ready, then run: make seed"
	@echo ""
	@echo "URLs:"
	@echo "  Web App:        http://localhost:3000"
	@echo "  Auth Service:   http://localhost:8080"
	@echo "  Graph Service:  http://localhost:8001"
	@echo "  LLM Service:    http://localhost:8002"
	@echo "  CCV Service:    http://localhost:8003"

# ============================================
# Docker Commands
# ============================================

# Start services
up:
	docker compose up -d

# Stop services
down:
	docker compose down

# Build all images
build:
	docker compose build

# View all logs
logs:
	docker compose logs -f

# Clean everything (including volumes)
clean:
	docker compose down -v --remove-orphans
	docker system prune -f

# ============================================
# Seed Data
# ============================================

# Load seed data (waits for services)
seed:
	@echo "Loading seed data..."
	docker compose --profile seed up seed
	@echo ""
	@echo "✓ Seed data loaded!"
	@echo ""
	@echo "Test Credentials:"
	@echo "  Admin:   admin@example.com / password123"
	@echo "  Analyst: analyst@example.com / password123"
	@echo "  Viewer:  viewer@example.com / password123"
	@echo "  Steward: steward@example.com / password123"

# ============================================
# Database
# ============================================

# Open PostgreSQL shell
db-shell:
	docker compose exec postgres psql -U knowledgegraph -d knowledgegraph

# Open Redis CLI
redis-cli:
	docker compose exec redis redis-cli

# Reset database (destructive!)
reset:
	@echo "This will DELETE all data. Are you sure? [y/N]"
	@read confirm && [ "$$confirm" = "y" ] || exit 1
	docker compose down -v
	docker compose up -d postgres redis
	@echo "Waiting for database..."
	@sleep 5
	docker compose up -d
	@echo "Database reset complete. Run 'make seed' to reload test data."

# ============================================
# Individual Service Logs
# ============================================

logs-web:
	docker compose logs -f web

logs-auth:
	docker compose logs -f auth-service

logs-graph:
	docker compose logs -f graph-service

logs-llm:
	docker compose logs -f llm-service

logs-ccv:
	docker compose logs -f ccv-service

logs-db:
	docker compose logs -f postgres

# ============================================
# Testing & Linting
# ============================================

test:
	@echo "Running tests..."
	cd apps/auth-service && go test ./...
	cd apps/graph-service && python -m pytest
	cd apps/llm-service && python -m pytest
	cd apps/ccv-service && python -m pytest
	cd apps/web && npm test

lint:
	@echo "Running linters..."
	cd apps/auth-service && golangci-lint run
	cd apps/graph-service && ruff check .
	cd apps/llm-service && ruff check .
	cd apps/ccv-service && ruff check .
	cd apps/web && npm run lint

# ============================================
# Health Checks
# ============================================

health:
	@echo "Checking service health..."
	@curl -s http://localhost:8080/health > /dev/null && echo "✓ Auth Service" || echo "✗ Auth Service"
	@curl -s http://localhost:8001/health > /dev/null && echo "✓ Graph Service" || echo "✗ Graph Service"
	@curl -s http://localhost:8002/health > /dev/null && echo "✓ LLM Service" || echo "✗ LLM Service"
	@curl -s http://localhost:8003/health > /dev/null && echo "✓ CCV Service" || echo "✗ CCV Service"
	@curl -s http://localhost:3000 > /dev/null && echo "✓ Web App" || echo "✗ Web App"

# ============================================
# Development Shortcuts
# ============================================

# Rebuild and restart a specific service
restart-%:
	docker compose build $*
	docker compose up -d $*

# Shell into a container
shell-%:
	docker compose exec $* /bin/sh
