# Contributing to AJOB4AGENT

Thank you for your interest in contributing to AJOB4AGENT! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style Guide](#code-style-guide)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Commit Message Format](#commit-message-format)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

---

## Code of Conduct

By participating in this project, you agree to maintain a welcoming, inclusive, and harassment-free environment. Please:

- Be respectful and considerate in all interactions
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Accept responsibility for mistakes and learn from them

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (for TypeScript/JavaScript services)
- **Python** 3.9+ (for Python services)
- **Docker** and **Docker Compose** (for containerized development)
- **Git** for version control

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/AJOB4AGENT.git
   cd AJOB4AGENT
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/groupthinking/AJOB4AGENT.git
   ```

---

## Development Setup

### Quick Setup

```bash
# Copy environment configuration
cp .env.example .env

# Install dependencies for all services
make install

# Start development environment
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Manual Setup

#### Dashboard Service (Next.js)
```bash
cd services/dashboard-service
npm install
npm run dev
# Accessible at http://localhost:3001
```

#### Agent Orchestrator (Node.js/TypeScript)
```bash
cd services/agent-orchestrator
npm install
npm run dev
# Accessible at http://localhost:8080
```

#### LLM Service (Python/FastAPI)
```bash
cd services/llm-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# Accessible at http://localhost:8000
```

#### Agent Monitoring Service (Python)
```bash
cd services/agent-monitoring-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app/worker.py
# Accessible at http://localhost:8001
```

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables for development:
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - For LLM service testing
- `JWT_SECRET` - Any secure random string

---

## Code Style Guide

### TypeScript/JavaScript

We use ESLint and Prettier for code formatting.

```bash
# Run linter
npm run lint

# Auto-fix issues
npm run lint:fix
```

**Style Guidelines:**
- Use TypeScript for type safety
- Prefer `const` over `let`
- Use async/await over callbacks
- Use meaningful variable names
- Add JSDoc comments for public APIs

```typescript
// ✅ Good
async function fetchUserApplications(userId: string): Promise<Application[]> {
  const applications = await db.applications.findMany({
    where: { userId },
  });
  return applications;
}

// ❌ Bad
async function getApps(id) {
  return await db.applications.findMany({ where: { userId: id } });
}
```

### Python

We use Black for formatting and Flake8 for linting.

```bash
# Format code
black .

# Run linter
flake8 .
```

**Style Guidelines:**
- Follow PEP 8
- Use type hints
- Add docstrings for functions and classes
- Use meaningful variable names

```python
# ✅ Good
def tailor_resume(job_description: str, resume: str) -> TailoredResume:
    """
    Tailor a resume to match a job description.
    
    Args:
        job_description: The job posting text
        resume: The original resume content
        
    Returns:
        TailoredResume object with optimized content
    """
    # Implementation
    pass

# ❌ Bad
def tailor(jd, r):
    pass
```

### File Structure

```
services/
├── service-name/
│   ├── src/                 # Source code
│   │   ├── api/             # API routes
│   │   ├── models/          # Data models
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utilities
│   │   └── index.ts         # Entry point
│   ├── tests/               # Test files
│   ├── Dockerfile           # Container configuration
│   └── package.json         # Dependencies
```

---

## Pull Request Process

### Before Submitting

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Keep your branch up to date:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

3. **Run tests:**
   ```bash
   npm test            # For Node.js services
   pytest              # For Python services
   ```

4. **Run linters:**
   ```bash
   npm run lint
   flake8 .
   ```

5. **Build successfully:**
   ```bash
   npm run build
   ```

### Submitting a PR

1. Push your branch:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Create a Pull Request on GitHub

3. Fill out the PR template:
   - Description of changes
   - Related issue(s)
   - Testing done
   - Screenshots (if UI changes)

### PR Requirements

- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] Documentation updated (if needed)
- [ ] No merge conflicts
- [ ] Reviewed by at least one maintainer

### Review Process

1. Automated checks run (CI pipeline)
2. Code review by maintainers
3. Address feedback and make changes
4. Approval and merge

---

## Issue Guidelines

### Reporting Bugs

Use the bug report template and include:

1. **Description:** Clear description of the bug
2. **Steps to Reproduce:**
   ```
   1. Go to '...'
   2. Click on '...'
   3. See error
   ```
3. **Expected Behavior:** What should happen
4. **Actual Behavior:** What actually happens
5. **Environment:**
   - OS and version
   - Node.js/Python version
   - Browser (if applicable)
6. **Screenshots/Logs:** If applicable

### Feature Requests

Use the feature request template and include:

1. **Problem Statement:** What problem does this solve?
2. **Proposed Solution:** How should it work?
3. **Alternatives Considered:** Other approaches you've thought of
4. **Additional Context:** Any other information

### Issue Labels

| Label | Description |
|-------|-------------|
| `bug` | Something isn't working |
| `enhancement` | New feature or request |
| `documentation` | Documentation improvements |
| `good first issue` | Good for newcomers |
| `help wanted` | Extra attention needed |
| `priority: high` | Urgent issues |
| `priority: low` | Can wait |

---

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (formatting, etc.) |
| `refactor` | Code refactoring |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |
| `perf` | Performance improvements |

### Examples

```bash
# Feature
feat(llm-service): add resume tailoring endpoint

# Bug fix
fix(orchestrator): resolve race condition in job processing

# Documentation
docs(readme): update installation instructions

# With body and footer
feat(dashboard): add job application tracking

- Add new ApplicationList component
- Implement filtering by status
- Add pagination support

Closes #123
```

---

## Testing Guidelines

### Test Structure

```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── e2e/           # End-to-end tests
```

### Writing Tests

**Unit Tests:**
```typescript
describe('ResumeService', () => {
  describe('tailorResume', () => {
    it('should tailor resume for job description', async () => {
      const result = await resumeService.tailorResume({
        jobDescription: 'Senior Engineer...',
        resume: 'My experience...',
      });
      
      expect(result.tailoredContent).toContain('Senior');
      expect(result.confidenceScore).toBeGreaterThan(0.5);
    });
    
    it('should throw error for empty job description', async () => {
      await expect(
        resumeService.tailorResume({ jobDescription: '', resume: 'test' })
      ).rejects.toThrow('Job description is required');
    });
  });
});
```

**Integration Tests:**
```typescript
describe('Job Search API', () => {
  it('POST /api/jobs/search should return jobs', async () => {
    const response = await request(app)
      .post('/api/jobs/search')
      .send({
        searchTerm: 'software engineer',
        location: 'San Francisco',
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.results).toBeInstanceOf(Array);
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test.spec.ts

# Watch mode
npm run test:watch
```

### Coverage Requirements

- Minimum overall coverage: 70%
- New code should have 80%+ coverage
- Critical paths (auth, payments) should have 90%+ coverage

---

## Documentation

### Code Documentation

- Add JSDoc/docstrings to public APIs
- Include examples for complex functions
- Document edge cases and error conditions

### Project Documentation

When updating features, also update:
- README.md (if user-facing changes)
- docs/API.md (if API changes)
- docs/ARCHITECTURE.md (if architecture changes)

### Documentation Style

- Use clear, concise language
- Include code examples
- Add diagrams for complex flows
- Keep examples up to date

---

## Questions?

- 💬 [GitHub Discussions](https://github.com/groupthinking/AJOB4AGENT/discussions)
- 🐛 [GitHub Issues](https://github.com/groupthinking/AJOB4AGENT/issues)
- 📖 [Documentation](./docs/)

Thank you for contributing to AJOB4AGENT! 🚀
