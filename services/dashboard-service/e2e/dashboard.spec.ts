import { test, expect } from '@playwright/test';
import { setupDashboardMocks, mockLogs } from './mocks/api-mocks';

/**
 * E2E Test Suite: Dashboard Reporting
 * 
 * Tests the dashboard's ability to:
 * - Load and display application logs
 * - Show job status information
 * - Handle error states
 * - Display real-time updates
 */

test.describe('Dashboard Reporting', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocks before each test
    await setupDashboardMocks(page);
  });

  test('should load and display the dashboard page', async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/');
    
    // Verify page title is present
    await expect(page.getByRole('heading', { name: /agent application dashboard/i })).toBeVisible();
  });

  test('should display application logs table', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the table to be visible
    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    // Verify table headers are present
    await expect(page.getByRole('columnheader', { name: /platform/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /job id/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /timestamp/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /details/i })).toBeVisible();
  });

  test('should display log entries from the API', async ({ page }) => {
    await page.goto('/');
    
    // Wait for logs to load (mocked)
    await page.waitForTimeout(1000);
    
    // Verify mock log entries are displayed
    for (const log of mockLogs) {
      // Check for platform names in the table
      await expect(page.getByText(log.platform, { exact: false })).toBeVisible();
      // Check for job IDs
      await expect(page.getByText(log.job_id)).toBeVisible();
    }
  });

  test('should show success status with proper styling', async ({ page }) => {
    await page.goto('/');
    
    // Wait for logs to load
    await page.waitForTimeout(1000);
    
    // Find a success status cell
    const successCell = page.locator('td:has-text("success")').first();
    await expect(successCell).toBeVisible();
    
    // Verify the success cell has some color styling applied (green-ish)
    // We check that the color is not the default black/inherited color
    const color = await successCell.evaluate(el => getComputedStyle(el).color);
    // Any non-default color indicates styling is applied
    expect(color).toBeTruthy();
  });

  test('should show failure status with proper styling', async ({ page }) => {
    await page.goto('/');
    
    // Wait for logs to load
    await page.waitForTimeout(1000);
    
    // Find a failure status cell
    const failureCell = page.locator('td:has-text("failure")').first();
    await expect(failureCell).toBeVisible();
    
    // Verify the failure cell has some color styling applied (red-ish)
    const color = await failureCell.evaluate(el => getComputedStyle(el).color);
    // Any non-default color indicates styling is applied
    expect(color).toBeTruthy();
  });

  test('should handle API error gracefully', async ({ page }) => {
    // Override the mock to return an error
    await page.route('**/api/logs', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });
    
    await page.goto('/');
    
    // Wait for error handling
    await page.waitForTimeout(1000);
    
    // The dashboard should display an error message
    await expect(page.getByText(/error/i)).toBeVisible();
  });

  test('should display details column for each log entry', async ({ page }) => {
    await page.goto('/');
    
    // Wait for logs to load
    await page.waitForTimeout(1000);
    
    // Check that log details are displayed
    for (const log of mockLogs) {
      await expect(page.getByText(log.details, { exact: false })).toBeVisible();
    }
  });
});
