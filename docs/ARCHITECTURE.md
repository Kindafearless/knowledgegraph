# Knowledge Graph LLM Application - Architecture Design

## Executive Summary

This document outlines the architecture for an interactive knowledge graph application that combines graph-based data modeling, LLM-powered natural language interfaces, and adaptive visualization. The system is designed for enterprise scale with security-first principles.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Core Components](#core-components)
4. [Technology Stack](#technology-stack)
5. [Security Architecture](#security-architecture)
6. [Data Flow](#data-flow)
7. [Deployment Architecture](#deployment-architecture)
8. [Key Design Decisions](#key-design-decisions)

---

## System Overview

### Core Capabilities

| Capability | Description |
|------------|-------------|
| **Multi-Source Data Ingestion** | Connect to databases, APIs, files, and streaming sources |
| **Intelligent Relationship Discovery** | ML-powered entity resolution and relationship suggestion |
| **Natural Language Interface** | LLM-powered Q&A with conversational context |
| **Adaptive Visualization** | Dynamic graph UI that responds to query context |
| **Canonical Control Vocabulary (CCV)** | Auto-generated and user-curated ontology management |
| **Knowledge Augmentation** | LLM web search to supplement internal knowledge |
| **Enterprise Security** | RBAC + ABAC with data-source-level permissions |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                  CLIENT LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                     React/Next.js Application                            │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │    │
│  │  │   Graph      │ │   Chat       │ │   CCV        │ │   Admin      │    │    │
│  │  │   Explorer   │ │   Interface  │ │   Manager    │ │   Console    │    │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   API GATEWAY                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │              AWS API Gateway / Kong / Custom Gateway                     │    │
│  │         (Rate Limiting, Request Validation, API Versioning)              │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SERVICE LAYER (EKS)                                 │
│                                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐              │
│  │   Auth Service   │  │   Graph Service  │  │   LLM Service    │              │
│  │   (Rust/Go)      │  │   (Python)       │  │   (Python)       │              │
│  │                  │  │                  │  │                  │              │
│  │ • JWT/OAuth2     │  │ • CRUD Ops       │  │ • Query Parse    │              │
│  │ • RBAC Engine    │  │ • Traversal      │  │ • RAG Pipeline   │              │
│  │ • ABAC Engine    │  │ • Search         │  │ • Web Search     │              │
│  │ • Policy Eval    │  │ • Analytics      │  │ • Response Gen   │              │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘              │
│                                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐              │
│  │  Ingestion Svc   │  │   CCV Service    │  │  Connector Svc   │              │
│  │  (Python)        │  │   (Python)       │  │  (Python/Go)     │              │
│  │                  │  │                  │  │                  │              │
│  │ • ETL Pipeline   │  │ • Ontology Mgmt  │  │ • DB Connectors  │              │
│  │ • Entity Extract │  │ • Term Normalizn │  │ • API Adapters   │              │
│  │ • Relationship   │  │ • Hierarchy Mgmt │  │ • File Parsers   │              │
│  │   Discovery      │  │ • Synonym Mgmt   │  │ • Stream Ingest  │              │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               DATA LAYER                                         │
│                                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐              │
│  │   Graph DB       │  │   Vector DB      │  │   Relational DB  │              │
│  │   (Neptune)      │  │   (OpenSearch    │  │   (Aurora PG)    │              │
│  │                  │  │    + pgvector)   │  │                  │              │
│  │ • Entities       │  │ • Embeddings     │  │ • Users/Orgs     │              │
│  │ • Relationships  │  │ • Semantic Search│  │ • Permissions    │              │
│  │ • Properties     │  │ • RAG Index      │  │ • Audit Logs     │              │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘              │
│                                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐              │
│  │   Cache Layer    │  │   Object Store   │  │   Message Queue  │              │
│  │   (ElastiCache)  │  │   (S3)           │  │   (SQS/EventBr)  │              │
│  │                  │  │                  │  │                  │              │
│  │ • Query Cache    │  │ • Raw Data       │  │ • Async Tasks    │              │
│  │ • Session Store  │  │ • Exports        │  │ • Event Pub/Sub  │              │
│  │ • Rate Limiting  │  │ • Backups        │  │ • Ingestion Jobs │              │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Frontend Application

**Technology:** Next.js 14 (App Router) + TypeScript + TailwindCSS

**Key Libraries:**
- **Graph Visualization:** React Flow + D3.js (custom hybrid for performance at scale)
- **State Management:** Zustand + TanStack Query
- **Real-time:** Socket.io for live collaboration
- **UI Components:** Radix UI + custom design system

**Modules:**

| Module | Purpose |
|--------|---------|
| `GraphExplorer` | Interactive graph visualization with zoom, pan, filter, expand/collapse |
| `ChatInterface` | LLM conversation panel with streaming responses |
| `QueryBuilder` | Visual query construction with auto-complete |
| `CCVManager` | Vocabulary hierarchy editor with drag-drop |
| `DataSourceAdmin` | Connector configuration and monitoring |
| `PermissionsAdmin` | RBAC/ABAC policy management |

### 2. Auth Service

**Technology:** Rust (for performance) or Go

**Responsibilities:**
- JWT token issuance and validation
- OAuth2/OIDC integration (Auth0, Okta, AWS Cognito)
- RBAC policy evaluation
- ABAC attribute-based decisions
- Row-level security token generation

**Key Design:**
```
┌─────────────────────────────────────────────────────┐
│                  Auth Decision Flow                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Request → Identity → RBAC Check → ABAC Check → Allow/Deny
│              │            │            │
│              ▼            ▼            ▼
│         User/Role    Permission    Attribute
│         Resolution   Evaluation    Policies
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Permission Model:**
```typescript
interface Permission {
  resource: string;      // "graph:entity", "datasource:*"
  action: string;        // "read", "write", "delete", "admin"
  conditions?: {         // ABAC conditions
    dataSource?: string[];
    classification?: string[];
    owner?: "self" | "team" | "org";
    timeRange?: { start: Date; end: Date };
  };
}
```

### 3. Graph Service

**Technology:** Python (FastAPI) + NetworkX + Graph algorithms

**Responsibilities:**
- CRUD operations on entities and relationships
- Graph traversal and pathfinding
- Centrality and clustering analysis
- Subgraph extraction for visualization
- Permission-filtered queries

**Key APIs:**
```
POST   /api/v1/graph/entities          # Create entity
GET    /api/v1/graph/entities/:id      # Get entity with relations
POST   /api/v1/graph/query             # Execute graph query
POST   /api/v1/graph/traverse          # BFS/DFS traversal
GET    /api/v1/graph/analytics/:type   # Centrality, clustering
POST   /api/v1/graph/subgraph          # Extract visualization subgraph
```

### 4. LLM Service

**Technology:** Python (FastAPI) + LangChain/LlamaIndex

**Responsibilities:**
- Natural language query parsing
- Intent classification
- RAG pipeline execution
- Web search augmentation
- Response generation with citations

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                    LLM Query Pipeline                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Query                                                 │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────┐                                           │
│  │   Intent    │ → Graph Query / Search / General / Admin  │
│  │  Classifier │                                           │
│  └─────────────┘                                           │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   Graph     │    │   Vector    │    │    Web      │    │
│  │   Query     │    │   Search    │    │   Search    │    │
│  │   Builder   │    │   (RAG)     │    │   (Tavily)  │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│      │                    │                   │            │
│      └────────────────────┼───────────────────┘            │
│                           ▼                                 │
│                   ┌─────────────┐                          │
│                   │   Context   │                          │
│                   │   Assembly  │                          │
│                   └─────────────┘                          │
│                           │                                 │
│                           ▼                                 │
│                   ┌─────────────┐                          │
│                   │     LLM     │ (Claude/GPT-4/Bedrock)   │
│                   │   Response  │                          │
│                   └─────────────┘                          │
│                           │                                 │
│                           ▼                                 │
│                   Response with Citations + Graph Context   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5. CCV (Canonical Control Vocabulary) Service

**Technology:** Python (FastAPI)

**Responsibilities:**
- Ontology/taxonomy management
- Term normalization and mapping
- Synonym management
- Hierarchy CRUD operations
- Auto-suggestion from ingested data
- LLM-powered term recommendations

**Data Model:**
```typescript
interface CCVTerm {
  id: string;
  canonicalName: string;
  definition: string;
  parentId?: string;
  synonyms: string[];
  relatedTerms: string[];
  dataSourceMappings: {
    sourceId: string;
    originalTerm: string;
    confidence: number;
  }[];
  metadata: {
    createdBy: string;
    createdAt: Date;
    autoGenerated: boolean;
    approvalStatus: "pending" | "approved" | "rejected";
  };
}
```

### 6. Ingestion Service

**Technology:** Python (FastAPI) + Apache Spark (for large datasets)

**Responsibilities:**
- Data source connection management
- Schema inference and mapping
- Entity extraction (NER, regex, rules)
- Relationship discovery (ML + rules)
- Incremental sync and CDC

**Connectors (Initial Set):**
- PostgreSQL / MySQL / SQL Server
- MongoDB
- REST APIs (with schema definition)
- CSV / JSON / Parquet files
- S3 data lakes

---

## Technology Stack

### Backend Services

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Auth Service** | Rust/Axum or Go/Gin | High-performance, low-latency auth checks |
| **Graph Service** | Python/FastAPI | Rich graph algorithm ecosystem (NetworkX, igraph) |
| **LLM Service** | Python/FastAPI | Best LLM library support (LangChain, LlamaIndex) |
| **CCV Service** | Python/FastAPI | NLP libraries for term extraction |
| **Ingestion Service** | Python/FastAPI + Spark | ETL ecosystem maturity |
| **Connector Service** | Go | Efficient I/O for data streaming |

### Frontend

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Framework** | Next.js 14 | SSR, API routes, excellent DX |
| **Language** | TypeScript | Type safety at scale |
| **Styling** | TailwindCSS + Radix | Rapid development + accessibility |
| **Graph Viz** | React Flow + D3.js | Best-in-class for interactive graphs |
| **State** | Zustand + TanStack Query | Simple + powerful caching |

### Data Stores

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Graph Database** | Amazon Neptune | Managed, scales, supports Gremlin + SPARQL |
| **Vector Database** | OpenSearch + pgvector | Unified search + vector, cost-effective |
| **Relational** | Aurora PostgreSQL | Managed, scales, JSON support |
| **Cache** | ElastiCache (Redis) | Session, query cache, rate limiting |
| **Object Store** | S3 | Unlimited scale, cheap storage |
| **Message Queue** | SQS + EventBridge | Managed, scales, event-driven |

### LLM Providers

| Use Case | Primary | Fallback |
|----------|---------|----------|
| **Complex Reasoning** | Claude 3.5 Sonnet (Bedrock) | GPT-4 |
| **Fast Classification** | Claude 3 Haiku | GPT-3.5-turbo |
| **Embeddings** | Cohere Embed (Bedrock) | OpenAI ada-002 |
| **Web Search** | Tavily API | Brave Search API |

---

## Security Architecture

### Authentication Flow

```
┌────────────────────────────────────────────────────────────┐
│                   Authentication Flow                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  User → Login → IdP (Cognito/Okta) → JWT + Refresh Token  │
│                                                            │
│  JWT Contains:                                             │
│  • user_id                                                 │
│  • org_id                                                  │
│  • roles[]                                                 │
│  • permissions[] (RBAC)                                    │
│  • attributes{} (ABAC: clearance, department, etc.)        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Authorization Model

**RBAC (Role-Based Access Control):**
```yaml
roles:
  viewer:
    permissions:
      - graph:entity:read
      - graph:relationship:read
      - ccv:term:read

  analyst:
    inherits: viewer
    permissions:
      - graph:query:execute
      - llm:chat:use
      - export:data:create

  curator:
    inherits: analyst
    permissions:
      - ccv:term:create
      - ccv:term:update
      - graph:entity:suggest

  admin:
    inherits: curator
    permissions:
      - datasource:*
      - user:*
      - permissions:*
```

**ABAC (Attribute-Based Access Control):**
```yaml
policies:
  - name: "data-classification-policy"
    effect: allow
    resources: ["graph:entity:*"]
    actions: ["read"]
    conditions:
      - attribute: "user.clearance"
        operator: ">="
        value: "resource.classification"

  - name: "data-source-restriction"
    effect: allow
    resources: ["graph:*"]
    actions: ["read", "write"]
    conditions:
      - attribute: "user.allowed_sources"
        operator: "contains"
        value: "resource.data_source"
```

### Data Source Permission Inheritance

```
┌─────────────────────────────────────────────────────────────┐
│            Data Source Permission Propagation               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Data Source (e.g., "HR Database")                         │
│      │                                                      │
│      ├── Classification: "confidential"                     │
│      ├── Allowed Roles: ["hr_analyst", "admin"]            │
│      ├── Required Attributes: { department: "HR" }         │
│      │                                                      │
│      └── Entities ingested from this source inherit:        │
│          • source_classification: "confidential"            │
│          • source_id: "hr_database"                         │
│          • source_permissions: [policies...]                │
│                                                             │
│  Query Execution:                                           │
│  1. Parse user's permissions from JWT                       │
│  2. Filter graph results by permission intersection         │
│  3. Return only authorized entities/relationships           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Query Execution Flow

```
User Query: "What are the connections between Project Alpha and the Finance team?"
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. API Gateway                                              │
│    • Validate JWT                                           │
│    • Rate limit check                                       │
│    • Route to LLM Service                                   │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. LLM Service - Intent Classification                      │
│    • Intent: "graph_query"                                  │
│    • Entities: ["Project Alpha", "Finance team"]            │
│    • Relationship: "connections"                            │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. CCV Service - Term Resolution                            │
│    • "Project Alpha" → entity_id: "proj_001"               │
│    • "Finance team" → entity_id: "dept_finance"            │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Auth Service - Permission Filter Generation              │
│    • User can see: sources [A, B, C]                       │
│    • User clearance: "internal"                            │
│    • Generate filter clause for graph query                 │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Graph Service - Query Execution                          │
│    • Execute: MATCH path = (a)-[*..3]-(b)                  │
│               WHERE a.id = 'proj_001'                       │
│               AND b.id = 'dept_finance'                     │
│               AND [permission_filters]                      │
│    • Return: paths, nodes, relationships                    │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. LLM Service - Response Generation                        │
│    • Context: graph results + CCV definitions              │
│    • Generate natural language explanation                  │
│    • Include visualization suggestions                      │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Frontend - Adaptive Display                              │
│    • Render graph visualization of paths                    │
│    • Show LLM explanation in chat                          │
│    • Highlight relevant nodes                               │
│    • Offer follow-up suggestions                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

### AWS Infrastructure

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AWS Architecture                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│  │ CloudFront  │───▶│     S3      │    │   Route53   │            │
│  │    CDN      │    │  (Static)   │    │    DNS      │            │
│  └─────────────┘    └─────────────┘    └─────────────┘            │
│         │                                     │                     │
│         │                                     │                     │
│         ▼                                     ▼                     │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │                    VPC (Multi-AZ)                        │       │
│  │  ┌─────────────────────────────────────────────────┐    │       │
│  │  │              Public Subnets                      │    │       │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │    │       │
│  │  │  │   ALB    │  │   NAT    │  │  Bastion │      │    │       │
│  │  │  │          │  │ Gateway  │  │   Host   │      │    │       │
│  │  │  └──────────┘  └──────────┘  └──────────┘      │    │       │
│  │  └─────────────────────────────────────────────────┘    │       │
│  │                         │                                │       │
│  │  ┌─────────────────────────────────────────────────┐    │       │
│  │  │             Private Subnets (App)                │    │       │
│  │  │  ┌────────────────────────────────────────┐     │    │       │
│  │  │  │              EKS Cluster                │     │    │       │
│  │  │  │  ┌────────┐ ┌────────┐ ┌────────┐     │     │    │       │
│  │  │  │  │  Auth  │ │ Graph  │ │  LLM   │     │     │    │       │
│  │  │  │  │  Svc   │ │  Svc   │ │  Svc   │     │     │    │       │
│  │  │  │  └────────┘ └────────┘ └────────┘     │     │    │       │
│  │  │  │  ┌────────┐ ┌────────┐ ┌────────┐     │     │    │       │
│  │  │  │  │  CCV   │ │Ingest  │ │Connect │     │     │    │       │
│  │  │  │  │  Svc   │ │  Svc   │ │  Svc   │     │     │    │       │
│  │  │  │  └────────┘ └────────┘ └────────┘     │     │    │       │
│  │  │  └────────────────────────────────────────┘     │    │       │
│  │  └─────────────────────────────────────────────────┘    │       │
│  │                         │                                │       │
│  │  ┌─────────────────────────────────────────────────┐    │       │
│  │  │             Private Subnets (Data)               │    │       │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │    │       │
│  │  │  │ Neptune  │ │  Aurora  │ │OpenSearch│        │    │       │
│  │  │  │ (Graph)  │ │   (PG)   │ │ (Vector) │        │    │       │
│  │  │  └──────────┘ └──────────┘ └──────────┘        │    │       │
│  │  │  ┌──────────┐ ┌──────────┐                     │    │       │
│  │  │  │Elasticache│ │   SQS   │                     │    │       │
│  │  │  │ (Redis)  │ │  Queues │                     │    │       │
│  │  │  └──────────┘ └──────────┘                     │    │       │
│  │  └─────────────────────────────────────────────────┘    │       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                     │
│  External Services:                                                 │
│  • AWS Bedrock (Claude, Cohere)                                    │
│  • AWS Secrets Manager                                              │
│  • AWS KMS (encryption)                                            │
│  • AWS CloudWatch (monitoring)                                      │
│  • AWS X-Ray (tracing)                                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Infrastructure as Code

**Tool:** AWS CDK (TypeScript)

**Rationale:**
- Type-safe infrastructure definitions
- Reusable constructs
- Native AWS integration
- Easy environment management

**Stack Structure:**
```
infrastructure/
├── bin/
│   └── app.ts                    # CDK app entry
├── lib/
│   ├── stacks/
│   │   ├── network-stack.ts      # VPC, subnets, security groups
│   │   ├── database-stack.ts     # Neptune, Aurora, OpenSearch
│   │   ├── compute-stack.ts      # EKS cluster, node groups
│   │   ├── storage-stack.ts      # S3, ElastiCache
│   │   ├── messaging-stack.ts    # SQS, EventBridge
│   │   └── monitoring-stack.ts   # CloudWatch, X-Ray
│   └── constructs/
│       ├── secure-bucket.ts      # Reusable S3 with encryption
│       ├── service-deployment.ts # EKS service template
│       └── database-cluster.ts   # RDS/Neptune templates
└── environments/
    ├── dev.ts
    ├── staging.ts
    └── prod.ts
```

### CI/CD Pipeline

**Tool:** GitHub Actions + ArgoCD

```yaml
# .github/workflows/deploy.yml
Pipeline Stages:
  1. Test & Lint
     - Unit tests (pytest, jest)
     - Integration tests
     - Linting (eslint, ruff)
     - Type checking (mypy, tsc)

  2. Security Scan
     - SAST (Semgrep)
     - Dependency scan (Snyk)
     - Container scan (Trivy)

  3. Build
     - Docker images for each service
     - Push to ECR
     - Tag with commit SHA

  4. Deploy (via ArgoCD)
     - Dev: auto-deploy on main
     - Staging: auto-deploy on release branches
     - Prod: manual approval + deploy
```

---

## Key Design Decisions

### 1. Graph Database: Neptune vs Neo4j

**Decision:** Amazon Neptune

**Rationale:**
- Managed service reduces operational burden
- Native AWS integration (IAM, VPC, CloudWatch)
- Supports both Gremlin and SPARQL
- Auto-scaling storage
- Point-in-time recovery

**Trade-offs:**
- Less powerful query language than Cypher
- Smaller community than Neo4j
- Mitigation: Abstract query layer to allow future migration

### 2. Vector Search: Dedicated vs Unified

**Decision:** OpenSearch with k-NN + pgvector in Aurora

**Rationale:**
- OpenSearch provides unified full-text + vector search
- pgvector for transactional vector operations
- Cost-effective vs dedicated vector DB
- Managed services available

**Trade-offs:**
- May need dedicated vector DB (Pinecone) at extreme scale
- Mitigation: Abstract embedding storage interface

### 3. Auth Service Language

**Decision:** Rust (Axum) with Go as fallback

**Rationale:**
- Auth is on critical path for every request
- Rust provides best latency and memory safety
- Small binary size for fast cold starts
- Go acceptable if team prefers

### 4. Monorepo vs Polyrepo

**Decision:** Monorepo with Turborepo

**Rationale:**
- Easier cross-service refactoring
- Shared types and utilities
- Atomic changes across services
- Simplified CI/CD

### 5. LLM Provider Strategy

**Decision:** Multi-provider with Bedrock primary

**Rationale:**
- AWS Bedrock keeps data in VPC (compliance)
- Access to Claude (best reasoning) + others
- Fallback to OpenAI for resilience
- Abstract via LangChain for portability

---

## Next Steps

1. **Project Setup**
   - Initialize monorepo structure
   - Configure Turborepo
   - Set up shared TypeScript/Python configs

2. **Infrastructure Foundation**
   - Create CDK project
   - Deploy network stack (VPC, subnets)
   - Set up CI/CD pipeline skeleton

3. **Auth Service MVP**
   - JWT issuance and validation
   - Basic RBAC implementation
   - Integration with Cognito

4. **Graph Service MVP**
   - Neptune connection
   - Basic CRUD operations
   - Simple query API

5. **Frontend MVP**
   - Next.js app setup
   - Basic graph visualization
   - Auth integration

---

## Questions for Stakeholder Review

1. **Identity Provider:** Preference for AWS Cognito, Okta, Auth0, or existing IdP?
2. **LLM Provider:** Any restrictions on using external LLM APIs (OpenAI, Anthropic) vs AWS Bedrock only?
3. **Data Residency:** Any compliance requirements (HIPAA, SOC2, GDPR) affecting data location?
4. **Initial Data Sources:** Which connectors are highest priority for MVP?
5. **Team Composition:** What's the team's familiarity with Rust/Go for the auth service?
6. **Budget Constraints:** Any limits affecting managed service choices?
