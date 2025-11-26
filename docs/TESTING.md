# Testing Guide - AJOB4AGENT

Comprehensive testing guide for all AJOB4AGENT services.

## Table of Contents

- [Overview](#overview)
- [Testing Strategy](#testing-strategy)
- [Running Tests](#running-tests)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [End-to-End Tests](#end-to-end-tests)
- [Test Coverage](#test-coverage)
- [CI/CD Integration](#cicd-integration)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)

---

## Overview

AJOB4AGENT uses a multi-layered testing approach to ensure code quality and reliability:

| Test Type | Purpose | Tools |
|-----------|---------|-------|
| Unit Tests | Test individual functions/components | Jest, pytest |
| Integration Tests | Test service interactions | Jest, pytest |
| E2E Tests | Test full user flows | Playwright |
| API Tests | Test API endpoints | Supertest, httpx |
| Performance Tests | Test load handling | k6 |

---

## Testing Strategy

### Test Pyramid

```
                    /\
                   /  \
                  / E2E \
                 /──────\
                /        \
               /Integration\
              /────────────\
             /              \
            /   Unit Tests   \
           /──────────────────\
```

- **Unit Tests (70%)**: Fast, isolated, test single functions
- **Integration Tests (20%)**: Test service boundaries
- **E2E Tests (10%)**: Test complete user workflows

### Service-Specific Testing

| Service | Framework | Location |
|---------|-----------|----------|
| Agent Orchestrator | Jest | `services/agent-orchestrator/__tests__/` |
| Dashboard Service | Jest + Testing Library | `services/dashboard-service/__tests__/` |
| LLM Service | pytest | `services/llm-service/tests/` |
| Monitoring Service | pytest | `services/agent-monitoring-service/tests/` |

---

## Running Tests

### Quick Start

```bash
# Run all tests
make test

# Or run tests for specific service
cd services/agent-orchestrator && npm test
cd services/dashboard-service && npm test
cd services/llm-service && pytest
cd services/agent-monitoring-service && pytest
```

### With Docker

```bash
# Run all tests in containers
docker-compose -f docker-compose.test.yml up --build --exit-code-from tests

# Run specific service tests
docker-compose exec agent-orchestrator npm test
docker-compose exec llm-service pytest
```

---

## Unit Tests

### Agent Orchestrator (Jest)

```bash
cd services/agent-orchestrator

# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- --testPathPattern="job-search.test.ts"
```

**Example Unit Test:**

```typescript
// services/agent-orchestrator/__tests__/job-search.test.ts
import { PlatformManager } from '../src/adapters/platform-manager';
import { JobSearchParams } from '../src/types/job-search';

describe('PlatformManager', () => {
  let platformManager: PlatformManager;

  beforeEach(() => {
    platformManager = new PlatformManager();
  });

  describe('searchAllPlatforms', () => {
    it('should return results from multiple platforms', async () => {
      const params: JobSearchParams = {
        searchTerm: 'software engineer',
        location: 'San Francisco',
        platforms: ['linkedin', 'glassdoor']
      };

      const results = await platformManager.searchAllPlatforms(params);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle empty search term gracefully', async () => {
      const params: JobSearchParams = {
        searchTerm: '',
        location: 'San Francisco',
        platforms: ['linkedin']
      };

      await expect(platformManager.searchAllPlatforms(params))
        .rejects.toThrow('Search term is required');
    });
  });
});
```

### Dashboard Service (Jest + React Testing Library)

```bash
cd services/dashboard-service

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run component tests only
npm test -- --testPathPattern="components"
```

**Example Component Test:**

```typescript
// services/dashboard-service/__tests__/components/JobCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { JobCard } from '../../src/components/JobCard';

describe('JobCard', () => {
  const mockJob = {
    id: 'job-123',
    title: 'Software Engineer',
    company: 'Tech Corp',
    location: 'San Francisco',
    salary: '$150,000'
  };

  it('renders job information correctly', () => {
    render(<JobCard job={mockJob} />);

    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    expect(screen.getByText('San Francisco')).toBeInTheDocument();
  });

  it('calls onApply when apply button is clicked', () => {
    const onApply = jest.fn();
    render(<JobCard job={mockJob} onApply={onApply} />);

    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    expect(onApply).toHaveBeenCalledWith(mockJob.id);
  });
});
```

### LLM Service (pytest)

```bash
cd services/llm-service

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run verbose
pytest -v

# Run specific test file
pytest tests/test_tailor.py

# Run specific test
pytest tests/test_tailor.py::test_tailor_resume
```

**Example pytest Test:**

```python
# services/llm-service/tests/test_tailor.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestTailorEndpoint:
    def test_tailor_success(self):
        """Test successful resume tailoring"""
        payload = {
            "job_data": {
                "job_id": "test-123",
                "platform": "linkedin",
                "job_title": "Software Engineer",
                "company_name": "Tech Corp",
                "raw_description": "Looking for a software engineer..."
            },
            "user_profile": {
                "user_id": "user-456",
                "raw_master_resume": "Experienced engineer..."
            }
        }

        response = client.post("/tailor", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "tailored_resume" in data
        assert "confidence_score" in data

    def test_tailor_missing_job_data(self):
        """Test error handling for missing job data"""
        payload = {
            "user_profile": {
                "user_id": "user-456",
                "raw_master_resume": "Experienced engineer..."
            }
        }

        response = client.post("/tailor", json=payload)

        assert response.status_code == 422

    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")

        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
```

---

## Integration Tests

### API Integration Tests

```bash
# Run integration tests
npm run test:integration
```

**Example Integration Test:**

```typescript
// services/agent-orchestrator/__tests__/integration/api.test.ts
import request from 'supertest';
import app from '../../src/index';

describe('API Integration', () => {
  describe('POST /api/jobs/search', () => {
    it('should search for jobs across platforms', async () => {
      const response = await request(app)
        .post('/api/jobs/search')
        .send({
          searchTerm: 'software engineer',
          location: 'San Francisco',
          platforms: ['linkedin']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.results).toBeInstanceOf(Array);
    });

    it('should return 400 for invalid request', async () => {
      await request(app)
        .post('/api/jobs/search')
        .send({})
        .expect(400);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });
  });
});
```

### Database Integration Tests

```typescript
// services/agent-orchestrator/__tests__/integration/database.test.ts
import { pool } from '../../src/db';

describe('Database Integration', () => {
  beforeAll(async () => {
    // Setup test database
    await pool.query('CREATE TABLE IF NOT EXISTS test_jobs (id SERIAL PRIMARY KEY, title TEXT)');
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DROP TABLE IF EXISTS test_jobs');
    await pool.end();
  });

  it('should insert and retrieve jobs', async () => {
    await pool.query("INSERT INTO test_jobs (title) VALUES ('Test Job')");
    
    const result = await pool.query('SELECT * FROM test_jobs');
    
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].title).toBe('Test Job');
  });
});
```

---

## End-to-End Tests

### Playwright Setup

```bash
cd services/dashboard-service

# Install Playwright
npm install -D @playwright/test
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e -- --ui

# Generate report
npm run test:e2e -- --reporter=html
```

**Example Playwright Test:**

```typescript
// services/dashboard-service/e2e/job-search.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Job Search Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should search for jobs and display results', async ({ page }) => {
    // Enter search term
    await page.fill('[data-testid="search-input"]', 'software engineer');
    await page.fill('[data-testid="location-input"]', 'San Francisco');
    
    // Click search
    await page.click('[data-testid="search-button"]');
    
    // Wait for results
    await page.waitForSelector('[data-testid="job-card"]');
    
    // Verify results
    const jobCards = await page.locator('[data-testid="job-card"]').count();
    expect(jobCards).toBeGreaterThan(0);
  });

  test('should apply to a job', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="submit-login"]');

    // Navigate to job
    await page.goto('/jobs/job-123');
    
    // Click apply
    await page.click('[data-testid="apply-button"]');
    
    // Confirm application
    await page.click('[data-testid="confirm-apply"]');
    
    // Verify success
    await expect(page.locator('[data-testid="success-message"]'))
      .toContainText('Application submitted');
  });
});
```

### Playwright Configuration

```typescript
// services/dashboard-service/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Test Coverage

### Coverage Requirements

| Service | Minimum Coverage | Target Coverage |
|---------|-----------------|-----------------|
| Agent Orchestrator | 70% | 85% |
| Dashboard Service | 70% | 80% |
| LLM Service | 70% | 85% |
| Monitoring Service | 60% | 75% |

### Generating Coverage Reports

```bash
# Node.js services
npm run test:coverage

# Python services
pytest --cov=app --cov-report=html --cov-report=term-missing

# View HTML report
open coverage/lcov-report/index.html  # Node.js
open htmlcov/index.html               # Python
```

### Coverage Configuration

**Jest (Node.js):**
```json
// jest.config.js
{
  "collectCoverageFrom": [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/index.ts"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 70,
      "functions": 70,
      "lines": 70,
      "statements": 70
    }
  }
}
```

**pytest (Python):**
```ini
# pytest.ini
[pytest]
addopts = --cov=app --cov-report=term-missing --cov-fail-under=70
```

---

## CI/CD Integration

### GitHub Actions

Tests run automatically on every PR and push to main:

```yaml
# .github/workflows/ci.yml
- name: Run tests
  run: |
    npm test -- --coverage
    pytest --cov=app
```

### Pre-commit Hooks

```bash
# Install pre-commit hooks
npm install husky --save-dev
npx husky install

# Add test hook
npx husky add .husky/pre-commit "npm test"
```

---

## Writing Tests

### Test Naming Convention

```typescript
// Pattern: should_<expectedBehavior>_when_<condition>
it('should return empty array when no jobs found', () => {});
it('should throw error when api key missing', () => {});
it('should successfully tailor resume when valid data provided', () => {});
```

### Test Structure (AAA Pattern)

```typescript
it('should calculate match score correctly', () => {
  // Arrange
  const job = { title: 'Software Engineer', skills: ['Python', 'TypeScript'] };
  const resume = { skills: ['Python', 'JavaScript'] };

  // Act
  const score = calculateMatchScore(job, resume);

  // Assert
  expect(score).toBeGreaterThan(0.5);
  expect(score).toBeLessThanOrEqual(1);
});
```

### Mocking

**Jest Mocks:**
```typescript
// Mock external API
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

mockedAxios.get.mockResolvedValue({
  data: { jobs: [] }
});
```

**pytest Mocks:**
```python
from unittest.mock import patch, MagicMock

@patch('app.services.openai_client')
def test_tailor_with_mock(mock_client):
    mock_client.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content="Tailored resume..."))]
    )
    
    result = tailor_resume("job desc", "resume")
    
    assert "Tailored" in result
