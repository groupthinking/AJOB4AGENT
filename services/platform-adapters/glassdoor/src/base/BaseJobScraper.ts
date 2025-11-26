import { Browser, Page, chromium, BrowserContext } from 'playwright';
import { Job, SearchFilters, ScraperConfig } from './types';
import * as fs from 'fs';

/**
 * Abstract base class for all job scraper implementations.
 * Provides common functionality for browser automation, rate limiting,
 * pagination, and data export.
 */
export abstract class BaseJobScraper<T extends Job = Job, F extends SearchFilters = SearchFilters> {
  /** Platform identifier (e.g., 'linkedin', 'glassdoor') */
  abstract readonly platform: string;
  
  /** Base URL for the job platform */
  abstract readonly baseUrl: string;

  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected config: ScraperConfig;
  protected lastRequestTime: number = 0;

  constructor(config: ScraperConfig = {}) {
    this.config = {
      headless: true,
      throttleMs: 2000,
      maxResults: 50,
      timeout: 30000,
      // Use a recent Chrome version for the default User-Agent, or allow override via env var
      userAgent: process.env.SCRAPER_USER_AGENT ||
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      ...config
    };
  }

  /**
   * Initialize the browser instance for scraping
   */
  async initialize(): Promise<void> {
    if (this.browser) {
      return;
    }

    this.browser = await chromium.launch({
      headless: this.config.headless
    });

    this.context = await this.browser.newContext({
      userAgent: this.config.userAgent,
      viewport: { width: 1920, height: 1080 }
    });
  }

  /**
   * Close the browser and clean up resources
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Create a new page with the browser context
   */
  protected async newPage(): Promise<Page> {
    if (!this.context) {
      await this.initialize();
    }
    return this.context!.newPage();
  }

  /**
   * Apply rate limiting between requests
   */
  protected async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const throttleMs = this.config.throttleMs || 2000;

    if (elapsed < throttleMs) {
      const delay = throttleMs - elapsed;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Hook called before parsing job list on each page.
   * Subclasses can override to add platform-specific behavior (e.g., dismissing modals).
   */
  protected async beforeParseJobList(_page: Page): Promise<void> {
    // Default implementation does nothing
  }

  /**
   * Search for jobs with the given filters
   */
  async search(filters: F): Promise<T[]> {
    await this.initialize();

    const page = await this.newPage();
    const allJobs: T[] = [];

    try {
      const searchUrl = this.buildSearchUrl(filters);
      await this.throttle();
      await page.goto(searchUrl, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      // Allow subclasses to perform platform-specific setup
      await this.beforeParseJobList(page);

      let pageNum = 1;
      const maxResults = this.config.maxResults || 50;

      while (allJobs.length < maxResults) {
        // Allow subclasses to handle modals or other interruptions before parsing
        await this.beforeParseJobList(page);
        
        const jobs = await this.parseJobList(page);
        allJobs.push(...jobs);

        if (allJobs.length >= maxResults) {
          break;
        }

        const hasMore = await this.hasNextPage(page);
        if (!hasMore) {
          break;
        }

        await this.throttle();
        await this.goToNextPage(page);
        pageNum++;
      }

      return allJobs.slice(0, maxResults);

    } finally {
      await page.close();
    }
  }

  /**
   * Export jobs to a JSON file
   */
  async exportToJson(jobs: T[], filepath: string): Promise<void> {
    const output = {
      platform: this.platform,
      exportedAt: new Date().toISOString(),
      totalJobs: jobs.length,
      jobs
    };

    fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
  }

  /**
   * Build the search URL from filters - implemented by subclasses
   */
  protected abstract buildSearchUrl(filters: F): string;

  /**
   * Parse job listings from the current page - implemented by subclasses
   */
  protected abstract parseJobList(page: Page): Promise<T[]>;

  /**
   * Check if there's a next page available - implemented by subclasses
   */
  protected abstract hasNextPage(page: Page): Promise<boolean>;

  /**
   * Navigate to the next page - implemented by subclasses
   */
  protected abstract goToNextPage(page: Page): Promise<void>;
}
