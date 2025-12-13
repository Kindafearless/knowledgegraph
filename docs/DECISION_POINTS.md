# Architecture Decision Points (Updated for IL6/CMMC)

## Summary of Proposed Architecture

Designed for **CMMC Level 2/3** and **DoD IL6** compliance with AWS GovCloud deployment.

---

## Technology Choices (IL6 Compliant)

### Frontend
| Choice | Recommendation | Alternatives |
|--------|----------------|--------------|
| Framework | **Next.js 14** | Plain React + Vite |
| Graph Visualization | **React Flow + D3.js** | Cytoscape.js, vis.js |
| State Management | **Zustand + TanStack Query** | Redux, Jotai |

### Backend Services
| Service | Recommendation | Alternatives |
|---------|----------------|--------------|
| Auth Service | **Go (Gin/Echo)** | Python, Node.js |
| Graph/LLM/CCV Services | **Python (FastAPI)** | Node.js |
| All Services | **ECS Fargate** | ECS on EC2 |

### Data Stores (FedRAMP High / GovCloud)
| Purpose | Recommendation | MVP Alternative |
|---------|----------------|-----------------|
| Graph Database | Amazon Neptune | PostgreSQL + Apache AGE |
| Vector Search | OpenSearch | pgvector extension |
| Relational | **Aurora PostgreSQL** | RDS PostgreSQL |
| Cache | ElastiCache (Redis) | In-memory (MVP) |

### LLM Strategy (IL6 - No External APIs)
| Use Case | Recommendation |
|----------|----------------|
| Primary LLM | **Claude 3.5 Sonnet via AWS Bedrock (GovCloud)** |
| Fast Classification | **Claude 3 Haiku via Bedrock** |
| Embeddings | **Cohere Embed or Titan via Bedrock** |
| Web Search | **Not available** (curated knowledge base instead) |
| Fallback | Self-hosted Llama 3.1 (optional) |

### Infrastructure
| Aspect | Recommendation |
|--------|----------------|
| Container Orchestration | **ECS Fargate** (simpler than K8s) |
| IaC Tool | **AWS CDK (TypeScript)** |
| CI/CD | **GitHub Actions + AWS CodePipeline** |
| Secrets | **AWS Secrets Manager** |
| Region | **us-gov-west-1** (GovCloud) |

---

## Confirmed Decisions

Based on your input:

### ✅ Compliance: CMMC + IL6
- AWS GovCloud required
- FedRAMP High services only
- No external API calls (LLM, search, etc.)
- FIPS 140-2 encryption mandatory

### ✅ LLM: AWS Bedrock Only
- Claude 3.5 Sonnet for reasoning
- Claude 3 Haiku for fast tasks
- Cohere/Titan for embeddings
- No OpenAI, no Anthropic direct API

### ✅ MVP Data Source: RDS PostgreSQL
- Start simple with PostgreSQL
- Can use Apache AGE for graph queries (avoid Neptune cost initially)
- pgvector for embeddings
- Single database simplifies MVP

### ✅ Compute: ECS Fargate
- Simpler than Kubernetes
- FedRAMP High authorized
- Available in GovCloud
- Auto-scaling without cluster management

---

## Remaining Questions

### 1. Identity Provider
Which IdP for GovCloud?
- [ ] **AWS Cognito** (simplest, FedRAMP High in GovCloud)
- [ ] **Okta** (if already using for DoD/Gov)
- [ ] **Azure AD** (if hybrid environment)
- [ ] **SAML/OIDC to existing CAC/PIV** infrastructure

### 2. Graph Database Strategy
Start simple or invest upfront?
- [ ] **PostgreSQL + Apache AGE** (MVP - lower cost, single DB)
- [ ] **Neptune from start** (better performance, higher cost ~$400-600/mo)

### 3. Auth Service Language
Team preference for the auth service?
- [ ] **Go** (good performance, easier than Rust, GovCloud compatible)
- [ ] **Python** (consistent with other services, slightly slower)
- [ ] **Node.js** (if team prefers TypeScript everywhere)

### 4. Vector Search Strategy
- [ ] **pgvector in PostgreSQL** (MVP - simpler, good for <1M vectors)
- [ ] **OpenSearch** (better for scale, additional cost ~$200-400/mo)

### 5. Self-Hosted LLM Fallback
Do you need air-gap capability?
- [ ] **Yes** - Add Llama 3.1 on EC2 GPU instances
- [ ] **No** - Bedrock only is sufficient

---

## Revised Project Structure

```
knowledgegraph/
├── apps/
│   ├── web/                    # Next.js frontend
│   ├── auth-service/           # Go auth microservice
│   ├── graph-service/          # Python graph operations
│   ├── llm-service/            # Python LLM orchestration
│   ├── ccv-service/            # Python vocabulary management
│   └── ingestion-service/      # Python data ingestion
├── packages/
│   ├── ui/                     # Shared React components
│   ├── graph-viz/              # Graph visualization library
│   ├── types/                  # Shared TypeScript types
│   └── python-common/          # Shared Python utilities
├── infrastructure/
│   ├── cdk/                    # AWS CDK stacks (GovCloud)
│   ├── ecs/                    # ECS task definitions
│   └── docker/                 # Dockerfiles (FIPS base images)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── ARCHITECTURE_IL6.md
│   └── DECISION_POINTS.md
├── scripts/                    # Development & deployment scripts
├── turbo.json                  # Turborepo config
├── package.json                # Root package.json
└── README.md
```

---

## MVP Architecture (Simplified)

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS GovCloud                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐     ┌─────────────────────────────────────┐   │
│  │   ALB   │────▶│          ECS Fargate               │   │
│  │  + WAF  │     │                                     │   │
│  └─────────┘     │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │   │
│                  │  │ Web │ │Auth │ │Graph│ │ LLM │  │   │
│                  │  └─────┘ └─────┘ └─────┘ └─────┘  │   │
│                  └─────────────────────────────────────┘   │
│                              │                              │
│                              ▼                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Aurora PostgreSQL                       │   │
│  │  • Relational data (users, permissions)             │   │
│  │  • Graph data (Apache AGE extension)                │   │
│  │  • Vector embeddings (pgvector extension)           │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│                              ▼                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              AWS Bedrock (VPC Endpoint)              │   │
│  │  • Claude 3.5 Sonnet                                │   │
│  │  • Cohere Embeddings                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Cost Estimate (MVP - Monthly)

### Option A: PostgreSQL Only (Simplest)
| Service | Est. Cost |
|---------|-----------|
| ECS Fargate (4 services) | $300-400 |
| Aurora PostgreSQL (db.r6g.medium) | $300-400 |
| Bedrock (~500K tokens/day) | $200-300 |
| ALB + WAF | $100-150 |
| S3 + CloudTrail | $50-100 |
| VPC Endpoints (5) | $100-150 |
| **Total** | **$1,050-1,500/mo** |

### Option B: With Neptune + OpenSearch
| Service | Est. Cost |
|---------|-----------|
| ECS Fargate (4 services) | $300-400 |
| Aurora PostgreSQL | $300-400 |
| Neptune (db.r5.large) | $400-600 |
| OpenSearch (t3.medium) | $200-300 |
| Bedrock | $200-300 |
| ALB + WAF + Endpoints | $250-400 |
| **Total** | **$1,650-2,400/mo** |

---

## Ready to Build

Once you confirm:
1. **IdP choice** (Cognito recommended for simplicity)
2. **Graph DB strategy** (PostgreSQL+AGE vs Neptune)
3. **Auth service language** (Go recommended)
4. **Self-hosted LLM need** (likely no for MVP)

I'll start building the project structure and infrastructure!
