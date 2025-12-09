# Contributing to AJOB4AGENT

Thank you for your interest in contributing to AJOB4AGENT! This document provides guidelines and instructions for contributing to the project.

## 🌟 Ways to Contribute

There are many ways you can contribute to AJOB4AGENT:

- 🐛 **Report bugs** - Found a bug? Let us know!
- 💡 **Suggest features** - Have ideas for improvements?
- 📖 **Improve documentation** - Help make our docs better
- 🔧 **Submit code** - Fix bugs or implement features
- 🧪 **Write tests** - Help improve test coverage
- 🎨 **Improve UI/UX** - Make the dashboard more user-friendly
- 🔌 **Add platform adapters** - Support more job platforms

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- Python 3.9+ installed
- Docker and Docker Compose installed
- Git installed
- A GitHub account

### Setting Up Your Development Environment

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/AJOB4AGENT.git
   cd AJOB4AGENT
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/groupthinking/AJOB4AGENT.git
   ```

4. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Install dependencies**
   ```bash
   # Dashboard Service
   cd services/dashboard-service && npm install
   
   # Agent Orchestrator
   cd ../agent-orchestrator && npm install
   
   # LLM Service
   cd ../llm-service && pip install -r requirements.txt
   
   # Monitoring Service
   cd ../agent-monitoring-service && pip install -r requirements.txt
   ```

6. **Start development services**
   ```bash
   # Start infrastructure
   docker-compose up postgres redis rabbitmq
   
   # In separate terminals, start each service
   cd services/dashboard-service && npm run dev
   cd services/agent-orchestrator && npm run dev
   cd services/llm-service && uvicorn app.main:app --reload
   cd services/agent-monitoring-service && python app/worker.py
   ```

## 📝 Development Workflow

### Creating a Feature Branch

```bash
# Update your fork
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. **Write clear, focused commits**
   ```bash
   git add .
   git commit -m "feat: add new platform adapter for Indeed"
   ```

2. **Follow commit message conventions**
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

3. **Keep commits small and focused**
   - Each commit should do one thing
   - Write descriptive commit messages
   - Reference issues when applicable

### Running Tests

```bash
# TypeScript services
cd services/agent-orchestrator && npm test
cd services/dashboard-service && npm test

# Python services
cd services/llm-service && pytest
cd services/agent-monitoring-service && pytest

# Integration tests
./tests/integration-test.sh
```

### Code Style

#### TypeScript/JavaScript
- Follow the ESLint configuration
- Use TypeScript strict mode
- Add type annotations
- Run `npm run lint` before committing

#### Python
- Follow PEP 8 style guide
- Use type hints
- Run `black` for formatting
- Run `pylint` or `flake8` for linting

### Documentation

- Update README.md if adding new features
- Add JSDoc/docstrings for new functions
- Update API documentation if changing endpoints
- Include examples where helpful

## 🔍 Code Review Process

### Before Submitting a PR

- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] Commits are clean and well-organized
- [ ] No secrets or credentials in code
- [ ] Changes are focused and minimal

### Submitting a Pull Request

1. **Push your changes**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request**
   - Go to GitHub and create a PR from your branch
   - Use a clear, descriptive title
   - Fill out the PR template
   - Link related issues

3. **PR Description Should Include:**
   - What changes were made
   - Why the changes were necessary
   - How to test the changes
   - Screenshots (for UI changes)
   - Any breaking changes

### Review Process

- Maintainers will review your PR
- Address any feedback or requested changes
- Keep your PR updated with main branch
- Once approved, a maintainer will merge

## 🐛 Reporting Bugs

### Before Reporting

- Check if the bug has already been reported
- Verify it's actually a bug and not expected behavior
- Try to reproduce the bug consistently

### Bug Report Should Include

- Clear, descriptive title
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Node version, etc.)
- Screenshots or error messages
- Possible solutions (if you have ideas)

**Use the GitHub issue template for consistency**

## 💡 Suggesting Features

### Before Suggesting

- Check if the feature has been suggested
- Consider if it fits the project scope
- Think about the implementation approach

### Feature Request Should Include

- Clear, descriptive title
- Problem statement (what problem does it solve?)
- Proposed solution
- Alternative solutions considered
- Additional context or examples

## 🔌 Adding Platform Adapters

Want to add support for a new job platform? Great! Here's how:

### Platform Adapter Structure

```typescript
// services/platform-adapters/[platform-name]/
├── src/
│   ├── scraper.ts       // Scraping logic
│   ├── auth.ts          // Authentication
│   └── types.ts         // Type definitions
├── tests/
│   └── scraper.test.ts  // Tests
├── package.json
└── README.md
```

### Implementation Checklist

- [ ] Create adapter directory structure
- [ ] Implement scraping logic
- [ ] Add authentication (if required)
- [ ] Define data types
- [ ] Write tests
- [ ] Add documentation
- [ ] Update main README with new platform
- [ ] Respect platform's robots.txt and rate limits
- [ ] Follow platform's terms of service

## 📚 Documentation Guidelines

### Documentation Types

1. **Code Comments**
   - Explain why, not what
   - Use JSDoc/docstrings for public APIs
   - Keep comments up to date

2. **README Files**
   - Clear overview
   - Installation instructions
   - Usage examples
   - Configuration options

3. **API Documentation**
   - Endpoint descriptions
   - Request/response examples
   - Error codes
   - Authentication requirements

## ⚖️ License

By contributing to AJOB4AGENT, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes
- Project documentation

Thank you for contributing to AJOB4AGENT! 🎉

## 📞 Questions?

- 💬 [GitHub Discussions](https://github.com/groupthinking/AJOB4AGENT/discussions)
- 🐛 [GitHub Issues](https://github.com/groupthinking/AJOB4AGENT/issues)

---

**Remember:** Every contribution, no matter how small, makes a difference! 🌟
