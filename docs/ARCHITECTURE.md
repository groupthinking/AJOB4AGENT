# System Architecture - AJOB4AGENT

Comprehensive architecture documentation for the AJOB4AGENT autonomous job application system.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Service Components](#service-components)
- [Data Flow](#data-flow)
- [Database Schema](#database-schema)
- [Communication Patterns](#communication-patterns)
- [Security Architecture](#security-architecture)
- [Deployment Architecture](#deployment-architecture)
- [Scalability](#scalability)

---

## Overview

AJOB4AGENT is a microservices-based platform designed to automate job search, application submission, and recruiter outreach. The system uses AI-powered content generation and multi-platform adapters to provide end-to-end job application automation.

### Design Principles

- **Microservices Architecture:** Independent, loosely-coupled services
- **Event-Driven:** Asynchronous processing with message queues
- **API-First:** RESTful APIs with OpenAPI documentation
- **Security-First:** JWT authentication, encrypted data, secure defaults
- **Observability:** Comprehensive logging, metrics, and tracing

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AJOB4AGENT System                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                           Client Layer                                  │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │ │
│  │  │  Web App     │  │  Mobile App  │  │  API Clients │                  │ │
│  │  │  (Next.js)   │  │  (Future)    │  │  (REST/SDK)  │                  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        API Gateway / Load Balancer                      │ │
│  │                    (Nginx / Vercel Edge / AWS ALB)                      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│           ┌────────────────────────┼────────────────────────┐               │
│           │                        │                        │               │
│           ▼                        ▼                        ▼               │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   Dashboard     │    │     Agent       │    │   LLM Service   │         │
│  │   Service       │    │   Orchestrator  │    │   (FastAPI)     │         │
│  │   (Next.js)     │    │   (Express)     │    │                 │         │
│  │   Port: 3001    │    │   Port: 8080    │    │   Port: 8000    │         │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘         │
│           │                      │                      │                   │
│           └──────────────────────┼──────────────────────┘                   │
│                                  │                                          │
│                                  ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         Data & Messaging Layer                          │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │ │
│  │  │  PostgreSQL  │  │    Redis     │  │  RabbitMQ    │                  │ │
│  │  │  (Primary)   │  │   (Cache)    │  │   (Queue)    │                  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        Monitoring & Observability                       │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │ │
│  │  │  Prometheus  │  │   Grafana    │  │   Sentry     │                  │ │
│  │  │  (Metrics)   │  │ (Dashboards) │  │  (Errors)    │                  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           Agent Orchestrator                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Platform Adapters                             │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │ LinkedIn │ │Glassdoor │ │ Wellfound│ │ Indeed   │ │  More... │  │   │
│  │  │ Adapter  │ │ Adapter  │ │ Adapter  │ │ Adapter  │ │ Adapters │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Core Services                                 │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ Job Search   │  │ Application  │  │ Outreach     │               │   │
│  │  │ Service      │  │ Service      │  │ Service      │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Apply Agents                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ Form Fill    │  │ Resume       │  │ Cover Letter │               │   │
│  │  │ Engine       │  │ Handler      │  │ Generator    │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Service Components

### 1. Dashboard Service

**Technology:** Next.js 14, React 18, TailwindCSS, TypeScript

**Responsibilities:**
- User interface for application management
- Authentication and session management
- Real-time job tracking and analytics
- Settings and configuration management

**Key Features:**
```
┌─────────────────────────────────────────┐
│           Dashboard Service              │
├─────────────────────────────────────────┤
│  • User Authentication (NextAuth)        │
│  • Job Application Tracking              │
│  • Analytics & Reporting                 │
│  • Resume Management                     │
│  • Settings Configuration                │
│  • Real-time Updates (WebSocket)         │
└─────────────────────────────────────────┘
```

### 2. Agent Orchestrator

**Technology:** Node.js, Express, TypeScript, Playwright

**Responsibilities:**
- Central coordination of all agents
- Job search across multiple platforms
- Application submission orchestration
- Recruiter outreach coordination
- Platform adapter management

**API Endpoints:**
- `POST /api/jobs/search` - Multi-platform job search
- `POST /api/apply` - Submit job application
- `GET /api/jobs` - List discovered jobs
- `GET /api/applications` - Application history
- `GET /health` - Health check

### 3. LLM Service

**Technology:** Python, FastAPI, OpenAI API

**Responsibilities:**
- AI-powered resume tailoring
- Cover letter generation
- Outreach message personalization
- Job description analysis
- Confidence scoring

**API Endpoints:**
- `POST /tailor` - Tailor resume for job
- `POST /tailor/batch` - Batch processing
- `GET /health` - Health check

### 4. Agent Monitoring Service

**Technology:** Python, FastAPI

**Responsibilities:**
- System metrics collection
- Application analytics
- Performance monitoring
- Alert management
- Log aggregation

---

## Data Flow

### Job Search Flow

```
┌──────────┐     ┌───────────────┐     ┌────────────────┐     ┌──────────┐
│  User    │────►│  Dashboard    │────►│  Orchestrator  │────►│ Platform │
│          │     │  Service      │     │                │     │ Adapters │
└──────────┘     └───────────────┘     └────────────────┘     └──────────┘
                                              │                     │
                                              │◄────────────────────┘
                                              │   (Job listings)
                                              │
                                              ▼
                                       ┌────────────┐
                                       │  Database  │
                                       │ (Jobs)     │
                                       └────────────┘
```

### Application Flow

```
┌──────────┐     ┌───────────────┐     ┌────────────────┐     ┌───────────┐
│  User    │────►│  Orchestrator │────►│  LLM Service   │────►│  Tailor   │
│ (Apply)  │     │  (Apply Job)  │     │  (Process)     │     │  Content  │
└──────────┘     └───────────────┘     └────────────────┘     └───────────┘
                        │                      │
                        │                      │
                        ▼                      ▼
                 ┌────────────┐         ┌────────────┐
                 │  RabbitMQ  │         │  Response  │
                 │  (Queue)   │         │  (Resume)  │
                 └────────────┘         └────────────┘
                        │
                        ▼
                 ┌────────────────┐     ┌───────────┐
                 │  Apply Agent   │────►│  Platform │
                 │  (Form Fill)   │     │  Submit   │
                 └────────────────┘     └───────────┘
```

### Message Queue Architecture

```
                    ┌─────────────────────────────────────┐
                    │            RabbitMQ                  │
                    ├─────────────────────────────────────┤
                    │                                      │
                    │  ┌─────────────────────────────────┐│
                    │  │      Job Discovery Queue         ││
                    │  │  (new jobs from platforms)       ││
                    │  └─────────────────────────────────┘│
                    │                                      │
                    │  ┌─────────────────────────────────┐│
                    │  │    Application Queue             ││
                    │  │  (pending applications)          ││
                    │  └─────────────────────────────────┘│
                    │                                      │
                    │  ┌─────────────────────────────────┐│
                    │  │      Outreach Queue              ││
                    │  │  (recruiter messages)            ││
                    │  └─────────────────────────────────┘│
                    │                                      │
                    │  ┌─────────────────────────────────┐│
                    │  │      Status Update Queue         ││
                    │  │  (application status changes)    ││
                    │  └─────────────────────────────────┘│
                    │                                      │
                    └─────────────────────────────────────┘
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     Users       │       │      Jobs       │       │  Applications   │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │──┐    │ id (PK)         │
│ email           │  │    │ external_id     │  │    │ user_id (FK)    │───┐
│ password_hash   │  │    │ platform        │  │    │ job_id (FK)     │───┼─┐
│ name            │  │    │ title           │  │    │ status          │   │ │
│ created_at      │  │    │ company         │  │    │ applied_at      │   │ │
│ updated_at      │  │    │ description     │  └────│ tailored_resume │   │ │
└─────────────────┘  │    │ location        │       │ cover_letter    │   │ │
                     │    │ salary_range    │       │ created_at      │   │ │
                     │    │ url             │       └─────────────────┘   │ │
                     │    │ created_at      │                             │ │
                     │    └─────────────────┘                             │ │
                     │                                                    │ │
                     │    ┌─────────────────┐       ┌─────────────────┐  │ │
                     │    │    Resumes      │       │    Outreach     │  │ │
                     │    ├─────────────────┤       ├─────────────────┤  │ │
                     └────│ id (PK)         │       │ id (PK)         │  │ │
                          │ user_id (FK)    │       │ application_id  │──┘ │
                          │ content         │       │ recruiter_name  │    │
                          │ is_master       │       │ recruiter_email │    │
                          │ created_at      │       │ message         │    │
                          └─────────────────┘       │ sent_at         │    │
                                                    │ response        │    │
                                                    └─────────────────┘    │
                                                                           │
                     ┌─────────────────┐                                   │
                     │  UserPreferences│                                   │
                     ├─────────────────┤                                   │
                     │ id (PK)         │                                   │
                     │ user_id (FK)    │───────────────────────────────────┘
                     │ target_titles   │
                     │ target_locations│
                     │ salary_min      │
                     │ remote_ok       │
                     │ platforms       │
                     └─────────────────┘
```

### Key Tables

#### Users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Jobs
```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    description TEXT,
    location VARCHAR(255),
    salary_range VARCHAR(100),
    url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(external_id, platform)
);
```

#### Applications
```sql
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    job_id UUID REFERENCES jobs(id),
    status VARCHAR(50) DEFAULT 'pending',
    tailored_resume TEXT,
    cover_letter TEXT,
    applied_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Communication Patterns

### Synchronous (REST API)

```
Client ──────► API Gateway ──────► Service ──────► Response
                                      │
                                      ▼
                                   Database
```

Used for:
- User authentication
- Real-time queries
- Configuration updates
- Health checks

### Asynchronous (Message Queue)

```
Producer ──────► RabbitMQ ──────► Consumer ──────► Action
                   │
                   └──────► Retry Queue (on failure)
```

Used for:
- Job application processing
- Resume tailoring (batch)
- Outreach message delivery
- Status update notifications

### Event-Driven

```
Service A ──────► Event Bus ──────► Service B
                     │
                     └──────► Service C
                     │
                     └──────► Service D (Monitoring)
```

Events:
- `job.discovered` - New job found
- `application.submitted` - Application sent
- `outreach.sent` - Message delivered
- `status.updated` - Application status changed

---

## Security Architecture

### Authentication Flow

```
┌──────────┐     ┌───────────────┐     ┌────────────────┐
│  Client  │────►│  Auth Service │────►│    Database    │
│          │     │  (NextAuth)   │     │    (Users)     │
└──────────┘     └───────────────┘     └────────────────┘
     │                  │
     │                  ▼
     │           ┌────────────┐
     │           │  JWT Token │
     │           └────────────┘
     │                  │
     ▼                  ▼
┌──────────────────────────────────────┐
│          Protected Resources          │
│  ┌────────────┐  ┌────────────┐      │
│  │ API Routes │  │ Dashboard  │      │
│  └────────────┘  └────────────┘      │
└──────────────────────────────────────┘
```

### Security Layers

```
┌─────────────────────────────────────────────────────┐
│                    Security Layers                   │
├─────────────────────────────────────────────────────┤
│  Layer 1: Network Security                          │
│  • WAF (Web Application Firewall)                   │
│  • DDoS Protection                                  │
│  • SSL/TLS Encryption                               │
├─────────────────────────────────────────────────────┤
│  Layer 2: Application Security                      │
│  • JWT Authentication                               │
│  • Rate Limiting                                    │
│  • Input Validation                                 │
│  • CORS Configuration                               │
├─────────────────────────────────────────────────────┤
│  Layer 3: Data Security                             │
│  • Encryption at Rest (AES-256)                     │
│  • Encryption in Transit (TLS 1.3)                  │
│  • Secure Secrets Management                        │
├─────────────────────────────────────────────────────┤
│  Layer 4: Infrastructure Security                   │
│  • Container Isolation                              │
│  • Network Segmentation                             │
│  • Least Privilege Access                           │
└─────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

### Cloud Deployment (AWS)

```
┌─────────────────────────────────────────────────────────────────────┐
│                           AWS Cloud                                  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                         VPC                                    │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │                    Public Subnet                         │  │  │
│  │  │  ┌──────────────┐  ┌──────────────┐                     │  │  │
│  │  │  │     ALB      │  │  CloudFront  │                     │  │  │
│  │  │  │  (API/LB)    │  │    (CDN)     │                     │  │  │
│  │  │  └──────────────┘  └──────────────┘                     │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                              │                                 │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │                   Private Subnet                         │  │  │
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │  │
│  │  │  │  ECS Task  │  │  ECS Task  │  │  ECS Task  │         │  │  │
│  │  │  │ Dashboard  │  │ Orchestrat │  │    LLM     │         │  │  │
│  │  │  └────────────┘  └────────────┘  └────────────┘         │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                              │                                 │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │                    Data Subnet                           │  │  │
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │  │
│  │  │  │    RDS     │  │ElastiCache │  │  Amazon    │         │  │  │
│  │  │  │ PostgreSQL │  │   Redis    │  │    MQ      │         │  │  │
│  │  │  └────────────┘  └────────────┘  └────────────┘         │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Container Orchestration

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Container Orchestration (ECS/K8s)                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Service Mesh                              │    │
│  │  ┌───────────────────────────────────────────────────────┐  │    │
│  │  │ Service Discovery │ Load Balancing │ Health Checks    │  │    │
│  │  └───────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │  Dashboard  │  │ Orchestrator│  │ LLM Service │  │ Monitoring │ │
│  │  Replicas:2 │  │  Replicas:3 │  │  Replicas:2 │  │ Replicas:1 │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Scalability

### Horizontal Scaling

```
                    ┌─────────────────────────────────────┐
                    │           Load Balancer              │
                    └─────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
       ┌────────────┐          ┌────────────┐          ┌────────────┐
       │ Instance 1 │          │ Instance 2 │          │ Instance 3 │
       │ (Primary)  │          │ (Replica)  │          │ (Replica)  │
       └────────────┘          └────────────┘          └────────────┘
```

### Auto-Scaling Triggers

| Metric | Scale Up | Scale Down |
|--------|----------|------------|
| CPU | > 70% | < 30% |
| Memory | > 80% | < 40% |
| Queue Depth | > 100 | < 10 |
| Response Time | > 2s | < 500ms |

### Database Scaling

```
┌────────────────────────────────────────────────────────────┐
│                    Database Cluster                         │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │   Primary (RW)   │───►│   Replica (RO)   │              │
│  │   PostgreSQL     │    │   PostgreSQL     │              │
│  └──────────────────┘    └──────────────────┘              │
│            │                      │                         │
│            └──────────────────────┘                         │
│                    │                                        │
│                    ▼                                        │
│           ┌────────────────┐                               │
│           │ Connection Pool│                               │
│           │  (PgBouncer)   │                               │
│           └────────────────┘                               │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Caching Strategy

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────►│   CDN    │────►│   App    │
└──────────┘     └──────────┘     └──────────┘
                                       │
                                       ▼
                               ┌──────────────┐
                               │    Redis     │
                               │   (Cache)    │
                               └──────────────┘
                                       │
                                       ▼
                               ┌──────────────┐
                               │  PostgreSQL  │
                               │  (Database)  │
                               └──────────────┘
```

**Cache Layers:**
1. **CDN** - Static assets, API responses
2. **Application** - Session data, user preferences
3. **Database** - Query results, computed data

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14, React 18, TailwindCSS | User interface |
| API Gateway | Nginx, Vercel Edge | Load balancing, SSL |
| Backend | Node.js, Express, TypeScript | Business logic |
| AI Service | Python, FastAPI, OpenAI | Content generation |
| Database | PostgreSQL 15 | Primary data store |
| Cache | Redis 7 | Session, caching |
| Queue | RabbitMQ | Async processing |
| Monitoring | Prometheus, Grafana, Sentry | Observability |
| Container | Docker, ECS/Kubernetes | Deployment |
| CI/CD | GitHub Actions | Automation |

---

## Further Reading

- [API Documentation](./API.md)
- [Operations Guide](./OPERATIONS.md)
- [Deployment Checklist](../DEPLOYMENT_CHECKLIST.md)
- [Security Policy](../SECURITY.md)
