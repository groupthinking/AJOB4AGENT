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