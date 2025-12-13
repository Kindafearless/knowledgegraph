# Architecture Decision Points

## Summary of Proposed Architecture

I've designed a scalable, security-first knowledge graph application. Here are the key decisions that need your input:

---

## Technology Choices

### Frontend
| Choice | Recommendation | Alternatives |
|--------|----------------|--------------|
| Framework | **Next.js 14** | Remix, SvelteKit |
| Graph Visualization | **React Flow + D3.js** | Cytoscape.js, vis.js, Sigma.js |
| State Management | **Zustand + TanStack Query** | Redux, Jotai |

### Backend Services
| Service | Recommendation | Alternatives |
|---------|----------------|--------------|
| Auth Service | **Rust (Axum)** | Go, Node.js |
| Graph/LLM/CCV Services | **Python (FastAPI)** | Node.js, Go |
| Message Processing | **Go** | Python, Rust |

### Data Stores
| Purpose | Recommendation | Alternatives |
|---------|----------------|--------------|
| Graph Database | **Amazon Neptune** | Neo4j (self-hosted), TigerGraph |
| Vector Search | **OpenSearch + pgvector** | Pinecone, Weaviate, Qdrant |
| Relational | **Aurora PostgreSQL** | RDS PostgreSQL |
| Cache | **ElastiCache (Redis)** | Memcached |

### LLM Strategy
| Use Case | Recommendation |
|----------|----------------|
| Primary LLM | **Claude via AWS Bedrock** (keeps data in VPC) |
| Embeddings | **Cohere Embed via Bedrock** |
| Web Search | **Tavily API** |
| Fallback | **OpenAI API** |

### Infrastructure
| Aspect | Recommendation |
|--------|----------------|
| Container Orchestration | **EKS (Kubernetes)** |
| IaC Tool | **AWS CDK (TypeScript)** |
| CI/CD | **GitHub Actions + ArgoCD** |
| Secrets | **AWS Secrets Manager** |

---

## Questions Requiring Your Input

### 1. Identity Provider
Which IdP should we integrate with?
- [ ] AWS Cognito (simplest AWS integration)
- [ ] Okta (enterprise standard)
- [ ] Auth0 (developer-friendly)
- [ ] Existing corporate IdP (specify)

### 2. LLM Provider Restrictions
Are there constraints on LLM API usage?
- [ ] AWS Bedrock only (data stays in VPC)
- [ ] External APIs allowed (OpenAI, Anthropic direct)
- [ ] On-premise models required (Llama, Mistral)

### 3. Compliance Requirements
Which compliance frameworks apply?
- [ ] SOC 2
- [ ] HIPAA
- [ ] GDPR
- [ ] FedRAMP
- [ ] None specific

### 4. Priority Data Connectors
Which data sources are highest priority for MVP?
- [ ] PostgreSQL
- [ ] MySQL
- [ ] SQL Server
- [ ] MongoDB
- [ ] REST APIs
- [ ] S3/Data Lake
- [ ] Other: _______

### 5. Team Skills
What's the team's comfort level with:
- Rust: [ ] High [ ] Medium [ ] Low [ ] None
- Go: [ ] High [ ] Medium [ ] Low [ ] None
- Python: [ ] High [ ] Medium [ ] Low [ ] None
- TypeScript: [ ] High [ ] Medium [ ] Low [ ] None
- Kubernetes: [ ] High [ ] Medium [ ] Low [ ] None

### 6. Budget Sensitivity
Are there budget constraints affecting:
- [ ] Managed services (Neptune, OpenSearch) vs self-hosted
- [ ] LLM API costs (may affect model choice)
- [ ] Multi-AZ/Multi-region requirements

---

## Proposed Project Structure

```
knowledgegraph/
├── apps/
│   ├── web/                    # Next.js frontend
│   ├── auth-service/           # Rust auth microservice
│   ├── graph-service/          # Python graph operations
│   ├── llm-service/            # Python LLM orchestration
│   ├── ccv-service/            # Python vocabulary management
│   ├── ingestion-service/      # Python data ingestion
│   └── connector-service/      # Go data connectors
├── packages/
│   ├── ui/                     # Shared React components
│   ├── graph-viz/              # Graph visualization library
│   ├── auth-client/            # Auth SDK for services
│   ├── types/                  # Shared TypeScript types
│   └── python-common/          # Shared Python utilities
├── infrastructure/
│   ├── cdk/                    # AWS CDK stacks
│   ├── kubernetes/             # K8s manifests (ArgoCD)
│   └── docker/                 # Dockerfiles
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── DEPLOYMENT.md
├── scripts/                    # Development & deployment scripts
├── turbo.json                  # Turborepo config
├── package.json                # Root package.json
└── README.md
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- Project structure setup
- Auth service with basic RBAC
- CDK infrastructure skeleton
- CI/CD pipeline

### Phase 2: Core Graph (Weeks 3-4)
- Neptune setup and graph service
- Basic entity/relationship CRUD
- Simple frontend with graph viz
- CCV service foundation

### Phase 3: LLM Integration (Weeks 5-6)
- LLM service with RAG pipeline
- Natural language query interface
- Chat UI integration
- Web search augmentation

### Phase 4: Data Ingestion (Weeks 7-8)
- Connector framework
- First 2-3 data source connectors
- Entity extraction pipeline
- Relationship discovery ML

### Phase 5: Polish & Scale (Weeks 9-10)
- ABAC implementation
- Performance optimization
- Advanced visualizations
- Production hardening

---

## Ready to Proceed?

Once you've reviewed and answered the questions above, I can:

1. **Set up the complete project structure** with all boilerplate
2. **Create the CDK infrastructure** with your AWS preferences
3. **Build the auth service** with your IdP choice
4. **Implement the frontend foundation** with graph visualization

Let me know your preferences and I'll start building!