```

---

## Best Practices

### Do's

- ✅ Write tests before fixing bugs
- ✅ Use descriptive test names
- ✅ Test edge cases and error conditions
- ✅ Keep tests fast and isolated
- ✅ Use test fixtures for common data
- ✅ Mock external services

### Don'ts

- ❌ Don't test implementation details
- ❌ Don't write flaky tests
- ❌ Don't ignore failing tests
- ❌ Don't test multiple things in one test
- ❌ Don't rely on test execution order

### Test Data Management

```typescript
// services/agent-orchestrator/__tests__/fixtures/jobs.ts
export const mockJobs = {
  softwareEngineer: {
    id: 'job-1',
    title: 'Software Engineer',
    company: 'Tech Corp',
    location: 'San Francisco'
  },
  seniorEngineer: {
    id: 'job-2',
    title: 'Senior Software Engineer',
    company: 'Big Tech',
    location: 'Remote'
  }
};

// Usage
import { mockJobs } from '../fixtures/jobs';

it('should display job title', () => {
  render(<JobCard job={mockJobs.softwareEngineer} />);
  expect(screen.getByText('Software Engineer')).toBeInTheDocument();
});
```

---

## Troubleshooting

### Common Issues

**Tests Timing Out:**
```bash
# Increase timeout
npm test -- --testTimeout=30000
pytest --timeout=30
```

**Flaky Tests:**
```bash
# Run tests multiple times to catch flakiness
npm test -- --runInBand --detectOpenHandles
```

**Database Connection Issues:**
```bash
# Ensure test database is running
docker-compose up -d postgres

# Check connection
psql $DATABASE_URL -c "SELECT 1"
```

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [pytest Documentation](https://docs.pytest.org/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Library](https://testing-library.com/docs/)
