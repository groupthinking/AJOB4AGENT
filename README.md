# AJOB4AGENT

[![CI](https://github.com/groupthinking/AJOB4AGENT/actions/workflows/ci.yml/badge.svg)](https://github.com/groupthinking/AJOB4AGENT/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![Python Version](https://img.shields.io/badge/python-%3E%3D3.9-blue)](https://python.org)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://docker.com)

**Autonomous Job Application & Outreach Agent** - An intelligent, microservices-based platform that automates job search, application submission, and recruiter outreach across multiple job platforms.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Services](#-services)
- [API Endpoints](#-api-endpoints)
- [Environment Variables](#-environment-variables)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [Documentation](#-documentation)
- [License](#-license)

---

## 🎯 Overview

AJOB4AGENT automates the entire job application lifecycle:

1. **Job Discovery** - Searches across LinkedIn, Glassdoor, Wellfound, Indeed, and more
2. **AI-Powered Tailoring** - Customizes resumes and cover letters for each position
3. **Automated Applications** - Fills forms and submits applications automatically
4. **Recruiter Outreach** - Finds and contacts hiring managers with personalized messages
5. **Analytics Dashboard** - Tracks applications, responses, and success metrics

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 **Multi-Platform Search** | Search jobs across 10+ platforms simultaneously |
| 🤖 **AI Resume Tailoring** | GPT-4 powered resume optimization for each job |
| 📝 **Auto Form Fill** | Intelligent form filling with Playwright |
| 📧 **Recruiter Outreach** | Automated personalized outreach messages |
| 📊 **Analytics Dashboard** | Real-time application tracking and insights |
| 🔒 **Secure by Design** | JWT auth, encrypted data, rate limiting |
| 🐳 **Docker Ready** | Full containerized deployment support |
| 📈 **Scalable Architecture** | Microservices with message queues |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AJOB4AGENT                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐    ┌──────────────────┐    ┌─────────────┐                │
│   │  Dashboard  │◄──►│     Agent        │◄──►│    LLM      │                │
│   │  (Next.js)  │    │   Orchestrator   │    │  Service    │                │
│   │  Port 3001  │    │   (Express)      │    │  (FastAPI)  │                │
│   └─────────────┘    │   Port 8080      │    │  Port 8000  │                │
│                      └────────┬─────────┘    └─────────────┘                │
│                               │                                              │
│         ┌─────────────────────┼─────────────────────┐                       │
│         │                     │                     │                       │
│         ▼                     ▼                     ▼                       │
│   ┌───────────┐        ┌───────────┐        ┌───────────┐                   │
│   │ PostgreSQL│        │   Redis   │        │ RabbitMQ  │                   │
│   │    :5432  │        │   :6379   │        │   :5672   │                   │
│   └───────────┘        └───────────┘        └───────────┘                   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      Platform Adapters                               │   │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│   │  │ LinkedIn │ │Glassdoor │ │Wellfound │ │  Indeed  │ │  More... │  │   │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

For detailed architecture documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 🚀 Quick Start

### Prerequisites

- **Docker** & **Docker Compose** (recommended)
- **Node.js** 18+ (for local development)
- **Python** 3.9+ (for local development)

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/groupthinking/AJOB4AGENT.git
cd AJOB4AGENT

# Configure environment
cp .env.example .env
# Edit .env with your API keys and configuration

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

**Access:**
- Dashboard: http://localhost:3001
- API: http://localhost:8080
- LLM Service: http://localhost:8000/docs

### Option 2: Local Development

```bash
# Clone and configure
git clone https://github.com/groupthinking/AJOB4AGENT.git
cd AJOB4AGENT
cp .env.example .env

# Start infrastructure (database, redis, rabbitmq)
docker-compose up -d postgres redis rabbitmq

# Install and run services
# Terminal 1: Dashboard
cd services/dashboard-service && npm install && npm run dev

# Terminal 2: Orchestrator
cd services/agent-orchestrator && npm install && npm run dev

# Terminal 3: LLM Service
cd services/llm-service && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000
```

---

## 📦 Services

| Service | Port | Technology | Description |
|---------|------|------------|-------------|
| **Dashboard** | 3001 | Next.js 14, React 18 | User interface and management |
| **Agent Orchestrator** | 8080 | Express, TypeScript | Job search and application coordination |
| **LLM Service** | 8000 | FastAPI, Python | AI-powered content generation |
| **Monitoring** | 8001 | Python | System metrics and analytics |

---

## 🔌 API Endpoints

### Agent Orchestrator (Port 8080)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/search` | POST | Multi-platform job search |
| `/api/apply` | POST | Submit job application |
| `/api/jobs` | GET | List scraped jobs |
| `/api/applications` | GET | Application history |

### LLM Service (Port 8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/v1/resume/tailor` | POST | Tailor resume for job |
| `/api/v1/resume/tailor/batch` | POST | Batch processing |

### Auth Service (Port 8003)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/auth/refresh` | POST | Refresh token |
| `/api/auth/me` | GET | Current user info |

For complete API documentation, see [docs/API.md](docs/API.md).

---

## ⚙️ Environment Variables

Key environment variables (see [.env.example](.env.example) for full list):

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/jobagent
OPENAI_API_KEY=sk-...
JWT_SECRET=your-secret-key

# Platform Credentials
LINKEDIN_EMAIL=your@email.com
LINKEDIN_PASSWORD=your-password

# Services
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

---

## 🧪 Testing

```bash
# Run all tests
npm test                                    # Node.js services
pytest                                      # Python services

# Run with coverage
npm run test:coverage
pytest --cov=.

# E2E tests
npm run test:e2e

# Integration tests
docker-compose -f docker-compose.test.yml up --build
```

---

## 🚢 Deployment

### Production with Docker Compose

```bash
# Use production configuration
docker-compose -f docker-compose.prod.yml up -d
```

### Vercel (Dashboard) + Railway (Backend)

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for complete instructions.

### Monitoring

```bash
# Enable monitoring stack
docker-compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml up -d

# Access:
# - Grafana: http://localhost:3000
# - Prometheus: http://localhost:9090
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Development workflow
1. Fork the repository
2. Create feature branch: git checkout -b feature/amazing-feature
3. Make changes and test
4. Commit: git commit -m 'feat: add amazing feature'
5. Push: git push origin feature/amazing-feature
6. Open a Pull Request
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [QUICKSTART.md](QUICKSTART.md) | 5-minute getting started guide |
| [docs/API.md](docs/API.md) | Complete API documentation |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Operations and monitoring |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | Production deployment guide |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines |
| [SECURITY.md](SECURITY.md) | Security policy |

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

---

## ⚠️ Disclaimer

This tool automates legitimate job application processes. Users are responsible for:
- Complying with platform Terms of Service
- Respecting rate limits and automation policies
- Using the tool ethically and legally

---

## 🆘 Support

- 🐛 [GitHub Issues](https://github.com/groupthinking/AJOB4AGENT/issues) - Bug reports
- 💬 [Discussions](https://github.com/groupthinking/AJOB4AGENT/discussions) - Questions & ideas
- 📖 [Documentation](./docs/) - Guides and references

---

<p align="center">Built with ❤️ for job seekers everywhere</p>
