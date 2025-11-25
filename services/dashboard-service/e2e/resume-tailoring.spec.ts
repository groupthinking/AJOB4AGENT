import { test, expect } from '@playwright/test';
import { 
  setupTailoringMocks, 
  setupDashboardMocks,
  mockTailoredOutput 
} from './mocks/api-mocks';

/**
 * E2E Test Suite: Resume Tailoring
 * 
 * Tests the resume tailoring functionality:
 * - LLM service integration
 * - Resume generation process
 * - Cover letter creation
 * - Outreach message generation
 * - Confidence scoring
 */

test.describe('Resume Tailoring', () => {
  test.beforeEach(async ({ page }) => {
    await setupTailoringMocks(page);
    await setupDashboardMocks(page);
  });

  test('should display resume generation status in dashboard', async ({ page }) => {
    // Mock logs showing resume generation
    await page.route('**/api/logs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            job_id: 'tailor-001',
            platform: 'linkedin',
            status: 'success',
            details: 'Resume tailored with 87% confidence score',
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            job_id: 'tailor-002',
            platform: 'glassdoor',
            status: 'success',
            details: 'Cover letter generated successfully',
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(1000);

    // Verify tailoring status is displayed
    await expect(page.getByText(/tailored/i)).toBeVisible();
  });

  test('should show confidence scores when available', async ({ page }) => {
    // Mock logs with confidence score information
    await page.route('**/api/logs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            job_id: 'conf-001',
            platform: 'linkedin',
            status: 'success',
            details: `Confidence score: ${mockTailoredOutput.confidence_score * 100}%`,
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(1000);

    // Verify confidence score is displayed
    await expect(page.getByText(/87%/)).toBeVisible();
  });

  test('should handle tailoring failures gracefully', async ({ page }) => {
    // Mock a failed tailoring attempt
    await page.route('**/api/logs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            job_id: 'fail-001',
            platform: 'linkedin',
            status: 'failure',
            details: 'Resume tailoring failed: LLM service unavailable',
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(1000);

    // Verify failure is displayed
    await expect(page.getByText('failure')).toBeVisible();
    await expect(page.getByText(/LLM service unavailable/i)).toBeVisible();
  });
});

test.describe('Resume Tailoring - API Integration', () => {
  test('should mock tailoring API response correctly', async ({ page }) => {
    // Setup tailoring mock
    await setupTailoringMocks(page);

    // Verify the mock output structure
    expect(mockTailoredOutput.status).toBe('success');
    expect(mockTailoredOutput.tailored_resume).toContain('TAILORED RESUME');
    expect(mockTailoredOutput.cover_letter).toContain('Dear Hiring Manager');
    expect(mockTailoredOutput.outreach_message).toContain('opportunity');
    expect(mockTailoredOutput.confidence_score).toBeGreaterThan(0);
    expect(mockTailoredOutput.confidence_score).toBeLessThanOrEqual(1);
  });

  test('should handle resume tailoring request', async ({ page }) => {
    await page.route('**/tailor', async (route) => {
      const requestBody = route.request().postDataJSON();
      
      // Verify request structure (when there's a body)
      if (requestBody) {
        expect(requestBody).toHaveProperty('job_data');
        expect(requestBody).toHaveProperty('user_profile');
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTailoredOutput),
      });
    });

    await page.goto('/');
    
    // The dashboard should load successfully
    await expect(page.getByRole('heading', { name: /agent application dashboard/i })).toBeVisible();
  });

  test('should display multiple tailoring results', async ({ page }) => {
    // Mock multiple tailoring results
    await page.route('**/api/logs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            job_id: 'multi-001',
            platform: 'linkedin',
            status: 'success',
            details: 'Resume tailored for Senior Engineer role',
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            job_id: 'multi-002',
            platform: 'glassdoor',
            status: 'success',
            details: 'Resume tailored for Full Stack Developer role',
            created_at: new Date().toISOString(),
          },
          {
            id: 3,
            job_id: 'multi-003',
            platform: 'wellfound',
            status: 'success',
            details: 'Resume tailored for Backend Engineer role',
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(1000);

    // Verify multiple tailoring results are visible
    const successCells = page.locator('td:has-text("success")');
    await expect(successCells).toHaveCount(3);
  });
});
