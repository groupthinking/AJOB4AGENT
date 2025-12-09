# AJOB4AGENT - Autonomous Job Application System

An intelligent, autonomous agent that automates job search, application submission, resume tailoring, and recruiter outreach across multiple platforms including LinkedIn, Glassdoor, Wellfound, and more.

## 🎯 Overview

AJOB4AGENT is a comprehensive job application automation platform that helps you:
- **Find Jobs**: Search across multiple job platforms automatically
- **Tailor Applications**: Use AI to customize resumes and cover letters for each position
- **Automate Applications**: Fill out and submit job applications automatically
- **Handle Outreach**: Find recruiters and send personalized messages
- **Track Everything**: Monitor applications, responses, and success metrics in real-time

## ✨ Key Features

### 🔌 Multi-Platform Integration
- **Job Scraping**: LinkedIn, Glassdoor, Wellfound, Indeed, RemoteOK, Y Combinator, WeWorkRemotely, Stack Overflow
- **Modular Adapters**: Easy extension with new platform adapters
- **Intelligent Matching**: Filters jobs based on your preferences and qualifications

### 🤖 AI-Powered Resume Tailoring
- **Smart Parsing**: Analyzes job descriptions and extracts key requirements
- **Custom Optimization**: Tailors resumes for each position with keyword matching
- **Cover Letter Generation**: Creates personalized cover letters automatically
- **A/B Testing**: Supports optimization through variant testing

### ⚡ Automated Application Workflow
- **Form Auto-Fill**: Intelligent form completion using platform adapters
- **Application Tracking**: Logs all submissions with status monitoring
- **Rate Limiting**: Respects platform limits and best practices

### 📧 Recruiter Outreach Engine
- **Contact Discovery**: Finds recruiter and HR contact information
- **Personalized Messaging**: Generates tailored outreach messages
- **Multi-Channel**: Email and LinkedIn messaging support
- **Delivery Tracking**: Monitors message delivery and responses

### 📊 Analytics Dashboard
- **Real-Time Tracking**: Application status and response monitoring
- **Success Metrics**: Response rates and conversion analytics
- **Optimization Insights**: Data-driven recommendations for improvement

### 🔒 Security & Compliance
- **Data Encryption**: Secure storage of credentials and user data
- **Platform Compliance**: Respects robots.txt, rate limits, and terms of service
- **Privacy First**: Your data never leaves your control

## 🏗️ Architecture

The system uses a microservices architecture:

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

### Core Services

1. **Dashboard Service** (`services/dashboard-service/`) - Next.js frontend for user interaction
2. **Agent Orchestrator** (`services/agent-orchestrator/`) - Core coordination service with platform agents
3. **LLM Service** (`services/llm-service/`) - AI-powered resume and content generation
4. **Monitoring Service** (`services/agent-monitoring-service/`) - Analytics and system monitoring

## 🚀 Quick Start

### Prerequisites

- **Docker** 20.10+ and **Docker Compose** 2.0+
- **Node.js** 18+ (for local development)
- **Python** 3.9+ (for local development)
- **Git** for cloning
- Minimum **4GB RAM** and **10GB disk space**

### Production Deployment

1. **Clone and Configure**
   ```bash
   git clone https://github.com/groupthinking/AJOB4AGENT.git
   cd AJOB4AGENT
   cp .env.example .env
   ```

2. **Configure Environment Variables**

   Edit `.env` with your configuration:
   ```env
   # Required - OpenAI API key for AI features
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Required - Security secrets
   JWT_SECRET=your_very_secure_jwt_secret_minimum_32_chars
   API_KEY=your_internal_api_key_here
   
   # Required - Database
   DATABASE_URL=postgresql://jobagent:password@postgres:5432/jobagent
   
   # Optional - Platform credentials (for full functionality)
   LINKEDIN_EMAIL=your_linkedin_email@example.com
   LINKEDIN_PASSWORD=your_linkedin_password
   ```

3. **Launch with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Access the Application**
   - Dashboard: http://localhost:3001
   - API Documentation: http://localhost:8080/docs
   - LLM Service: http://localhost:8000/docs
   - Monitoring: http://localhost:8001/health

### Development Setup

For local development with hot reload:

```bash
# Install dependencies for each service
cd services/dashboard-service && npm install
cd ../agent-orchestrator && npm install
cd ../llm-service && pip install -r requirements.txt
cd ../agent-monitoring-service && pip install -r requirements.txt

# Start infrastructure
docker-compose up postgres redis rabbitmq

# In separate terminals:
# Terminal 1 - Dashboard
cd services/dashboard-service && npm run dev

# Terminal 2 - Agent Orchestrator
cd services/agent-orchestrator && npm run dev

# Terminal 3 - LLM Service
cd services/llm-service && uvicorn app.main:app --reload --port 8000

# Terminal 4 - Monitoring Service
cd services/agent-monitoring-service && python app/worker.py
```

