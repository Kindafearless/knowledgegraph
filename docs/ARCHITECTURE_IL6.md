# Knowledge Graph LLM Application - IL6/CMMC Compliant Architecture

## Compliance Overview

This architecture is designed to meet:
- **DoD IL6** (Impact Level 6) - Controlled Unclassified Information (CUI) and SECRET
- **CMMC Level 2/3** - Cybersecurity Maturity Model Certification
- **FedRAMP High** - Federal Risk and Authorization Management Program

---

## Key Compliance Constraints

| Requirement | Impact |
|-------------|--------|
| **AWS GovCloud Required** | All resources in us-gov-west-1 or us-gov-east-1 |
| **No External APIs** | LLM, search, analytics must be internal |
| **FIPS 140-2 Encryption** | All data at rest and in transit |
| **FedRAMP High Services Only** | Limited service selection |
| **Audit Logging** | CloudTrail, VPC Flow Logs mandatory |
| **Network Isolation** | Private subnets, no internet egress for data |

---

## Revised Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        AWS GovCloud (us-gov-west-1)                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         PUBLIC ZONE                                      │    │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │    │
│  │  │  CloudFront  │    │     WAF      │    │   Route 53   │              │    │
│  │  │  (FIPS mode) │    │  (DDoS/SQL)  │    │   (GovCloud) │              │    │
│  │  └──────────────┘    └──────────────┘    └──────────────┘              │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                           │
│                                      ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                           VPC (IL6 Boundary)                             │    │
│  │                                                                          │    │
│  │  ┌────────────────────────────────────────────────────────────────┐     │    │
│  │  │                    Private Subnet (App Tier)                    │     │    │
│  │  │                                                                 │     │    │
│  │  │  ┌─────────────────────────────────────────────────────────┐  │     │    │
│  │  │  │                 ECS Fargate Cluster                      │  │     │    │
│  │  │  │                                                          │  │     │    │
│  │  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │  │     │    │
│  │  │  │  │   Web    │ │   Auth   │ │  Graph   │ │   LLM    │   │  │     │    │
│  │  │  │  │ (Next.js)│ │ Service  │ │ Service  │ │ Service  │   │  │     │    │
│  │  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │  │     │    │
│  │  │  │                                                          │  │     │    │
│  │  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                │  │     │    │
│  │  │  │  │   CCV    │ │ Ingest   │ │ Connector│                │  │     │    │
│  │  │  │  │ Service  │ │ Service  │ │ Service  │                │  │     │    │
│  │  │  │  └──────────┘ └──────────┘ └──────────┘                │  │     │    │
│  │  │  │                                                          │  │     │    │
│  │  │  └─────────────────────────────────────────────────────────┘  │     │    │
│  │  │                              │                                 │     │    │
│  │  └──────────────────────────────┼─────────────────────────────────┘     │    │
│  │                                 │                                        │    │
│  │  ┌──────────────────────────────┼─────────────────────────────────┐     │    │
│  │  │                    Private Subnet (Data Tier)                   │     │    │
│  │  │                              │                                  │     │    │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │     │    │
│  │  │  │    Aurora    │  │   Neptune    │  │  OpenSearch  │         │     │    │
│  │  │  │  PostgreSQL  │  │   (Graph)    │  │  (Vectors)   │         │     │    │
│  │  │  │  (FIPS TLS)  │  │  (FIPS TLS)  │  │  (FIPS TLS)  │         │     │    │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘         │     │    │
│  │  │                                                                │     │    │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │     │    │
│  │  │  │ ElastiCache  │  │      S3      │  │     SQS      │         │     │    │
│  │  │  │   (Redis)    │  │  (SSE-KMS)   │  │  (Encrypted) │         │     │    │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘         │     │    │
│  │  │                                                                │     │    │
│  │  └────────────────────────────────────────────────────────────────┘     │    │
│  │                                                                          │    │
│  │  ┌────────────────────────────────────────────────────────────────┐     │    │
│  │  │                    Isolated Subnet (LLM Tier)                   │     │    │
│  │  │                                                                 │     │    │
│  │  │  ┌─────────────────────────────────────────────────────────┐  │     │    │
│  │  │  │              AWS Bedrock (via VPC Endpoint)              │  │     │    │
│  │  │  │                                                          │  │     │    │
│  │  │  │  • Claude 3.5 Sonnet (primary)                          │  │     │    │
│  │  │  │  • Claude 3 Haiku (fast classification)                 │  │     │    │
│  │  │  │  • Cohere Embed (embeddings)                            │  │     │    │
│  │  │  │  • Titan Embeddings (fallback)                          │  │     │    │
│  │  │  │                                                          │  │     │    │
│  │  │  └─────────────────────────────────────────────────────────┘  │     │    │
│  │  │                                                                │     │    │
│  │  │  ┌─────────────────────────────────────────────────────────┐  │     │    │
│  │  │  │         Self-Hosted LLM (Air-Gap Fallback)              │  │     │    │
│  │  │  │                                                          │  │     │    │
│  │  │  │  • Llama 3.1 70B on p4d instances (optional)            │  │     │    │
│  │  │  │  • vLLM inference server                                 │  │     │    │
│  │  │  │                                                          │  │     │    │
│  │  │  └─────────────────────────────────────────────────────────┘  │     │    │
│  │  │                                                                │     │    │
│  │  └────────────────────────────────────────────────────────────────┘     │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         Security & Compliance                            │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │    │
│  │  │  CloudTrail  │ │   Config    │ │ GuardDuty   │ │Security Hub │   │    │
│  │  │  (All APIs)  │ │  (Drift)    │ │  (Threats)  │ │ (Findings)  │   │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                    │    │
│  │  │     KMS      │ │   Secrets   │ │     IAM      │                    │    │
│  │  │ (FIPS keys)  │ │   Manager   │ │  (Policies)  │                    │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘                    │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Service Selection (GovCloud FedRAMP High)

