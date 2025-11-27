import { Page } from '@playwright/test';

/**
 * Mock API responses for E2E tests.
 * These mocks simulate external service responses for reliable testing.
 */

export interface MockJob {
  id: string;
  job_id: string;
  platform: string;
  job_url: string;
  job_title: string;
  company_name: string;
  location: string;
  status: string;
  created_at: string;
}

export interface MockLogEntry {
  id: number;
  job_id: string;
  platform: string;
  status: 'success' | 'failure';
  details: string;
  created_at: string;
}

export interface MockTailoredOutput {
  job_id: string;
  status: string;
  tailored_resume: string;
  cover_letter: string;
  outreach_message: string;
  confidence_score: number;
}

// Sample mock data for testing
export const mockJobs: MockJob[] = [
  {
    id: 'job-001',
    job_id: 'job-001',
    platform: 'linkedin',
    job_url: 'https://linkedin.com/jobs/view/123456',
    job_title: 'Senior Software Engineer',
    company_name: 'TechCorp Inc',
    location: 'San Francisco, CA',
    status: 'discovered',
    created_at: new Date().toISOString(),
  },
  {
    id: 'job-002',
    job_id: 'job-002',
    platform: 'glassdoor',
    job_url: 'https://glassdoor.com/job/123456',
    job_title: 'Full Stack Developer',
    company_name: 'StartupXYZ',
    location: 'Remote',
    status: 'scored',
    created_at: new Date().toISOString(),
  },
  {
    id: 'job-003',
    job_id: 'job-003',
    platform: 'wellfound',
    job_url: 'https://wellfound.com/job/123456',
    job_title: 'Backend Engineer',
    company_name: 'InnovateTech',
    location: 'New York, NY',
    status: 'resume_generated',
    created_at: new Date().toISOString(),
  },
];

export const mockLogs: MockLogEntry[] = [
  {
    id: 1,
    job_id: 'job-001',
    platform: 'linkedin',
    status: 'success',
    details: 'Job discovered and added to pipeline',
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    job_id: 'job-002',
    platform: 'glassdoor',
    status: 'success',
    details: 'Resume tailored successfully',
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    job_id: 'job-003',
    platform: 'wellfound',
    status: 'failure',
    details: 'Application form submission timeout',
    created_at: new Date().toISOString(),
  },
];

export const mockTailoredOutput: MockTailoredOutput = {
  job_id: 'job-001',
  status: 'success',
  tailored_resume: 'TAILORED RESUME for Senior Software Engineer at TechCorp Inc.\n\nGenerated with AI optimization.',
  cover_letter: 'Dear Hiring Manager,\n\nI am excited to apply for the Senior Software Engineer position.',
  outreach_message: 'Hi Hiring Team,\n\nI noticed the opportunity and would love to discuss further.',
  confidence_score: 0.87,
};

export const mockSearchResults = {
  success: true,
  totalJobs: 15,
  platforms: 3,
  searchParams: {
    searchTerm: 'software engineer',
    location: 'San Francisco, CA',
    platforms: ['linkedin', 'glassdoor', 'wellfound'],
  },
  results: [
    {
      platform: 'linkedin',
      jobs: mockJobs.filter(j => j.platform === 'linkedin'),
      totalCount: 5,
    },
    {
      platform: 'glassdoor',
      jobs: mockJobs.filter(j => j.platform === 'glassdoor'),
      totalCount: 5,
    },
    {
      platform: 'wellfound',
      jobs: mockJobs.filter(j => j.platform === 'wellfound'),
      totalCount: 5,
    },
  ],
  timestamp: new Date().toISOString(),
};

export const mockHealthResponse = {
  status: 'healthy',
  service: 'llm-service',
  version: '1.0.0',
  timestamp: Date.now(),
};

export const mockOrchestratorHealth = {
  status: 'healthy',
  service: 'agent-orchestrator',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  uptime: 3600,
};

export const mockProcessJobResponse = {
  status: 'received',
  message: 'Job processing initiated',
  jobId: 'job-001',
};

/**
 * Setup mock API routes for the dashboard page.
 * Intercepts API calls and returns mock data.
 */
export async function setupDashboardMocks(page: Page): Promise<void> {
  // Mock the monitoring service logs API
  await page.route('**/api/logs', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockLogs),
    });
  });
}

/**
 * Setup mock API routes for job search functionality.
 */
export async function setupJobSearchMocks(page: Page): Promise<void> {
  // Mock the job search API
  await page.route('**/api/jobs/search', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSearchResults),
    });
  });

  // Mock platform list API
  await page.route('**/api/jobs/platforms', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        platforms: ['linkedin', 'glassdoor', 'wellfound', 'indeed', 'ziprecruiter'],
        count: 5,
      }),
    });
  });
}

/**
 * Setup mock API routes for the LLM/tailoring service.
 */
export async function setupTailoringMocks(page: Page): Promise<void> {
  // Mock the tailor endpoint
  await page.route('**/tailor', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockTailoredOutput),
    });
  });

  // Mock LLM health check
  await page.route('**/llm-service/**/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockHealthResponse),
    });
  });
}

/**
 * Setup mock API routes for the orchestrator service.
 */
export async function setupOrchestratorMocks(page: Page): Promise<void> {
  // Mock orchestrator health
  await page.route('**/agent-orchestrator/**/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockOrchestratorHealth),
    });
  });

  // Mock process job endpoint
  await page.route('**/api/process-scraped-job', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockProcessJobResponse),
    });
  });
}

/**
 * Setup all mock API routes for comprehensive E2E testing.
 */
export async function setupAllMocks(page: Page): Promise<void> {
  await setupDashboardMocks(page);
  await setupJobSearchMocks(page);
  await setupTailoringMocks(page);
  await setupOrchestratorMocks(page);
}
