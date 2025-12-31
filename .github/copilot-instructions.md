# Copilot Instructions for AJOB4AGENT

This document provides guidance for GitHub Copilot when working on this repository.

## Project Overview

AJOB4AGENT is an autonomous job application system that automates job search, application submission, and recruiter outreach across multiple platforms. The project uses a microservices architecture with the following components:

- **Main Pipeline** (`src/`): Python-based job automation pipeline
- **Agent Orchestrator** (`services/agent-orchestrator/`): TypeScript/Node.js core coordination service
- **Dashboard Service** (`services/dashboard-service/`): Next.js frontend
- **LLM Service** (`services/llm-service/`): Python/FastAPI AI processing service
- **Monitoring Service** (`services/agent-monitoring-service/`): Python analytics service

## Technologies

- **Python 3.9+** for main pipeline and backend services
- **TypeScript/Node.js 18+** for agent orchestrator
- **Next.js** for dashboard frontend
- **FastAPI** for Python web services
- **Docker** for containerization
- **PostgreSQL** for database

## Development Guidelines

### Python Code

- Follow PEP 8 style guidelines
- Use type hints for function parameters and return values
- Place new Python modules in appropriate directories under `src/` or relevant service directory
- Use `requirements.txt` for dependency management

### TypeScript/Node.js Code

- Follow ESLint configuration in `.eslintrc.json`
- Use TypeScript with strict type checking
- Place service code in appropriate `src/` directory within each service
- Use `npm` for package management

### Testing

- For Python services: use `pytest`
- For TypeScript services: use Jest (`npm test`)
- Run tests before submitting changes

### Building and Running

- Use `make install` to install Python dependencies
- Use `make run` to run the main pipeline
- Use `make dashboard` to start the web dashboard
- For individual services, navigate to the service directory and use `npm install` and `npm run dev`
- Use `docker-compose up` for full stack deployment

## Code Style Preferences

- Keep functions focused and single-purpose
- Write descriptive variable and function names
- Add comments only when necessary to explain complex logic
- Prefer explicit imports over wildcard imports
- Handle errors gracefully with appropriate logging

## Security Considerations

- Never commit secrets or API keys
- Use environment variables for sensitive configuration
- Follow platform automation policies
- Validate all user inputs
- Use secure credential storage patterns

## Pull Request Guidelines

- Write clear, descriptive commit messages
- Include tests for new functionality
- Ensure all existing tests pass
- Update documentation if adding new features
- Keep changes focused and minimal

## MCP Servers Available

The following Model Context Protocol (MCP) servers are configured for use with this project:

- `jobspy` - Search jobs across Indeed, LinkedIn, Glassdoor, ZipRecruiter
- `openai` - GPT-4 for resume tailoring and cover letter generation
- `github` - Repository and issue management for application tracking
- `playwright` - Browser automation for form filling and application submission
- `fetch` - HTTP requests to external APIs

## MCP Usage Guidelines

When searching for jobs, use the jobspy MCP server:
```
Search for "Software Engineer" positions in "New York" across all platforms
```

When tailoring resumes, use the openai MCP server:
```
Tailor this resume for a Backend Engineer role emphasizing Python experience
```

When automating applications, use the playwright MCP server:
```
Navigate to the application page and fill out the form with the candidate's information
```

When fetching external data, use the fetch MCP server:
```
Fetch the company's job listing details from their careers API
```

### MCP Configuration

MCP server configurations are located in `mcp/mcp-config.json`. See `mcp/README.md` for detailed setup instructions.
