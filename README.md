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
=======
# AJOB4AGENT - Autonomous Job Application & Outreach Agent

An intelligent, autonomous agent that automates end-to-end job search, application, resume tailoring, and recruiter outreach across multiple platforms including LinkedIn, Glassdoor, Wellfound, and more using a modular, LLM-driven system.

## 🎯 Overview

AJOB4AGENT is a comprehensive job application automation platform that:
- **Finds Jobs**: Searches across multiple job platforms automatically
- **Tailors Applications**: Uses AI to customize resumes and cover letters for each position  
- **Automates Applications**: Fills out and submits job applications automatically
- **Handles Outreach**: Finds recruiters and sends personalized messages
- **Tracks Everything**: Provides analytics and insights on your job search

## ✨ Key Features

### 🔌 Platform Adapter System
- Modular adapters for each job platform (LinkedIn, Glassdoor, Wellfound, etc.)
- Easy extension: new platforms = new adapter module
- Handles login, scraping, job matching, and application submission

### 🤖 LLM Tailoring Engine  
- Parses job descriptions and tailors resume/CV for each position
- Optimizes for keywords and requirements per job
- Supports A/B testing for optimization

### ⚡ Automated Application Engine
- Auto-fills forms using platform adapters
- Handles anti-bot/captcha where legally possible
- Logs all submissions and statuses

### 📧 Recruiter/HR Scraper & Outreach Engine
- Scrapes recruiter/contact information from job posts or company pages
- Generates personalized outreach messages (email/LinkedIn DM)
- Sends outreach and logs delivery/status

### 📊 Dashboard & Analytics
- Application/outreach tracking
- Response rate analytics and optimization feedback
- Resume/cover letter effectiveness statistics

### 🔒 Security & Compliance
- Follows platform automation policies (API where possible)
- Secure storage of user data and credentials
- Transparent opt-in for outreach

## 🏗️ Architecture

The system uses a microservices architecture with the following components:

```
+-------------------+    +--------------------+    +-------------------+
|  Dashboard        |    | Agent              |    | LLM Service       |
|  Service          |<-->| Orchestrator       |<-->|                   |
|  (Frontend)       |    | (Core Logic)       |    | (AI Processing)   |
+-------------------+    +--------------------+    +-------------------+
        |                         |                         |
        +-------------------------+-------------------------+
                                  |
                    +--------------------+
                    | Monitoring         |
                    | Service            |
                    | (Analytics)        |
                    +--------------------+
```

### Services

- **Dashboard Service** (Port 3001): Next.js frontend for user interaction
- **Agent Orchestrator** (Port 3000): Core coordination service handling job search logic
- **LLM Service**: AI-powered resume tailoring and content generation
- **Agent Monitoring Service**: Analytics and monitoring

## 🚀 Quick Start

> **⚠️ Development Status**: This project is currently under active development. Some services may require additional configuration or have build issues.

### Prerequisites

