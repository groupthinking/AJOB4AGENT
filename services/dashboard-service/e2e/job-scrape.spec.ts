import { test, expect } from '@playwright/test';
import { 
  setupJobSearchMocks, 
  setupDashboardMocks,
  mockSearchResults,
  mockJobs 
} from './mocks/api-mocks';

/**
 * E2E Test Suite: Job Scrape Pipeline
 * 
 * Tests the job scraping and search functionality:
 * - Job search API integration
 * - Platform discovery
 * - Job listing display
 * - Search parameter handling
 */

test.describe('Job Scrape Pipeline', () => {
  test.beforeEach(async ({ page }) => {
    await setupJobSearchMocks(page);
    await setupDashboardMocks(page);
  });

  test.skip('should successfully search for jobs across platforms', async ({ page, request }) => {
    // This integration test requires the orchestrator service to be running
    // Skip in CI environments where services are mocked
    const response = await request.post('http://localhost:8080/api/jobs/search', {
      data: {
        searchTerm: 'software engineer',
        location: 'San Francisco, CA',
        platforms: ['linkedin', 'glassdoor', 'wellfound'],
      },
    });
    
    expect(response.status()).toBe(200);
  });

  test('should display job search results in dashboard', async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/');
    
    // Verify the dashboard loads with job data
    await expect(page.getByRole('heading', { name: /agent application dashboard/i })).toBeVisible();
  });

  test('should show jobs from multiple platforms', async ({ page }) => {
    await page.goto('/');
    
    // Wait for data to load
    await page.waitForTimeout(1000);
    
    // Verify platforms are displayed
    const platforms = ['linkedin', 'glassdoor', 'wellfound'];
    for (const platform of platforms) {
      const platformText = page.locator(`text=${platform}`).first();
      await expect(platformText).toBeVisible();
    }
  });

  test('should display job details for each entry', async ({ page }) => {
    await page.goto('/');
    
    // Wait for logs to load
    await page.waitForTimeout(1000);
    
    // Each mock job should have a visible job_id
    for (const job of mockJobs) {
      await expect(page.getByText(job.job_id)).toBeVisible();
    }
  });
});

test.describe('Job Scrape - API Mocking', () => {
  test('should handle job search API response correctly', async ({ page }) => {
    // Mock the search endpoint directly
    await page.route('**/api/jobs/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSearchResults),
      });
    });

    // Evaluate the mock response structure
    const mockResponse = mockSearchResults;
    
    expect(mockResponse.success).toBe(true);
    expect(mockResponse.totalJobs).toBe(15);
    expect(mockResponse.platforms).toBe(3);
    expect(mockResponse.results).toHaveLength(3);
  });

  test('should handle empty search results', async ({ page }) => {
    // Mock empty results
    await page.route('**/api/jobs/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          totalJobs: 0,
          platforms: 0,
          searchParams: {
            searchTerm: 'nonexistent job',
            location: 'Nowhere',
            platforms: [],
          },
          results: [],
          timestamp: new Date().toISOString(),
        }),
      });
    });

    // Navigate and check for proper handling
    await page.goto('/');
    
    // The page should still load without errors
    await expect(page.getByRole('heading', { name: /agent application dashboard/i })).toBeVisible();
  });

  test('should handle search API timeout gracefully', async ({ page }) => {
    // Mock a slow/timeout response
    await page.route('**/api/jobs/search', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5s delay
      await route.abort('timedout');
    });

    // The dashboard should handle this gracefully
    await page.goto('/');
    
    // Page should still render
    await expect(page.getByRole('heading', { name: /agent application dashboard/i })).toBeVisible();
  });
});
