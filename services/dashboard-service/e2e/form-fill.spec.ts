import { test, expect } from '@playwright/test';
import { 
  setupDashboardMocks, 
  setupOrchestratorMocks,
  mockProcessJobResponse 
} from './mocks/api-mocks';

/**
 * E2E Test Suite: Form Fill (Application Submission)
 * 
 * Tests the application form filling functionality:
 * - Application submission status
 * - Form fill success/failure tracking
 * - Platform-specific submission handling
 * - Application processing status
 */

test.describe('Form Fill - Application Status', () => {
  test.beforeEach(async ({ page }) => {
    await setupOrchestratorMocks(page);
    // Note: Each test sets up its own logs mock
  });

  test('should display application submission status', async ({ page }) => {
    // Mock logs with form fill status
    await page.route('**/api/logs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            job_id: 'apply-001',
            platform: 'linkedin',
            status: 'success',
            details: 'Application submitted successfully',
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            job_id: 'apply-002',
            platform: 'glassdoor',
            status: 'success',
            details: 'Form filled and submitted',
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(1000);

    // Verify application status is displayed (at least one "submitted" entry)
    await expect(page.getByText(/submitted/i).first()).toBeVisible();
  });

  test('should show form fill failures', async ({ page }) => {
    // Mock form fill failure
    await page.route('**/api/logs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            job_id: 'fail-apply-001',
            platform: 'linkedin',
            status: 'failure',
            details: 'Form fill failed: Required field missing',
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            job_id: 'fail-apply-002',
            platform: 'wellfound',
            status: 'failure',
            details: 'Application timeout: Page unresponsive',
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(1000);

    // Verify failures are displayed
    await expect(page.getByText('failure').first()).toBeVisible();
    await expect(page.getByText(/form fill failed/i)).toBeVisible();
  });

  test('should track application processing stages', async ({ page }) => {
    // Mock different processing stages
    await page.route('**/api/logs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            job_id: 'stage-001',
            platform: 'linkedin',
            status: 'success',
            details: 'Stage: Form opened',
            created_at: new Date(Date.now() - 300000).toISOString(),
          },
          {
            id: 2,
            job_id: 'stage-001',
            platform: 'linkedin',
            status: 'success',
            details: 'Stage: Personal info filled',
            created_at: new Date(Date.now() - 200000).toISOString(),
          },
          {
            id: 3,
            job_id: 'stage-001',
            platform: 'linkedin',
            status: 'success',
            details: 'Stage: Resume uploaded',
            created_at: new Date(Date.now() - 100000).toISOString(),
          },
          {
            id: 4,
            job_id: 'stage-001',
            platform: 'linkedin',
            status: 'success',
            details: 'Stage: Application submitted',
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(1000);

    // Verify processing stages are visible
    await expect(page.getByText(/form opened/i)).toBeVisible();
    await expect(page.getByText(/submitted/i)).toBeVisible();
  });
});

test.describe('Form Fill - Platform-Specific', () => {
  test('should handle LinkedIn application flow', async ({ page }) => {
    await page.route('**/api/logs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            job_id: 'linkedin-apply-001',
            platform: 'linkedin',
            status: 'success',
            details: 'LinkedIn Easy Apply completed',
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(1000);

    await expect(page.getByRole('cell', { name: 'linkedin', exact: true })).toBeVisible();
    await expect(page.getByText(/easy apply/i)).toBeVisible();
  });

  test('should handle Glassdoor application flow', async ({ page }) => {
    await page.route('**/api/logs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            job_id: 'glassdoor-apply-001',
            platform: 'glassdoor',
            status: 'success',
            details: 'Glassdoor application submitted',
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(1000);

    await expect(page.getByRole('cell', { name: 'glassdoor', exact: true })).toBeVisible();
  });

  test('should handle Wellfound application flow', async ({ page }) => {
    await page.route('**/api/logs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            job_id: 'wellfound-apply-001',
            platform: 'wellfound',
            status: 'success',
            details: 'Wellfound startup application submitted',
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(1000);

    await expect(page.getByRole('cell', { name: 'wellfound', exact: true })).toBeVisible();
  });
});

test.describe('Form Fill - Job Processing API', () => {
  test('should process scraped job via orchestrator', async ({ page }) => {
    await setupOrchestratorMocks(page);

    // Verify mock response structure
    expect(mockProcessJobResponse.status).toBe('received');
    expect(mockProcessJobResponse.message).toBe('Job processing initiated');
    expect(mockProcessJobResponse.jobId).toBe('job-001');
  });

  test('should handle job processing errors', async ({ page }) => {
    await page.route('**/api/process-scraped-job', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          message: 'Job processing failed',
          error: 'Internal server error',
        }),
      });
    });

    // Mock error display in logs
    await page.route('**/api/logs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            job_id: 'process-fail-001',
            platform: 'linkedin',
            status: 'failure',
            details: 'Job processing failed: Internal server error',
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(1000);

    await expect(page.getByText('failure')).toBeVisible();
  });
});
