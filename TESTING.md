# Testing Documentation

![E2E Tests](https://github.com/groupthinking/AJOB4AGENT/workflows/E2E%20Tests/badge.svg)

This document describes the testing infrastructure for AJOB4AGENT, including unit tests, integration tests, and end-to-end (E2E) tests.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [E2E Tests](#e2e-tests)
- [Running Tests](#running-tests)
- [CI Integration](#ci-integration)
- [Writing Tests](#writing-tests)

## Overview

AJOB4AGENT uses a multi-layer testing strategy:

1. **Unit Tests**: Test individual functions and components in isolation
2. **Integration Tests**: Test service interactions and API endpoints
3. **E2E Tests**: Test complete user workflows using Playwright

## Test Structure

```
AJOB4AGENT/
├── tests/
│   └── integration-test.sh        # Service integration tests
├── services/
│   ├── dashboard-service/
│   │   ├── src/__tests__/         # Unit tests (Jest)
│   │   │   └── app.test.tsx
│   │   ├── e2e/                   # E2E tests (Playwright)
│   │   │   ├── mocks/
│   │   │   │   └── api-mocks.ts   # API mock handlers
│   │   │   ├── dashboard.spec.ts  # Dashboard reporting tests
│   │   │   ├── job-scrape.spec.ts # Job scrape pipeline tests
│   │   │   ├── pipeline-match.spec.ts # Pipeline matching tests
│   │   │   ├── resume-tailoring.spec.ts # Resume tailoring tests
│   │   │   └── form-fill.spec.ts  # Application form fill tests
│   │   └── playwright.config.ts   # Playwright configuration
│   └── agent-orchestrator/
│       └── src/__tests__/         # Unit tests (Jest)
│           └── app.test.ts
```

## E2E Tests

E2E tests cover the following pipeline stages:

### 1. Job Scrape Pipeline (`job-scrape.spec.ts`)
- Job search across multiple platforms
- Platform discovery and listing
- Search parameter handling
- Empty results handling
- API timeout handling

### 2. Pipeline Match (`pipeline-match.spec.ts`)
- Job scoring display
- Filter criteria application
- Status tracking through pipeline stages
- Match percentage display

### 3. Resume Tailoring (`resume-tailoring.spec.ts`)
- LLM service integration
- Resume generation status
- Cover letter creation
- Confidence score display
- Failure handling

### 4. Form Fill (`form-fill.spec.ts`)
- Application submission status
- Platform-specific flows (LinkedIn, Glassdoor, Wellfound)
- Form fill failures
- Processing stage tracking

### 5. Dashboard Reporting (`dashboard.spec.ts`)
- Application logs display
- Status indicators (success/failure)
- Table rendering
- Error state handling

## Running Tests

### Prerequisites

- Node.js 18+
- npm 9+
- Playwright browsers (installed automatically)

### Install Dependencies

```bash
# Dashboard service
cd services/dashboard-service
npm install

# Install Playwright browsers
npx playwright install chromium
```

### Run E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# View HTML report after test run
npm run test:e2e:report
```

### Run Unit Tests

```bash
# Dashboard service
cd services/dashboard-service
npm test

# Agent orchestrator
cd services/agent-orchestrator
npm test
```

### Run Integration Tests

```bash
# Run full integration test suite (requires Docker)
./tests/integration-test.sh

# Run specific test
./tests/integration-test.sh health
./tests/integration-test.sh llm
./tests/integration-test.sh orchestrator
./tests/integration-test.sh dashboard
```

## CI Integration

E2E tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main`

### GitHub Actions Workflow

The E2E test workflow (`.github/workflows/e2e-tests.yml`) includes:

1. **Setup**: Install Node.js and dependencies
2. **Browser Install**: Install Playwright Chromium browser
3. **Build**: Build the dashboard service
4. **Test**: Run all E2E tests
5. **Report**: Upload test artifacts and reports

### Test Artifacts

After each CI run, the following artifacts are available:

- **playwright-report**: HTML test report
- **test-results**: JUnit XML results

## Writing Tests

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';
import { setupDashboardMocks } from './mocks/api-mocks';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocks
    await setupDashboardMocks(page);
  });

  test('should do something', async ({ page }) => {
    await page.goto('/');
    
    // Wait for element
    await expect(page.getByRole('heading')).toBeVisible();
    
    // Verify content
    await expect(page.getByText('Expected text')).toBeVisible();
  });
});
```

### Mock API Responses

Use the mock handlers in `e2e/mocks/api-mocks.ts`:

```typescript
import { setupAllMocks } from './mocks/api-mocks';

test.beforeEach(async ({ page }) => {
  await setupAllMocks(page);
});
```

Or setup specific mocks:

```typescript
import { 
  setupDashboardMocks,
  setupJobSearchMocks,
  setupTailoringMocks,
  setupOrchestratorMocks 
} from './mocks/api-mocks';
```

### Custom Mock Data

Override default mock data for specific tests:

```typescript
test('custom scenario', async ({ page }) => {
  await page.route('**/api/logs', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        // Your custom mock data
      ]),
    });
  });
});
```

## Best Practices

1. **Use mocks for external APIs**: Ensures test reliability
2. **Test user-visible behavior**: Focus on what users see
3. **Keep tests independent**: Each test should be able to run alone
4. **Use semantic selectors**: Prefer role-based selectors over classes/IDs
5. **Handle async operations**: Use proper waiting strategies

## Troubleshooting

### Tests timing out

Increase timeout in `playwright.config.ts`:
```typescript
export default defineConfig({
  timeout: 60000, // 60 seconds
});
```

### Browser not installed

Run:
```bash
npx playwright install chromium --with-deps
```

### Port already in use

Stop any running dev servers or change the port:
```bash
E2E_BASE_URL=http://localhost:3002 npm run test:e2e
```

## Coverage

Current E2E test coverage by pipeline stage:

| Stage | Tests | Status |
|-------|-------|--------|
| Job Scrape | 7 | ✅ |
| Pipeline Match | 5 | ✅ |
| Resume Tailoring | 6 | ✅ |
| Form Fill | 9 | ✅ |
| Dashboard | 8 | ✅ |

**Total: 35 E2E tests across 5 pipeline stages**
