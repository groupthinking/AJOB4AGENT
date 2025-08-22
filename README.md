# AJOB4AGENT - Autonomous Job Application System

An intelligent, microservices-based platform that automates job search, application submission, and recruiter outreach across multiple job platforms including LinkedIn, Glassdoor, and Wellfound.

## 🚀 Features

- **Multi-Platform Job Scraping**: Automated job discovery across LinkedIn, Glassdoor, Wellfound
- **AI-Powered Resume Tailoring**: Dynamic resume and cover letter optimization using LLM
- **Automated Application Submission**: Intelligent form-filling and application submission
- **Recruiter Outreach**: Automated personalized outreach to hiring managers and recruiters
- **Analytics Dashboard**: Real-time tracking of applications, responses, and success metrics
- **Scalable Microservices**: Docker-based architecture with independent service scaling

## 🏗️ Architecture

The system consists of four main microservices:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Dashboard      │    │  Agent          │    │  LLM Service    │
│  (Next.js)      │◄──►│  Orchestrator   │◄──►│  (FastAPI)      │
│  Port: 3001     │    │  (Node.js/TS)   │    │  Port: 8000     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  Monitoring     │
                       │  Service        │
                       │  (Python)       │
                       └─────────────────┘
```

### Services

1. **Dashboard Service** (`/services/dashboard-service/`) - Next.js frontend for user interaction
2. **Agent Orchestrator** (`/services/agent-orchestrator/`) - Core orchestration service with platform agents
3. **LLM Service** (`/services/llm-service/`) - AI-powered resume and content generation
4. **Monitoring Service** (`/services/agent-monitoring-service/`) - System monitoring and metrics

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.9+ (for local development)

### Production Deployment

1. **Clone and Setup**
```bash
git clone https://github.com/groupthinking/AJOB4AGENT.git
cd AJOB4AGENT
cp .env.example .env
```

2. **Configure Environment Variables**
Edit `.env` with your configuration:
```env
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/jobagent

# LLM Configuration
OPENAI_API_KEY=your_openai_api_key
LLM_MODEL=gpt-4

# Platform Credentials (for agents)
LINKEDIN_EMAIL=your_linkedin_email
LINKEDIN_PASSWORD=your_linkedin_password

# Security
JWT_SECRET=your_jwt_secret
API_KEY=your_api_key
```

3. **Launch with Docker Compose**
```bash
docker-compose up -d
```

4. **Access the Application**
- Dashboard: http://localhost:3001
- API Documentation: http://localhost:8080/docs (Agent Orchestrator)
- LLM Service: http://localhost:8000/docs

### Development Setup

1. **Install Dependencies**
```bash
# Dashboard Service
cd services/dashboard-service
npm install

# Agent Orchestrator
cd ../agent-orchestrator
npm install

# LLM Service
cd ../llm-service
pip install -r requirements.txt

# Monitoring Service
cd ../agent-monitoring-service  
pip install -r requirements.txt
```

2. **Run Services Locally**
```bash
# Terminal 1 - Dashboard
cd services/dashboard-service && npm run dev

# Terminal 2 - Agent Orchestrator  
cd services/agent-orchestrator && npm run dev

# Terminal 3 - LLM Service
cd services/llm-service && uvicorn app.main:app --reload --port 8000

# Terminal 4 - Monitoring
cd services/agent-monitoring-service && python app/worker.py
```

## 📋 Usage

### 1. Setup Your Profile
- Upload your master resume
- Set job preferences (locations, roles, salary range)
- Configure platform credentials

### 2. Start Job Search
- The system automatically discovers relevant jobs
- AI tailors your resume and cover letter for each position
- Applications are submitted automatically

### 3. Monitor Progress
- Track application status in real-time
- View recruiter outreach results
- Analyze success metrics and optimize approach

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `OPENAI_API_KEY` | OpenAI API key for LLM service | - |
| `LLM_MODEL` | Model to use for content generation | gpt-4 |
| `LINKEDIN_EMAIL` | LinkedIn automation credentials | - |
| `LINKEDIN_PASSWORD` | LinkedIn automation credentials | - |
| `JWT_SECRET` | Secret for JWT token generation | - |
| `API_KEY` | Internal service API key | - |
| `RABBITMQ_URL` | Message queue connection | amqp://guest:guest@rabbitmq:5672 |
| `REDIS_URL` | Redis cache connection | redis://redis:6379 |

### Platform Agents

Each platform has a dedicated agent:
- **LinkedIn Agent**: Job scraping and application submission
- **Glassdoor Agent**: Company research and application tracking
- **Wellfound Agent**: Startup job discovery and outreach

## 🛡️ Security & Compliance

- **Data Encryption**: All sensitive data encrypted at rest and in transit
- **Platform Compliance**: Respects robots.txt and rate limits
- **Authentication**: JWT-based authentication with secure sessions
- **Privacy**: User data never shared with third parties

## 🧪 Testing

```bash
# Run all tests
docker-compose -f docker-compose.test.yml up --build

# Individual service tests
cd services/agent-orchestrator && npm test
cd services/llm-service && pytest
```

## 📊 Monitoring

- **Health Checks**: All services expose `/health` endpoints with detailed status
- **Metrics**: Prometheus metrics available at `/metrics` endpoints
- **Logging**: Centralized structured JSON logging with request tracing
- **Alerts**: Configurable alerts for failed applications and system issues

### Production Monitoring Stack

Deploy comprehensive monitoring for production:

```bash
# Start with monitoring stack
docker-compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml up -d

# Access monitoring services
# Grafana: http://localhost:3000 (admin/admin123)  
# Prometheus: http://localhost:9090
# AlertManager: http://localhost:9093
```

**Monitoring Features:**
- Real-time application metrics and system monitoring
- Custom Grafana dashboards for job processing analytics
- Automated alerting via Slack, email, or webhooks
- Performance tracking and capacity planning
- Error rate and success rate monitoring

### Basic Monitoring Commands

```bash
# Check service status
docker-compose ps

# View logs  
docker-compose logs -f [service-name]

# Resource usage
docker stats

# Run health checks
./tests/integration-test.sh health

# View application metrics
curl http://localhost:8001/metrics
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is designed to assist in job searching and should be used in compliance with platform terms of service. Users are responsible for ensuring their usage complies with applicable laws and platform policies.

## 🆘 Support

### Documentation
- 📖 [Quick Start Guide](QUICKSTART.md) - Get up and running in 5 minutes
- 🔧 [Operations Guide](docs/OPERATIONS.md) - Production deployment and monitoring
- 📚 [API Documentation](docs/api/README.md) - Complete API reference with examples
- 🔧 [Development Setup](scripts/setup-dev.sh) - Automated development environment setup

### Community & Support
- 🐛 [Report Issues](https://github.com/groupthinking/AJOB4AGENT/issues)
- 💬 [Discussions](https://github.com/groupthinking/AJOB4AGENT/discussions)
- 📧 Email: support@ajob4agent.com (for enterprise support)

### Scripts & Tools
- `./scripts/setup-dev.sh` - One-click development setup
- `./scripts/deploy.sh` - Production deployment with health checks  
- `./tests/integration-test.sh` - Comprehensive testing suite