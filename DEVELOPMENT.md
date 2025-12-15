# Local Development Setup

This guide explains how to set up and run the Knowledge Graph application locally using Docker.

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Make (optional, but recommended)
- 8GB+ RAM available for Docker

## Quick Start

```bash
# 1. Start all services
make dev

# 2. Wait for services to be healthy (about 30-60 seconds)
make health

# 3. Open the application
open http://localhost:3000
```

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | password123 |
| Analyst | analyst@example.com | password123 |
| Viewer | viewer@example.com | password123 |
| Data Steward | steward@example.com | password123 |

## Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Web App | http://localhost:3000 | Main application UI |
| Auth Service | http://localhost:8080 | Authentication & authorization |
| Graph Service | http://localhost:8001 | Knowledge graph CRUD |
| LLM Service | http://localhost:8002 | AI/LLM features |
| CCV Service | http://localhost:8003 | Vocabulary management |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache & pub/sub |

## Available Commands

### Docker Operations

```bash
make dev          # Build and start all services
make up           # Start services in background
make down         # Stop all services
make build        # Rebuild Docker images
make logs         # View all service logs
make clean        # Stop and remove all data
```

### Database Operations

```bash
make db-shell     # Open PostgreSQL shell
make redis-cli    # Open Redis CLI
make reset        # Reset database (destructive!)
```

### Service-Specific Logs

```bash
make logs-web     # Frontend logs
make logs-auth    # Auth service logs
make logs-graph   # Graph service logs
make logs-llm     # LLM service logs
make logs-ccv     # CCV service logs
```

### Development Utilities

```bash
make health       # Check all service health
make restart-web  # Rebuild and restart web only
make shell-web    # Shell into web container
```

## Test Data

The local environment comes pre-loaded with test data including:

### Users & Roles
- 4 test users with different permission levels
- Admin, Analyst, Viewer, and Data Steward roles
- Pre-configured RBAC permissions

### Knowledge Graph Entities
- **Organizations**: Acme Corporation, departments
- **People**: 5 employees with roles and relationships
- **Projects**: Cloud Migration, Zero Trust, CMMC Certification
- **Technologies**: AWS GovCloud, Kubernetes, PostgreSQL, Terraform
- **Controls**: NIST 800-53 security controls

### CCV Vocabulary
- 25+ canonical terms across Security, Compliance, Technology domains
- Synonyms and abbreviations (MFA, ZTA, IaC, etc.)
- Hierarchical term relationships
- 5 pending suggestions for review

### Chat History
- Sample conversation about Cloud Migration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Web App (:3000)                       │
│                        (Next.js)                             │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Auth Service  │   │ Graph Service │   │  CCV Service  │
│   (:8080)     │   │   (:8001)     │   │   (:8003)     │
│    (Go)       │   │  (Python)     │   │  (Python)     │
└───────────────┘   └───────────────┘   └───────────────┘
        │                   │                   │
        │           ┌───────┴───────┐           │
        │           ▼               ▼           │
        │   ┌───────────────┐   ┌───────────┐   │
        │   │ LLM Service   │   │   Redis   │   │
        │   │   (:8002)     │   │  (:6379)  │   │
        │   │  (Python)     │   └───────────┘   │
        │   └───────────────┘                   │
        │                                       │
        └───────────────────┬───────────────────┘
                            ▼
                    ┌───────────────┐
                    │  PostgreSQL   │
                    │   (:5432)     │
                    └───────────────┘
```

## Mock LLM Mode

For local development without AWS credentials, the LLM service runs in **mock mode** by default. This provides:

- Simulated chat responses based on query patterns
- Mock term extraction for CCV
- Deterministic embeddings for semantic search

To use real AWS Bedrock:
1. Set `LLM_MOCK_MODE=false` in `.env`
2. Add your AWS credentials
3. Restart the LLM service: `make restart-llm-service`

## Database Schema

The application uses PostgreSQL with these main table groups:

- **Auth**: users, roles, permissions, user_roles, abac_policies
- **Graph**: entities, relationships, entity_types, data_sources
- **CCV**: ccv_terms, ccv_synonyms, ccv_suggestions, ccv_entity_mappings
- **LLM**: chat_sessions, chat_messages, llm_prompts

See `docker/init-db/*.sql` for full schema.

## Troubleshooting

### Services won't start
```bash
# Check Docker resources
docker system info

# View service logs
docker compose logs -f

# Reset everything
make clean && make dev
```

### Database connection issues
```bash
# Check if PostgreSQL is running
docker compose ps postgres

# View PostgreSQL logs
make logs-db

# Reset database
make reset
```

### Port conflicts
If ports are already in use, modify `docker-compose.yml` port mappings or stop conflicting services.

### Web app not loading
```bash
# Check web container logs
make logs-web

# Rebuild web container
make restart-web
```

## Optional Tools

Enable additional development tools:

```bash
# Start with pgAdmin and Redis Commander
docker compose --profile tools up -d

# pgAdmin: http://localhost:5050
#   Email: admin@example.com
#   Password: admin

# Redis Commander: http://localhost:8081
```

## Next Steps

1. Explore the Graph Explorer at http://localhost:3000
2. Try the CCV management at http://localhost:3000/ccv
3. Test the chat interface for natural language queries
4. Review pending vocabulary suggestions
