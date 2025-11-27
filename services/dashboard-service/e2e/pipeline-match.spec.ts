import { test, expect } from '@playwright/test';
import { setupDashboardMocks, mockLogs, mockJobs } from './mocks/api-mocks';

/**
 * E2E Test Suite: Pipeline Match
 * 
 * Tests the job matching and filtering pipeline:
 * - Job scoring display
 * - Filter criteria application
 * - Match status updates
 * - Pipeline stage transitions
 */

test.describe('Pipeline Match', () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page);
  });

  test('should display jobs with different pipeline stages', async ({ page }) => {
    await page.goto('/');
    
    // Wait for data to load
    await page.waitForTimeout(1000);
    
    // Verify we can see different statuses in the logs
    // Mock logs include 'success' and 'failure' statuses
    const successLogs = mockLogs.filter(log => log.status === 'success');
    const failureLogs = mockLogs.filter(log => log.status === 'failure');
    
    expect(successLogs.length).toBeGreaterThan(0);
    expect(failureLogs.length).toBeGreaterThan(0);
    
    // Check that both statuses are visible
    await expect(page.getByText('success').first()).toBeVisible();
    await expect(page.getByText('failure').first()).toBeVisible();
  });

  test('should show pipeline stage details in log entries', async ({ page }) => {
    await page.goto('/');
    
    // Wait for logs to load
    await page.waitForTimeout(1000);
    
    // Verify details column shows pipeline-related information
    await expect(page.getByText(/discovered/i)).toBeVisible();
    await expect(page.getByText(/tailored/i)).toBeVisible();
  });

  test('should display correct job match information', async ({ page }) => {
    await page.goto('/');
    
    // Wait for data to load
    await page.waitForTimeout(1000);
    
    // Check that job IDs from our mock data are displayed
    for (const job of mockJobs) {
      const jobIdElement = page.locator(`text=${job.job_id}`).first();
      await expect(jobIdElement).toBeVisible();
    }
  });
});

test.describe('Pipeline Match - Status Tracking', () => {
  test('should track job status through pipeline stages', async ({ page }) => {
    // Create mock logs representing different pipeline stages
    const pipelineStages = [
      { status: 'success', details: 'Job discovered and added to pipeline' },
      { status: 'success', details: 'Resume tailored successfully' },
      { status: 'failure', details: 'Application form submission timeout' },
    ];

    await page.route('**/api/logs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pipelineStages.map((stage, index) => ({
          id: index + 1,
          job_id: `job-${String(index + 1).padStart(3, '0')}`,
          platform: ['linkedin', 'glassdoor', 'wellfound'][index % 3],
          status: stage.status,
          details: stage.details,
          created_at: new Date().toISOString(),
        }))),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(1000);

    // Verify all pipeline stages are visible
    for (const stage of pipelineStages) {
      await expect(page.getByText(stage.details)).toBeVisible();
    }
  });

  test('should display job scoring results when available', async ({ page }) => {
    // Mock a log entry with scoring information
    await page.route('**/api/logs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            job_id: 'scored-job-001',
            platform: 'linkedin',
            status: 'success',
            details: 'Job scored: 87% match with profile',
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            job_id: 'scored-job-002',
            platform: 'glassdoor',
            status: 'success',
            details: 'Job scored: 92% match with profile',
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(1000);

    // Verify scoring information is displayed
    await expect(page.getByText(/87%/)).toBeVisible();
    await expect(page.getByText(/92%/)).toBeVisible();
  });

  test('should handle filtering criteria display', async ({ page }) => {
    // Mock filtered jobs log
    await page.route('**/api/logs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            job_id: 'filter-001',
            platform: 'linkedin',
            status: 'success',
            details: 'Matched: Remote, Senior level, $150k+',
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(1000);

    // Verify filter criteria are displayed
    await expect(page.getByText(/remote/i)).toBeVisible();
  });
});
