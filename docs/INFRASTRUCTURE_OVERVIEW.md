# Knowledge Graph LLM Application - Infrastructure & Components Overview

## Executive Summary

The Knowledge Graph LLM Application is an enterprise-grade, cloud-native platform for interactive knowledge graph visualization, natural language processing, and intelligent relationship discovery. Built with a microservices architecture, it's designed for IL6/CMMC compliance and AWS GovCloud deployment.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Services](#services)
3. [Frontend Application](#frontend-application)
4. [Database Architecture](#database-architecture)
5. [Infrastructure & Deployment](#infrastructure--deployment)
6. [Key Dependencies](#key-dependencies)
7. [Local Development](#local-development)

---

## Architecture Overview

### Project Structure

```
knowledgegraph/
├── apps/                          # Microservices and web application
│   ├── web/                       # Next.js 14 frontend
│   ├── auth-service/              # Go authentication service
│   ├── graph-service/             # Python graph operations
│   ├── llm-service/               # Python LLM & RAG service
│   └── ccv-service/               # Python vocabulary management
├── infrastructure/                # AWS CDK infrastructure-as-code
│   └── cdk/
├── docker/                        # Docker configurations & DB init
│   └── init-db/                   # Database schema scripts
├── docs/                          # Documentation
└── .github/workflows/             # CI/CD pipelines
```

### Technology Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TailwindCSS, React Flow |
| Backend APIs | FastAPI (Python), Gin (Go) |
| Database | PostgreSQL 15 with pgvector |
| Cache | Redis 7 |
| Authentication | AWS Cognito, JWT |
| LLM | AWS Bedrock (Claude 3.5 Sonnet) |
| Infrastructure | AWS CDK, ECS Fargate |
| CI/CD | GitHub Actions |

---

## Services

### Service Overview

| Service | Port | Language | Purpose |
|---------|------|----------|---------|
| **Web Frontend** | 3001 | TypeScript | User interface |
| **Auth Service** | 8080 | Go | Authentication & authorization |
| **Graph Service** | 8001 | Python | Entity/relationship management |
| **LLM Service** | 8002 | Python | Natural language & RAG |
| **CCV Service** | 8003 | Python | Vocabulary management |
| **PostgreSQL** | 5432 | - | Primary database |
| **Redis** | 6379 | - | Caching & sessions |

---

### Auth Service (Go)

**Purpose**: Handles authentication, authorization, and user management.

**Key Features**:
- AWS Cognito integration (production) / Local auth (development)
- JWT token generation and validation (RS256)
- Role-Based Access Control (RBAC)
- Attribute-Based Access Control (ABAC)
- Session management via Redis

**Key Dependencies**:
```
github.com/gin-gonic/gin          # HTTP framework
github.com/golang-jwt/jwt/v5      # JWT handling
github.com/aws/aws-sdk-go-v2      # AWS SDK (Cognito)
github.com/jackc/pgx/v5           # PostgreSQL driver
github.com/redis/go-redis/v9      # Redis client
go.uber.org/zap                   # Structured logging
```

**API Endpoints**:
- `POST /api/v1/auth/login` - User authentication
- `POST /api/v1/auth/logout` - Session termination
- `POST /api/v1/auth/refresh` - Token refresh
- `GET /api/v1/me` - Current user info
- `POST /api/v1/permissions/check` - Permission validation
- `GET /api/v1/admin/users` - User management (admin)
- `GET /api/v1/admin/roles` - Role management (admin)

---

### Graph Service (Python/FastAPI)

**Purpose**: Manages entities, relationships, and graph operations.

**Key Features**:
- Entity CRUD operations
- Relationship management
- Graph traversal (BFS/DFS)
- Path finding algorithms
- Data source integration
- Full-text search on entities

**Key Dependencies**:
```python
fastapi                    # Web framework
sqlalchemy[asyncio]        # Async ORM
asyncpg                    # PostgreSQL async driver
networkx                   # Graph algorithms
numpy                      # Numerical operations
structlog                  # Structured logging
opentelemetry-*            # Distributed tracing
```

**API Endpoints**:
- `GET/POST /api/v1/entities` - Entity list/create
- `GET/PUT/DELETE /api/v1/entities/{id}` - Entity operations
- `GET /api/v1/entities/{id}/relationships` - Entity relationships
- `POST /api/v1/queries/traverse` - Graph traversal
- `POST /api/v1/queries/search` - Entity search
- `GET/POST /api/v1/datasources` - Data source management

---

### LLM Service (Python/FastAPI)

**Purpose**: Provides natural language processing and RAG capabilities.

**Key Features**:
- Chat session management
- Retrieval-Augmented Generation (RAG)
- Text embedding generation
- Intent recognition
- Context-aware responses
- Token usage tracking

**Key Dependencies**:
```python
fastapi                    # Web framework
boto3                      # AWS SDK (Bedrock)
langchain                  # LLM orchestration
langchain-aws              # AWS integrations
pgvector                   # Vector operations
tiktoken                   # Token counting
```

**LLM Models**:
- **Primary**: Claude 3.5 Sonnet (AWS Bedrock)
- **Fast**: Claude 3 Haiku (fallback)
- **Embeddings**: Cohere Embed / Amazon Titan

**API Endpoints**:
- `POST /api/v1/chat/sessions` - Create chat session
- `GET /api/v1/chat/sessions` - List sessions
- `POST /api/v1/chat/sessions/{id}/messages` - Send message
- `GET /api/v1/chat/sessions/{id}/messages` - Get history
- `POST /api/v1/embeddings/generate` - Generate embeddings

---

### CCV Service (Python/FastAPI)

**Purpose**: Manages controlled vocabulary and terminology standardization.

**Key Features**:
- Term CRUD with hierarchy
- Synonym management
- LLM-powered term suggestions
- Real-time updates via WebSocket
- Collision detection for duplicates
- Auto-approval for high-confidence suggestions

**Key Dependencies**:
```python
fastapi                    # Web framework
sqlalchemy[asyncio]        # Async ORM
asyncpg                    # PostgreSQL driver
websockets                 # Real-time updates
celery                     # Task queue
redis                      # Message broker
```

**API Endpoints**:
- `GET/POST /api/v1/terms` - Term list/create
- `GET/PUT/DELETE /api/v1/terms/{id}` - Term operations
- `GET /api/v1/terms/search` - Term search
- `GET /api/v1/terms/similar` - Collision detection
- `GET/POST /api/v1/terms/{id}/synonyms` - Synonym management
- `GET /api/v1/suggestions` - Pending suggestions
- `POST /api/v1/suggestions/{id}/review` - Approve/reject
- `GET /api/v1/hierarchy` - Term hierarchy
- `WS /ws/ccv` - Real-time updates

---

## Frontend Application

**Framework**: Next.js 14 with App Router

### Key Technologies

| Category | Technology |
|----------|------------|
| UI Framework | React 18 |
| Styling | TailwindCSS 3.4 |
| Components | Radix UI (headless) |
| Graph Visualization | React Flow 11.10 |
| Data Fetching | TanStack React Query 5 |
| State Management | Zustand 4.4 |
| Icons | Lucide React |
| Type Safety | TypeScript 5.3 |

### Application Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Dashboard
│   ├── graph/             # Graph explorer
│   ├── search/            # Natural language search
│   ├── ccv/               # Vocabulary management
│   ├── data-sources/      # Data source management
│   └── admin/             # Admin console
├── components/
│   ├── layout/            # Header, Sidebar
│   ├── graph/             # Graph visualization components
│   ├── chat/              # Chat interface
│   └── ccv/               # CCV components
├── hooks/                 # Custom React hooks
├── stores/                # Zustand state stores
└── lib/api/               # API client functions
```

### Key Pages

| Page | Path | Purpose |
|------|------|---------|
| Dashboard | `/` | Overview and quick access |
| Graph Explorer | `/graph` | Interactive graph visualization |
| Search | `/search` | Natural language queries |
| CCV Manager | `/ccv` | Vocabulary management |
| Data Sources | `/data-sources` | Source configuration |
| Admin | `/admin` | User & permission management |

---

## Database Architecture

### PostgreSQL 15 with Extensions

**Extensions**:
- `uuid-ossp` - UUID generation
- `pg_trgm` - Trigram text search
- `pgvector` - Vector embeddings (planned)

### Schema Overview

#### Auth Schema (02-auth-schema.sql)

```sql
users           -- User accounts with roles and attributes
roles           -- Role definitions with permissions
permissions     -- Permission definitions (resource + action)
user_roles      -- User-role assignments
abac_policies   -- Attribute-based access policies
refresh_tokens  -- Token management
auth_audit_log  -- Audit trail
```

#### Graph Schema (03-graph-schema.sql)

```sql
data_sources        -- External data source configurations
entity_types        -- Entity type definitions
entities            -- Graph nodes with properties (JSONB)
relationship_types  -- Relationship type definitions
relationships       -- Graph edges between entities
entity_embeddings   -- Vector embeddings for similarity
saved_queries       -- User-saved graph queries
entity_history      -- Change tracking for audit
```

#### CCV Schema (04-ccv-schema.sql)

```sql
ccv_terms              -- Canonical vocabulary terms
ccv_synonyms           -- Term synonyms
ccv_term_relationships -- Term hierarchy (broader/narrower)
ccv_suggestions        -- LLM-generated suggestions
ccv_entity_mappings    -- Links between entities and terms
ccv_data_source_mappings -- Data source value mappings
```

#### LLM Schema (05-llm-schema.sql)

```sql
chat_sessions    -- User chat sessions
chat_messages    -- Conversation messages
rag_retrievals   -- RAG context retrievals
llm_prompts      -- Prompt templates
llm_usage        -- Token usage tracking
```

---

## Infrastructure & Deployment

### AWS CDK Stacks

**Location**: `infrastructure/cdk/lib/stacks/`

| Stack | Purpose |
|-------|---------|
| NetworkStack | VPC, subnets, security groups, VPC endpoints |
| DatabaseStack | Aurora PostgreSQL cluster, encryption |
| ComputeStack | ECS Fargate, ECR repos, ALB, Cognito |
| MonitoringStack | CloudWatch logs, alarms, metrics |

### Network Architecture

```
VPC (10.0.0.0/16)
├── Public Subnets      # NAT Gateways, ALB
├── Private Subnets     # ECS Fargate tasks
└── Isolated Subnets    # RDS instances (no internet)
```

### Security Features

- **Encryption at Rest**: KMS (FIPS 140-2)
- **Encryption in Transit**: TLS 1.2+
- **Secrets**: AWS Secrets Manager
- **Network**: VPC Flow Logs, Security Groups
- **Compliance**: IL6/CMMC ready, GovCloud

### CI/CD Pipeline (GitHub Actions)

**CI Workflow** (`ci.yml`):
- Lint, type-check, test for all services
- Runs on push to main/develop, PRs

**Deploy Workflow** (`deploy.yml`):
- Build Docker images
- Push to ECR
- Deploy via CDK
- Supports dev/staging/prod environments

---

## Key Dependencies

### Frontend (package.json)

```json
{
  "next": "^14.0",
  "react": "^18.2",
  "tailwindcss": "^3.4",
  "@radix-ui/*": "^1.0+",
  "reactflow": "^11.10",
  "@tanstack/react-query": "^5.17",
  "zustand": "^4.4",
  "lucide-react": "^0.303"
}
```

### Python Services (pyproject.toml)

```toml
[dependencies]
fastapi = "^0.109"
uvicorn = "^0.27"
sqlalchemy = {extras = ["asyncio"], version = "^2.0"}
asyncpg = "^0.29"
pydantic = "^2.5"
structlog = "^24.1"
httpx = "^0.26"
```

### Go Service (go.mod)

```go
require (
    github.com/gin-gonic/gin v1.9+
    github.com/golang-jwt/jwt/v5 v5.2+
    github.com/jackc/pgx/v5 v5.5+
    github.com/redis/go-redis/v9 v9.4+
    github.com/aws/aws-sdk-go-v2 v1.24+
)
```

### Infrastructure (package.json)

```json
{
  "aws-cdk-lib": "^2.120.0",
  "constructs": "^10.3.0"
}
```

---

## Local Development

### Quick Start

```bash
# Start all services
make dev

# Load seed data
make seed

# View logs
make logs

# Check health
make health

# Reset everything
make reset
```

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | password123 |
| Analyst | analyst@example.com | password123 |
| Viewer | viewer@example.com | password123 |
| Steward | steward@example.com | password123 |

### Service URLs (Local)

| Service | URL |
|---------|-----|
| Web App | http://localhost:3001 |
| Auth Service | http://localhost:8080 |
| Graph Service | http://localhost:8001 |
| LLM Service | http://localhost:8002 |
| CCV Service | http://localhost:8003 |

### Docker Compose Services

```yaml
services:
  postgres:     # PostgreSQL 15
  redis:        # Redis 7
  auth-service: # Go authentication
  graph-service: # Python graph ops
  llm-service:  # Python LLM/RAG
  ccv-service:  # Python vocabulary
  web:          # Next.js frontend
```

---

## Data Flow Diagrams

### Entity Ingestion

```
Data Source → Graph Service → PostgreSQL
                    ↓
              LLM Service (embeddings)
                    ↓
              CCV Service (term suggestions)
```

### Query Resolution

```
User Query → LLM Service (intent)
                  ↓
           Graph Service (traversal)
                  ↓
           LLM Service (response generation)
                  ↓
           Frontend (display)
```

### Vocabulary Management

```
New Entity → CCV Service (extraction)
                  ↓
            LLM Service (suggestions)
                  ↓
            WebSocket notification
                  ↓
            User approval/auto-approve
```

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture design
- [ARCHITECTURE_IL6.md](./ARCHITECTURE_IL6.md) - Compliance specifications
- [DECISION_POINTS.md](./DECISION_POINTS.md) - Design decisions

---

*Last updated: December 2024*