### Compute
| Service | FedRAMP High | GovCloud | Selected |
|---------|--------------|----------|----------|
| ECS Fargate | ✅ | ✅ | **Yes** |
| ECS on EC2 | ✅ | ✅ | Fallback |
| EKS | ✅ | ✅ | Future scale |
| Lambda | ✅ | ✅ | Async tasks |
| ~~App Runner~~ | ❌ | ❌ | No |

### Database
| Service | FedRAMP High | GovCloud | Selected |
|---------|--------------|----------|----------|
| Aurora PostgreSQL | ✅ | ✅ | **Yes** |
| Neptune | ✅ | ✅ | **Yes** |
| OpenSearch | ✅ | ✅ | **Yes** |
| ElastiCache | ✅ | ✅ | **Yes** |
| DocumentDB | ✅ | ✅ | Optional |

### AI/ML
| Service | FedRAMP High | GovCloud | Selected |
|---------|--------------|----------|----------|
| Bedrock | ✅ | ✅ | **Yes** |
| SageMaker | ✅ | ✅ | Custom models |
| ~~External LLM APIs~~ | ❌ | ❌ | No |

### Security
| Service | FedRAMP High | GovCloud | Selected |
|---------|--------------|----------|----------|
| KMS (FIPS) | ✅ | ✅ | **Yes** |
| Secrets Manager | ✅ | ✅ | **Yes** |
| CloudTrail | ✅ | ✅ | **Yes** |
| GuardDuty | ✅ | ✅ | **Yes** |
| Security Hub | ✅ | ✅ | **Yes** |
| WAF | ✅ | ✅ | **Yes** |

---

## ECS Fargate Architecture (MVP)

### Service Configuration

```yaml
# Simplified ECS setup for MVP
services:
  web:
    image: ${ECR_REPO}/web:${TAG}
    cpu: 512
    memory: 1024
    port: 3000
    health_check: /api/health
    auto_scaling:
      min: 2
      max: 10
      target_cpu: 70%

  auth-service:
    image: ${ECR_REPO}/auth:${TAG}
    cpu: 256
    memory: 512
    port: 8080
    auto_scaling:
      min: 2
      max: 6

  graph-service:
    image: ${ECR_REPO}/graph:${TAG}
    cpu: 1024
    memory: 2048
    port: 8000
    auto_scaling:
      min: 2
      max: 8

  llm-service:
    image: ${ECR_REPO}/llm:${TAG}
    cpu: 1024
    memory: 4096
    port: 8000
    auto_scaling:
      min: 2
      max: 10

  ccv-service:
    image: ${ECR_REPO}/ccv:${TAG}
    cpu: 512
    memory: 1024
    port: 8000
    auto_scaling:
      min: 1
      max: 4

  ingestion-service:
    image: ${ECR_REPO}/ingestion:${TAG}
    cpu: 2048
    memory: 4096
    port: 8000
    auto_scaling:
      min: 1
      max: 4
```

### Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VPC: 10.0.0.0/16                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Public Subnets (ALB only):                                │
│  ├── 10.0.1.0/24 (us-gov-west-1a)                         │
│  └── 10.0.2.0/24 (us-gov-west-1b)                         │
│                                                             │
│  Private Subnets (ECS Tasks):                              │
│  ├── 10.0.10.0/24 (us-gov-west-1a)                        │
│  └── 10.0.11.0/24 (us-gov-west-1b)                        │
│                                                             │
│  Isolated Subnets (Databases):                             │
│  ├── 10.0.20.0/24 (us-gov-west-1a)                        │
│  └── 10.0.21.0/24 (us-gov-west-1b)                        │
│                                                             │
│  VPC Endpoints (No Internet Egress):                       │
│  ├── com.amazonaws.us-gov-west-1.ecr.api                  │
│  ├── com.amazonaws.us-gov-west-1.ecr.dkr                  │
│  ├── com.amazonaws.us-gov-west-1.s3                       │
│  ├── com.amazonaws.us-gov-west-1.logs                     │
│  ├── com.amazonaws.us-gov-west-1.secretsmanager           │
│  ├── com.amazonaws.us-gov-west-1.kms                      │
│  └── com.amazonaws.us-gov-west-1.bedrock-runtime          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## LLM Strategy for IL6

