import { Browser, BrowserContext, Page } from 'playwright';
import { BaseJobScraper } from './BaseJobScraper';
import {
  Job,
  SearchFilters,
  LinkedInScraperConfig,
  LinkedInSearchParams,
  LINKEDIN_EXPERIENCE_LEVELS,
  LINKEDIN_DATE_POSTED,
  LINKEDIN_WORKPLACE_TYPES,
  CaptchaDetection,
  ScrapingSession,
  PaginationState,
} from './types';
import {
  createBrowser,
  createStealthContext,
  createStealthPage,
  safeNavigate,
  humanScroll,
} from './utils/browser';
import { parseJobCards, parseJobDetails, parseDate } from './utils/parser';
import { ThrottleManager } from './utils/throttle';

/**
 * LinkedIn Job Scraper using Playwright for browser automation
 */
export class LinkedInJobScraper extends BaseJobScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private throttle: ThrottleManager;
  private session: ScrapingSession;
  private linkedInConfig: LinkedInScraperConfig;

  private readonly LINKEDIN_JOBS_URL = 'https://www.linkedin.com/jobs/search';
  private readonly JOBS_PER_PAGE = 25;

  constructor(config: LinkedInScraperConfig = {}) {
    super(config);
    this.linkedInConfig = {
      headless: true,
      throttleMs: 3000,
      maxResults: 50,
      timeout: 30000,
      ...config,
    };

    this.throttle = new ThrottleManager({
      minDelayMs: Math.max(2000, this.linkedInConfig.throttleMs ?? 3000),
      maxDelayMs: (this.linkedInConfig.throttleMs ?? 3000) + 2000,
      requestsPerWindow: 25,
      windowMs: 60000,
    });

    this.session = {
      startedAt: new Date().toISOString(),
      jobsScraped: 0,
      pagesVisited: 0,
      errors: [],
      captchaEncountered: false,
    };
  }

  /**
   * Initialize browser and page
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('🚀 Initializing LinkedIn scraper...');

    this.browser = await createBrowser({
      headless: this.linkedInConfig.headless,
    });

    this.context = await createStealthContext(this.browser, {
      userAgent: this.linkedInConfig.userAgent,
    });

    // Set cookies if provided
    if (this.linkedInConfig.cookies && this.linkedInConfig.cookies.length > 0) {
      await this.context.addCookies(
        this.linkedInConfig.cookies.map((c) => ({
          name: c.name,
          value: c.value,
          domain: c.domain ?? '.linkedin.com',
          path: '/',
        }))
      );
    }

    this.page = await createStealthPage(this.context, {
      timeout: this.linkedInConfig.timeout,
    });

    this.isInitialized = true;
    console.log('✅ LinkedIn scraper initialized');
  }

  /**
   * Close browser and clean up
   */
  async close(): Promise<void> {
    console.log('🔒 Closing LinkedIn scraper...');

    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = null;
    }

    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }

    this.isInitialized = false;
    console.log('✅ LinkedIn scraper closed');
  }

  /**
   * Search for jobs on LinkedIn
   */
  async search(filters: SearchFilters): Promise<Job[]> {
    if (!this.isInitialized || !this.page) {
      await this.initialize();
    }

    console.log(
      `🔍 Searching LinkedIn for: ${filters.keywords}${
        filters.location ? ` in ${filters.location}` : ''
      }`
    );

    const jobs: Job[] = [];
    let pagination: PaginationState = {
      currentPage: 0,
      totalPages: 1,
      hasMore: true,
      startIndex: 0,
    };

    const maxResults = this.linkedInConfig.maxResults ?? 50;

    while (pagination.hasMore && jobs.length < maxResults) {
      // Apply throttling
      await this.throttle.wait();

      // Build search URL
      const searchUrl = this.buildSearchUrl(filters, pagination.startIndex);

      // Navigate to search page
      const navigated = await safeNavigate(this.page!, searchUrl);
      if (!navigated) {
        this.session.errors.push(`Failed to navigate to ${searchUrl}`);
        break;
      }

      this.session.pagesVisited++;

      // Check for captcha
      const captcha = await this.detectCaptcha();
      if (captcha.detected) {
        console.warn('⚠️ Captcha detected, stopping scrape');
        this.session.captchaEncountered = true;
        break;
      }

      // Wait for job cards to load
      await this.waitForJobCards();

      // Scroll to load more content
      await this.scrollPage();

      // Get page content and parse jobs
      const html = await this.page!.content();
      const pageJobs = parseJobCards(html);

      // Add job IDs and timestamps
      const scrapedAt = new Date().toISOString();
      for (const job of pageJobs) {
        if (jobs.length >= maxResults) break;

        // Generate ID if missing
        if (!job.id) {
          job.id = `linkedin-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 11)}`;
        }

        job.scrapedAt = scrapedAt;
        job.source = 'linkedin';

        jobs.push(job as Job);
        this.session.jobsScraped++;
      }

      // Update pagination
      if (pageJobs.length < this.JOBS_PER_PAGE || jobs.length >= maxResults) {
        pagination.hasMore = false;
      } else {
        pagination.startIndex += this.JOBS_PER_PAGE;
        pagination.currentPage++;
      }

      console.log(`📄 Page ${pagination.currentPage + 1}: Found ${pageJobs.length} jobs (total: ${jobs.length})`);
    }

    console.log(`✅ Search complete: ${jobs.length} jobs found`);
    return jobs;
  }

  /**
   * Get details for a specific job
   */
  async getJobDetails(jobId: string): Promise<Job | null> {
    if (!this.isInitialized || !this.page) {
      await this.initialize();
    }

    // Extract numeric ID from our format (linkedin-123456)
    const numericId = jobId.replace('linkedin-', '');
    const jobUrl = `https://www.linkedin.com/jobs/view/${numericId}`;

    console.log(`📋 Getting details for job: ${numericId}`);

    // Apply throttling
    await this.throttle.wait();

    // Navigate to job page
    const navigated = await safeNavigate(this.page!, jobUrl);
    if (!navigated) {
      console.warn(`Failed to navigate to job: ${jobUrl}`);
      return null;
    }

    // Check for captcha
    const captcha = await this.detectCaptcha();
    if (captcha.detected) {
      console.warn('⚠️ Captcha detected on job details page');
      return null;
    }

    // Wait for content to load
    await this.page!.waitForTimeout(2000);

    // Get page content and parse
    const html = await this.page!.content();
    const jobDetails = parseJobDetails(html);

    if (!jobDetails.title) {
      console.warn(`Could not parse job details for: ${jobId}`);
      return null;
    }

    return {
      id: jobId,
      title: jobDetails.title ?? '',
      company: jobDetails.company ?? '',
      location: jobDetails.location ?? '',
      description: jobDetails.description,
      salary: jobDetails.salary,
      postingDate: jobDetails.postingDate ?? new Date().toISOString(),
      url: jobUrl,
      tags: jobDetails.tags ?? [],
      source: 'linkedin' as const,
      scrapedAt: new Date().toISOString(),
    };
  }

  /**
   * Get source name
   */
  getSourceName(): Job['source'] {
    return 'linkedin';
  }

  /**
   * Build LinkedIn search URL from filters
   */
  private buildSearchUrl(filters: SearchFilters, startIndex = 0): string {
    const params: LinkedInSearchParams = {
      keywords: filters.keywords,
      location: filters.location,
      start: startIndex,
      sortBy: 'DD', // Sort by date
    };

    // Add remote filter
    if (filters.remote) {
      params.f_WT = LINKEDIN_WORKPLACE_TYPES.remote;
    }

    // Add seniority filter
    if (filters.seniority && LINKEDIN_EXPERIENCE_LEVELS[filters.seniority]) {
      params.f_E = LINKEDIN_EXPERIENCE_LEVELS[filters.seniority];
    }

    // Add date posted filter
    if (filters.datePosted && LINKEDIN_DATE_POSTED[filters.datePosted]) {
      params.f_TPR = LINKEDIN_DATE_POSTED[filters.datePosted];
    }

    // Build URL
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    }

    return `${this.LINKEDIN_JOBS_URL}?${queryParams.toString()}`;
  }

  /**
   * Wait for job cards to appear on page
   */
  private async waitForJobCards(): Promise<void> {
    const selectors = [
      '.jobs-search__results-list',
      '.job-search-card',
      '[data-job-id]',
      '.base-search-card',
    ];

    for (const selector of selectors) {
      try {
        await this.page!.waitForSelector(selector, { timeout: 5000 });
        return;
      } catch {
        // Try next selector
      }
    }

    // Fallback: just wait a bit
    await this.page!.waitForTimeout(3000);
  }

  /**
   * Scroll page to load more content
   */
  private async scrollPage(): Promise<void> {
    // Scroll down multiple times to trigger lazy loading
    for (let i = 0; i < 3; i++) {
      await humanScroll(this.page!, 400);
      await this.page!.waitForTimeout(500);
    }

    // Scroll back up a bit
    await this.page!.mouse.wheel(0, -200);
    await this.page!.waitForTimeout(300);
  }

  /**
   * Detect if a captcha is present on the page
   */
  private async detectCaptcha(): Promise<CaptchaDetection> {
    const captchaSelectors = [
      '#recaptcha',
      '.recaptcha',
      '[data-recaptcha]',
      '.h-captcha',
      '#hcaptcha',
      'iframe[src*="recaptcha"]',
      'iframe[src*="hcaptcha"]',
      '.captcha-challenge',
      '[id*="captcha"]',
    ];

    for (const selector of captchaSelectors) {
      const element = await this.page!.$(selector);
      if (element) {
        return {
          detected: true,
          type: selector.includes('hcaptcha') ? 'hcaptcha' : 'recaptcha',
        };
      }
    }

    // Check for LinkedIn's specific auth wall
    const authWall = await this.page!.$('.auth-wall-prompt');
    if (authWall) {
      return { detected: true, type: 'unknown' };
    }

    return { detected: false };
  }

  /**
   * Get current session information
   */
  getSession(): ScrapingSession {
    return { ...this.session };
  }

  /**
   * Get throttle status
   */
  getThrottleStatus(): ReturnType<ThrottleManager['getStatus']> {
    return this.throttle.getStatus();
  }

  /**
   * Update throttle configuration
   */
  setThrottleConfig(config: Partial<{
    minDelayMs: number;
    maxDelayMs: number;
    requestsPerWindow: number;
    windowMs: number;
  }>): void {
    this.throttle.updateConfig(config);
  }
}
