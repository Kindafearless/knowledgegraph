# Knowledge Graph LLM Application

An interactive knowledge graph application with LLM-powered natural language interface, designed for IL6/CMMC compliance and AWS GovCloud deployment.

## Features

- **Interactive Graph Visualization**: Explore entities and relationships with an intuitive visual interface
- **Natural Language Queries**: Ask questions in plain English, powered by Claude via AWS Bedrock
- **Multi-Source Data Ingestion**: Connect to PostgreSQL and other data sources
- **Intelligent Relationship Discovery**: ML-powered entity extraction and relationship suggestion
- **Canonical Control Vocabulary (CCV)**: Auto-generated and user-curated ontology management
- **Enterprise Security**: RBAC + ABAC with data-source-level permissions
- **IL6/CMMC Compliant**: FedRAMP High authorized services, FIPS 140-2 encryption

## Architecture

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
│  │  + Apache AGE (graph) + pgvector (embeddings)       │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│                              ▼                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              AWS Bedrock (Claude 3.5 Sonnet)         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
knowledgegraph/
├── apps/
│   ├── web/                    # Next.js frontend
│   ├── auth-service/           # Go auth service (Cognito + RBAC/ABAC)
│   ├── graph-service/          # Python graph operations
│   └── llm-service/            # Python LLM/RAG service
├── packages/
│   ├── ui/                     # Shared React components
│   └── types/                  # Shared TypeScript types
├── infrastructure/
│   └── cdk/                    # AWS CDK stacks
├── docs/                       # Architecture documentation
└── .github/workflows/          # CI/CD pipelines
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14, React Flow, TailwindCSS |
| Auth Service | Go, Gin, AWS Cognito |
| Graph Service | Python, FastAPI, NetworkX |
| LLM Service | Python, FastAPI, AWS Bedrock |
| Database | Aurora PostgreSQL + pgvector |
| Infrastructure | AWS CDK, ECS Fargate |
| CI/CD | GitHub Actions |

## Getting Started

### Prerequisites

- Node.js 20+
- Go 1.22+
- Python 3.11+
- Docker
- AWS CLI configured for GovCloud

### Local Development

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/your-org/knowledgegraph.git
   cd knowledgegraph
   pnpm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start development servers**
   ```bash
   # Start all services
   pnpm dev

   # Or start individually
   cd apps/web && pnpm dev
   cd apps/auth-service && go run main.go
   cd apps/graph-service && uvicorn src.main:app --reload
   cd apps/llm-service && uvicorn src.main:app --reload
   ```

### Deployment

1. **Deploy infrastructure**
   ```bash
   cd infrastructure/cdk
   npm install
   npx cdk deploy --context environment=dev --all
   ```

2. **Deploy application**
   ```bash
   # Via GitHub Actions (recommended)
   # Push to main branch or use workflow dispatch

   # Or manually
   ./scripts/deploy.sh dev
   ```

## Security

- **Authentication**: AWS Cognito with MFA support
- **Authorization**: Role-Based (RBAC) + Attribute-Based (ABAC) access control
- **Encryption**: FIPS 140-2 compliant encryption at rest and in transit
- **Audit**: Comprehensive CloudTrail and application-level audit logging
- **Network**: VPC with private subnets, no public internet egress for data

## Compliance

This application is designed to meet:
- **DoD IL6** (Impact Level 6)
- **CMMC Level 2/3**
- **FedRAMP High**

See [docs/ARCHITECTURE_IL6.md](docs/ARCHITECTURE_IL6.md) for compliance details.

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [IL6 Compliance Architecture](docs/ARCHITECTURE_IL6.md)
- [Decision Points](docs/DECISION_POINTS.md)

## License

Proprietary - All rights reserved
