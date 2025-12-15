#!/bin/bash
# Quick start script for local development

set -e

echo "================================================"
echo "  Knowledge Graph - Local Development Setup"
echo "================================================"
echo ""

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check for Docker Compose
if ! docker compose version &> /dev/null; then
    echo "Error: Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from .env.local..."
    cp .env.local .env
fi

# Build and start services
echo ""
echo "Building Docker images..."
docker compose build

echo ""
echo "Starting services..."
docker compose up -d

# Wait for services to be ready
echo ""
echo "Waiting for services to start..."
sleep 10

# Check health
echo ""
echo "Checking service health..."

check_health() {
    local name=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo "  ✓ $name is ready"
            return 0
        fi
        sleep 2
        ((attempt++))
    done

    echo "  ✗ $name failed to start"
    return 1
}

check_health "PostgreSQL" "localhost:5432" || true
check_health "Redis" "localhost:6379" || true
check_health "Auth Service" "http://localhost:8080/health"
check_health "Graph Service" "http://localhost:8001/health"
check_health "LLM Service" "http://localhost:8002/health"
check_health "CCV Service" "http://localhost:8003/health"
check_health "Web App" "http://localhost:3000"

echo ""
echo "================================================"
echo "  ✓ Development environment is ready!"
echo "================================================"
echo ""
echo "URLs:"
echo "  Web App:        http://localhost:3000"
echo "  Auth Service:   http://localhost:8080"
echo "  Graph Service:  http://localhost:8001"
echo "  LLM Service:    http://localhost:8002"
echo "  CCV Service:    http://localhost:8003"
echo ""
echo "Test Credentials:"
echo "  Admin:   admin@example.com / password123"
echo "  Analyst: analyst@example.com / password123"
echo "  Viewer:  viewer@example.com / password123"
echo "  Steward: steward@example.com / password123"
echo ""
echo "Useful commands:"
echo "  make logs       - View all service logs"
echo "  make db-shell   - Open database shell"
echo "  make health     - Check service health"
echo "  make down       - Stop all services"
echo "  make clean      - Stop and remove all data"
echo ""