## 📖 Usage Guide

### 1. Initial Setup
- Upload your master resume
- Configure job preferences (titles, locations, salary requirements)
- Add platform credentials for automation

### 2. Configure Job Search
- Set target job titles and locations
- Define minimum compensation requirements
- Select platforms to search

### 3. Start Automation
The system will automatically:
- Search for matching jobs across all platforms
- Tailor your resume for each position
- Submit applications with customized materials
- Find and contact recruiters
- Track all activity in the dashboard

### 4. Monitor and Optimize
- View real-time application status
- Track response rates and success metrics
- Review AI-generated content
- Optimize based on analytics

## 🔧 Configuration

### Essential Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for LLM features | Yes |
| `JWT_SECRET` | Secret for JWT token generation | Yes |
| `API_KEY` | Internal service API key | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `LINKEDIN_EMAIL` | LinkedIn credentials for automation | Optional |
| `LINKEDIN_PASSWORD` | LinkedIn credentials for automation | Optional |
| `REDIS_URL` | Redis cache connection | Auto |
| `RABBITMQ_URL` | Message queue connection | Auto |

### Job Search Configuration

Configure in `.env` or dashboard:
```env
JOB_TITLES="Product Manager, AI Product, Solutions Architect"
JOB_GEOS="US-Remote, Kansas City, San Francisco"
MIN_COMPENSATION=180000
```

## 🧪 Testing

```bash
# Run all tests
docker-compose -f docker-compose.test.yml up --build

# Test individual services
cd services/agent-orchestrator && npm test
cd services/llm-service && pytest
cd services/dashboard-service && npm test

# Integration tests
./tests/integration-test.sh
```

## 📊 Monitoring & Operations

### Health Checks
```bash
# Check all services
docker-compose ps

# Individual health checks
curl http://localhost:3001/api/health  # Dashboard
curl http://localhost:8080/health      # Orchestrator
curl http://localhost:8000/health      # LLM Service
curl http://localhost:8001/health      # Monitoring

# View logs
docker-compose logs -f [service-name]
```

### Production Monitoring

Deploy with monitoring stack:
```bash
docker-compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml up -d
```

Access monitoring services:
- **Grafana**: http://localhost:3000 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093

## 🤝 Contributing

We welcome contributions! Here's how to help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** with clear commit messages
4. **Run tests** to ensure everything works
5. **Submit a Pull Request** with a clear description

### Development Guidelines
- Follow existing code style and conventions
- Add tests for new functionality
- Update documentation for user-facing changes
- Keep changes focused and minimal

## 📚 Documentation

- 📖 [Quick Start Guide](QUICKSTART.md) - Get running in 5 minutes
- 🔧 [Operations Guide](docs/OPERATIONS.md) - Production deployment
- 📚 [API Documentation](docs/api/README.md) - Complete API reference
- 🔐 [Setup Required](SETUP_REQUIRED.md) - Items needing your input

## ⚠️ Project Status

This project is in **active development**. Some features may be incomplete or require additional configuration.

### ✅ Working
- Project architecture and service structure
- Basic dashboard UI
- Core pipeline logic
- Docker containerization

### 🚧 In Progress
- Full service integration
- Platform adapter implementations
- LLM service completion
- Comprehensive testing

### 📋 Planned
- Advanced analytics
- More platform integrations
- Enterprise features
- Mobile application

## 🛡️ Legal & Compliance

### Usage Terms
This tool is designed to automate legitimate job application processes. Users are responsible for:
- Complying with platform Terms of Service
- Respecting rate limits and automation policies
- Using the tool ethically and legally
- Ensuring all outreach is professional and appropriate

### Platform Compliance
- Uses official APIs where available
- Respects robots.txt and rate limits
- Implements responsible automation practices
- Transparent about automation usage

### Data Privacy
- All user data encrypted at rest and in transit
- Credentials stored securely
- No data sharing with third parties
- User maintains full control of their data

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Community

### Getting Help
- 📖 Check [documentation](docs/)
- 🐛 [Report Issues](https://github.com/groupthinking/AJOB4AGENT/issues)
- 💬 [Join Discussions](https://github.com/groupthinking/AJOB4AGENT/discussions)
- 📧 Email: support@ajob4agent.com (for enterprise support)

### Useful Scripts
- `./scripts/setup-dev.sh` - One-click development setup
- `./scripts/deploy.sh` - Production deployment
- `./tests/integration-test.sh` - Run tests

---

**Built with ❤️ to help job seekers succeed**

*Star this repo if you find it helpful!* ⭐