- Node.js (v18+)
- Python (3.8+)
- Docker (optional)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/groupthinking/AJOB4AGENT.git
   cd AJOB4AGENT
   ```

2. **Review the architecture**
   - See [PRD.md](PRD.md) for detailed project requirements
   - Check [architecture.mmd](architecture.mmd) for system design

3. **Explore individual services**
   ```bash
   # List available services
   ls services/
   
   # Each service has its own package.json and dependencies
   # agent-orchestrator/    - Core coordination service
   # dashboard-service/     - Next.js frontend
   # llm-service/          - AI processing service  
   # agent-monitoring-service/ - Analytics service
   ```

> **Note**: Full integration and Docker Compose setup is currently under development. Individual service setup may require additional configuration.

### Development Setup

For development, you can run services individually:

1. **Agent Orchestrator** (TypeScript/Node.js)
   ```bash
   cd services/agent-orchestrator
   npm install
   npm run dev  # Development mode with hot reload
   ```

2. **Dashboard Service** (Next.js)
   ```bash
   cd services/dashboard-service
   npm install
   npm run dev  # Development mode with hot reload
   ```

3. **LLM Service** (Python/FastAPI) - *Under Development*
   ```bash
   cd services/llm-service
   pip install -r requirements.txt
   # Service implementation in progress
   ```

4. **Agent Monitoring Service** (Python) - *Under Development*
   ```bash
   cd services/agent-monitoring-service
   pip install -r requirements.txt
   # Service implementation in progress
   ```

## 📖 User Guide

### Getting Started

1. **Upload Your Resume**: Upload your master resume and set job preferences
2. **Configure Search**: Set your target job titles, locations, and platforms
3. **Start the Agent**: The system will automatically:
   - Search for matching jobs
   - Tailor your resume for each position
   - Submit applications
   - Find and message recruiters
4. **Monitor Progress**: Track applications, responses, and analytics in the dashboard

## 📊 Project Status

This project is currently in **early development phase**:

### ✅ Completed
- 📋 **Project Planning**: Comprehensive PRD and architecture design
- 🏗️ **Architecture**: Microservices structure defined
- 🎯 **Core Services**: Service scaffolding and basic structure
- 📱 **Dashboard**: Basic Next.js frontend with monitoring UI
- 🔧 **Development Environment**: Individual service development setup

### 🚧 In Progress  
- 🔗 **Service Integration**: Connecting microservices
- 🐳 **Docker Compose**: Full containerized deployment
- 🤖 **LLM Service**: AI-powered resume tailoring implementation
- 📧 **Outreach Engine**: Automated recruiter contact system
- 🔌 **Platform Adapters**: Job site integration (LinkedIn, Glassdoor, etc.)

### 📋 Planned
- 🧪 **Testing Suite**: Comprehensive test coverage
- 📖 **Documentation**: API documentation and user guides
- 🔐 **Authentication**: User management and security
- 📈 **Analytics**: Advanced monitoring and optimization

## 🎯 MVP Scope

The current MVP includes:
- ✅ Adapters: LinkedIn, Glassdoor, Wellfound (modular for future platforms)
- ✅ Resume/CV tailoring and autofill
- ✅ Recruiter/HR scraping for outreach  
- ✅ Dashboard with basic analytics
- ✅ Email/LinkedIn messaging for outreach

## 🚧 Roadmap

### Out of Scope (v1)
- Deep anti-bot bypass for highly protected sites
- Enterprise integrations (planned for v2+)
- Bulk scraping of non-job-related data

### Future Extensibility
- Adapter interface for any new job platform
- Plug-in system for new outreach channels (Slack, WhatsApp, etc.)

## 🤝 Contributing

We welcome contributions! This project is in active development and there are many opportunities to help.

### How to Contribute

1. **🐛 Report Issues**: Found a bug? Open an issue with details and steps to reproduce
2. **💡 Suggest Features**: Have ideas for improvements? Create a feature request
3. **🔧 Fix Issues**: Browse open issues and submit pull requests
4. **📖 Improve Docs**: Help improve documentation and examples
5. **🧪 Add Tests**: Contribute test cases for existing functionality

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test your changes (if applicable)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Setup Tips

- Each service in `services/` is independent with its own dependencies
- Check individual service README files for specific setup instructions
- Use `npm run dev` for development mode with hot reload
- Review the [PRD.md](PRD.md) to understand the overall system design

## 🔧 Troubleshooting

### Common Issues

**Build Errors**
- Ensure you have the correct Node.js version (18+)
- Try deleting `node_modules` and running `npm install` again
- Check for TypeScript compilation errors in individual services

**Docker Issues**  
- Docker Compose configuration is under development
- Use individual service setup for now

**Service Communication**
- Services are designed to work together but integration is in progress
- Check individual service documentation for API endpoints

**Getting Help**
- 📖 Check the [PRD.md](PRD.md) for detailed requirements
- 🏗️ Review [architecture.mmd](architecture.mmd) for system design  
- 🐛 Open an issue on GitHub for bugs or questions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Legal Notice

This tool is designed to automate legitimate job application processes. Users are responsible for:
- Complying with platform Terms of Service
- Respecting rate limits and automation policies
- Using the tool ethically and legally
- Ensuring all outreach is professional and appropriate

## 📞 Support

- 📖 **Documentation**: Check the [PRD.md](PRD.md) for detailed requirements
- 🏗️ **Architecture**: See [architecture.mmd](architecture.mmd) for system design
- 🐛 **Issues**: Report bugs on our [GitHub Issues](https://github.com/groupthinking/AJOB4AGENT/issues)

---

**Built with ❤️ for job seekers everywhere**
# AJOB4AGENT

Welcome to AJOB4AGENT, a personalized, autonomous agent for automating your job search pipeline. This system helps you find relevant job postings, tailors your resume for each application, tracks your progress, and generates reports and interview prep materials.

## ✨ Features

- **Job Pipeline:** Ingests a list of jobs and filters them based on your configured titles, locations, and minimum compensation.
- **Role Scoring:** Scores filtered jobs against your master resume to identify the best matches.
- **AI-Powered Resume Tailoring:** Uses an LLM to generate tailored resume variants for top-scoring jobs (requires OpenAI API key).
- **CRM Logging:** Tracks all processed applications in a simple CSV-based CRM system.
- **Daily HTML Reports:** Generates a `daily_report.html` summarizing the pipeline's activity for each run.
- **HTMX Dashboard:** A lightweight, real-time web dashboard to view your application log.
- **Interview Pack Generator:** A script to create a concise interview prep document for a given company using recent news (requires OpenAI API key).
- **Guarded Features:** Email reporting, AI resume tailoring, and other features requiring secrets are disabled by default and only run if you provide the necessary keys/credentials.

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- `make` for easy command execution.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/groupthinking/AJOB4AGENT.git
    cd AJOB4AGENT
    ```

2.  **Set up your environment:**
    Copy the environment file template. This file is crucial for configuring the agent to your preferences.
    ```sh
    cp .env.prepopulated .env
    ```
    Now, edit the `.env` file with your job preferences.

3.  **Provide Optional API Keys (in `.env`):**
    - To enable AI-powered resume tailoring and the interview pack generator, add your `OPENAI_API_KEY`.
    - To enable daily email reports, fill in the `SMTP_*` variables.
    - To enable Apollo integration (future feature), add your `APOLLO_API_KEY`.

4.  **Install dependencies:**
    Use the `Makefile` to install all required Python packages.
    ```sh
    make install
    ```

## Usage

### Running the Main Pipeline

To run the entire daily job automation pipeline, from filtering to reporting, simply use:
```sh
make run
```

### Viewing the Dashboard

To start the web dashboard, run:
```sh
make dashboard
```
Then, open your web browser to `http://localhost:8000`. The dashboard will display the contents of `crm/applications.csv` and auto-refresh.

### Generating an Interview Pack

To generate a prep document for a specific company:
1.  (First time only) Add some sample news articles or text to `data/sample_articles.txt`.
2.  Run the script with the company name:
    ```sh
    python scripts/generate_interview_pack.py --company "Name of Company"
    ```
    This requires `OPENAI_API_KEY` to be set in your `.env` file. The output will be saved in the `reports/` directory.