### Primary: AWS Bedrock (GovCloud)

```python
# LLM Service configuration
LLM_CONFIG = {
    "primary": {
        "provider": "bedrock",
        "region": "us-gov-west-1",
        "models": {
            "reasoning": "anthropic.claude-3-5-sonnet-20241022-v2:0",
            "fast": "anthropic.claude-3-haiku-20240307-v1:0",
            "embeddings": "cohere.embed-english-v3",
        }
    },
    "fallback": {
        "provider": "self-hosted",
        "endpoint": "http://llm-internal.service.local:8000",
        "models": {
            "reasoning": "meta-llama/Llama-3.1-70B-Instruct",
            "fast": "meta-llama/Llama-3.1-8B-Instruct",
        }
    }
}
```

### No Web Search - Alternative Approaches

Since external web search is not allowed in IL6:

1. **Curated Knowledge Base**
   - Pre-approved documentation indexed in OpenSearch
   - Wikipedia dumps (sanitized) for general knowledge
   - Domain-specific reference materials

2. **User-Initiated External Research**
   - Flag queries requiring external info
   - User researches on separate system
   - Manually imports findings

3. **Federated Search (Future)**
   - Connect to other IL6-authorized knowledge systems
   - Cross-agency data sharing agreements

---

## Data Encryption Requirements

### At Rest (FIPS 140-2)
```yaml
encryption:
  aurora:
    type: KMS
    key: aws/rds (FIPS-validated)

  neptune:
    type: KMS
    key: aws/neptune (FIPS-validated)

  opensearch:
    type: KMS
    key: alias/opensearch-key

  s3:
    type: SSE-KMS
    key: alias/s3-data-key
    bucket_policy: deny_unencrypted_uploads

  elasticache:
    type: KMS
    at_rest: true
    in_transit: true
```

### In Transit (TLS 1.2+)
```yaml
tls:
  minimum_version: "TLSv1.2"
  cipher_suites:
    - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
    - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
  certificate_authority: ACM (GovCloud)

  internal_services:
    mtls: true
    certificate_rotation: 90_days
```

---

## Audit & Compliance Logging

### CloudTrail Configuration
```yaml
cloudtrail:
  multi_region: true
  include_global_services: true
  log_file_validation: true
  encryption: KMS

  event_selectors:
    - read_write_type: All
      include_management_events: true
    - data_resources:
        - type: AWS::S3::Object
          values: ["arn:aws-us-gov:s3:::*/*"]
        - type: AWS::Lambda::Function
          values: ["arn:aws-us-gov:lambda:*:*:function:*"]
```

### Application Audit Logs
```typescript
interface AuditEvent {
  timestamp: string;          // ISO 8601
  eventId: string;            // UUID
  userId: string;
  sessionId: string;
  action: string;             // "graph.query", "entity.create", etc.
  resource: string;           // Resource ARN or ID
  resourceType: string;
  outcome: "success" | "failure" | "denied";
  sourceIp: string;
  userAgent: string;
  requestParameters: object;  // Sanitized (no PII/secrets)
  responseElements: object;   // Sanitized
  classification: string;     // Data classification accessed
}
```

---

## MVP Scope Adjustments

Given IL6 requirements, the MVP will:

### Include
- ✅ ECS Fargate deployment in GovCloud
- ✅ Aurora PostgreSQL as primary data store
- ✅ Neptune for graph (or start with PostgreSQL + Apache AGE)
- ✅ Bedrock for LLM (Claude 3.5 Sonnet)
- ✅ FIPS encryption everywhere
- ✅ CloudTrail + comprehensive audit logging
- ✅ RBAC with role-based permissions
- ✅ Basic CCV management

### Defer
- ⏸️ ABAC (attribute-based) - Phase 2
- ⏸️ Self-hosted LLM fallback - Phase 2
- ⏸️ OpenSearch vector search - Start with pgvector
- ⏸️ Advanced graph analytics - Phase 2
- ⏸️ Multiple data source connectors - Start with PostgreSQL

---

## Cost Estimate (MVP - Monthly)

| Service | Specs | Est. Cost |
|---------|-------|-----------|
| ECS Fargate | 6 services, avg 2 tasks | $400-600 |
| Aurora PostgreSQL | db.r6g.large, Multi-AZ | $500-700 |
| Neptune | db.r5.large (or defer) | $400-600 |
| OpenSearch | t3.medium.search (or pgvector) | $200-400 |
| ElastiCache | cache.t3.medium | $100-150 |
| Bedrock | ~1M tokens/day | $300-500 |
| ALB + WAF | Standard | $100-150 |
| S3 + CloudTrail | 100GB + logs | $50-100 |
| VPC Endpoints | 8 endpoints | $150-200 |
| **Total** | | **$2,200-3,400/mo** |

*Note: GovCloud pricing is typically 10-20% higher than commercial regions*

---

## Next Steps

1. **Confirm Architecture** - Review this IL6-compliant design
2. **GovCloud Access** - Ensure account provisioned
3. **Security Review** - Engage compliance team for architecture approval
4. **Begin Implementation** - Start with CDK infrastructure
