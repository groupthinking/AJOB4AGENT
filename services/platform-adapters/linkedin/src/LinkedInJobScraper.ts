/**
 * LinkedIn Job Scraper Adapter
 * 
 * A robust LinkedIn job scraper using Playwright headless browser automation.
 * Implements ethical scraping practices with rate limiting and human-like behavior.
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import {
  LinkedInSearchParams,
  JobResult,
  JobSearchResponse,
  ScraperConfig,
  RateLimitStatus,
  PlatformAdapter,
  LinkedInJobMetadata
} from './types';

/**
 * Default scraper configuration
 * Note: The userAgent should be updated periodically to match current browser versions
 * to avoid detection. Consider using environment variables for production.
 */
const DEFAULT_CONFIG: Required<ScraperConfig> = {
  headless: true,
  timeout: 30000,
  minDelay: 2000,
  maxDelay: 5000,
  maxRequestsPerMinute: 20,
  // Default user agent - update regularly or configure via ScraperConfig.userAgent
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  proxyUrl: '',
  debug: false
};

/**
 * LinkedIn Job Scraper using Playwright headless browser automation
 * 
 * Features:
 * - Headless browser automation with Playwright
 * - Human-like behavior (delays, user agent, cookies)
 * - Rate limiting and throttling
 * - Support for filters: title, location, compensation, remote/on-site, seniority
 * - Unified job pipeline format output
 * - Pluggable design for future site adapters
 * 
 * @example
 * ```typescript
 * const scraper = new LinkedInJobScraper({ headless: true });
 * await scraper.initialize();
 * 
 * const results = await scraper.searchJobs({
 *   searchTerm: 'Software Engineer',
 *   location: 'San Francisco, CA',
 *   workType: 'remote',
 *   experienceLevel: 'mid'
 * });
 * 
 * await scraper.shutdown();
 * ```
 */
export class LinkedInJobScraper implements PlatformAdapter<LinkedInSearchParams> {
  public readonly platform = 'linkedin';
  
  private config: Required<ScraperConfig>;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  
  // Rate limiting state
  private lastRequestTime = 0;
  private requestCount = 0;
  private windowStartTime = 0;
  private readonly rateLimitWindow = 60000; // 1 minute window

  /**
   * Create a new LinkedIn Job Scraper instance
   * @param config - Scraper configuration options
   */
  constructor(config: ScraperConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the browser and context
   */
  async initialize(): Promise<void> {
    this.log('Initializing LinkedIn Job Scraper...');
    
    const launchOptions: Parameters<typeof chromium.launch>[0] = {
      headless: this.config.headless
    };

    if (this.config.proxyUrl) {
      launchOptions.proxy = { server: this.config.proxyUrl };
    }

    this.browser = await chromium.launch(launchOptions);
    
    this.context = await this.browser.newContext({
      userAgent: this.config.userAgent,
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles',
      // Add common browser features to avoid detection
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    this.log('LinkedIn Job Scraper initialized successfully');
  }

  /**
   * Search for jobs on LinkedIn
   * @param params - Search parameters
   * @returns Job search response with results
   */
  async searchJobs(params: LinkedInSearchParams): Promise<JobSearchResponse> {
    if (!this.browser || !this.context) {
      throw new Error('Scraper not initialized. Call initialize() first.');
    }

    await this.enforceRateLimit();

    this.log(`Searching jobs: "${params.searchTerm}" in "${params.location || 'any location'}"`);

    const page = await this.context.newPage();
    
    try {
      // Build search URL
      const searchUrl = this.buildSearchUrl(params);
      this.log(`Search URL: ${searchUrl}`);

      // Navigate to LinkedIn jobs search
      await page.goto(searchUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: this.config.timeout 
      });

      // Wait for job listings to load
      await this.waitWithRandomDelay(1000, 2000);

      // Check for CAPTCHA or login wall
      const isBlocked = await this.checkForBlocking(page);
      if (isBlocked) {
        this.log('Warning: LinkedIn may be blocking requests. Consider using authentication.');
        return this.createEmptyResponse(params, 'Rate limited or blocked by LinkedIn');
      }

      // Extract job listings
      const jobs = await this.extractJobs(page, params);
      
      // Get total count if available
      const totalCount = await this.extractTotalCount(page);

      return {
        jobs,
        totalCount: totalCount || jobs.length,
        platform: this.platform,
        searchParams: params,
        timestamp: new Date().toISOString(),
        pagination: {
          currentPage: Math.floor((params.offset || 0) / (params.limit || 25)) + 1,
          totalPages: Math.ceil((totalCount || jobs.length) / (params.limit || 25)),
          hasMore: jobs.length === (params.limit || 25)
        }
      };

    } catch (error) {
      this.log(`Error during job search: ${error instanceof Error ? error.message : String(error)}`);
      return this.createEmptyResponse(params, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      await page.close();
    }
  }

  /**
   * Build LinkedIn job search URL with filters
   */
  private buildSearchUrl(params: LinkedInSearchParams): string {
    const baseUrl = 'https://www.linkedin.com/jobs/search/';
    const queryParams = new URLSearchParams();

    // Keywords
    if (params.searchTerm) {
      queryParams.set('keywords', params.searchTerm);
    }

    // Location
    if (params.location) {
      queryParams.set('location', params.location);
    }

    // Work type (f_WT)
    // 1 = On-site, 2 = Remote, 3 = Hybrid
    if (params.workType && params.workType !== 'any') {
      const workTypeMap: Record<string, string> = {
        'onsite': '1',
        'remote': '2',
        'hybrid': '3'
      };
      queryParams.set('f_WT', workTypeMap[params.workType] || '');
    }

    // Experience level (f_E)
    // 1=Internship, 2=Entry, 3=Associate, 4=Mid-Senior, 5=Director, 6=Executive
    if (params.experienceLevel) {
      const levelMap: Record<string, string> = {
        'internship': '1',
        'entry': '2',
        'associate': '3',
        'mid': '4',
        'senior': '4,5', // Mid-Senior and Director
        'director': '5',
        'executive': '6'
      };
      queryParams.set('f_E', levelMap[params.experienceLevel] || '');
    }

    // Date posted (f_TPR)
    // r86400 = past 24 hours, r604800 = past week, r2592000 = past month
    if (params.datePosted && params.datePosted !== 'any') {
      const dateMap: Record<string, string> = {
        'today': 'r86400',
        'week': 'r604800',
        'month': 'r2592000'
      };
      queryParams.set('f_TPR', dateMap[params.datePosted] || '');
    }

    // Pagination
    if (params.offset && params.offset > 0) {
      queryParams.set('start', params.offset.toString());
    }

    return `${baseUrl}?${queryParams.toString()}`;
  }

  /**
   * Extract job listings from the page
   */
  private async extractJobs(page: Page, params: LinkedInSearchParams): Promise<JobResult[]> {
    const jobs: JobResult[] = [];

    try {
      // Wait for job cards to appear
      await page.waitForSelector('.jobs-search__results-list li, .job-card-container', { 
        timeout: 10000 
      }).catch(() => {
        this.log('Job cards selector not found, trying alternative selectors...');
      });

      // Try multiple selectors for job cards (LinkedIn's markup varies)
      const jobCardSelectors = [
        '.jobs-search__results-list li',
        '.job-card-container',
        '.jobs-search-results__list-item',
        '[data-job-id]'
      ];

      let jobElements: Awaited<ReturnType<Page['$$']>> = [];
      
      for (const selector of jobCardSelectors) {
        jobElements = await page.$$(selector);
        if (jobElements.length > 0) {
          this.log(`Found ${jobElements.length} job elements using selector: ${selector}`);
          break;
        }
      }

      const limit = params.limit || 25;
      const jobsToProcess = jobElements.slice(0, limit);

      for (const element of jobsToProcess) {
        try {
          const job = await this.extractJobFromElement(element);
          if (job) {
            jobs.push(job);
          }
        } catch (err) {
          this.log(`Error extracting job: ${err instanceof Error ? err.message : String(err)}`);
        }

        // Small delay between extractions to mimic human behavior
        await this.waitWithRandomDelay(100, 300);
      }

    } catch (error) {
      this.log(`Error extracting jobs: ${error instanceof Error ? error.message : String(error)}`);
    }

    return jobs;
  }

  /**
   * Extract job details from a single job card element
   */
  private async extractJobFromElement(
    element: Awaited<ReturnType<Page['$']>>
  ): Promise<JobResult | null> {
    if (!element) return null;

    try {
      // Extract job ID
      const jobId = await element.getAttribute('data-job-id') || 
                    await element.$eval('[data-job-id]', el => el.getAttribute('data-job-id')).catch(() => null) ||
                    `linkedin-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      // Extract title
      const title = await element.$eval(
        '.job-card-list__title, .job-card-container__link, h3, [class*="title"]',
        el => el.textContent?.trim()
      ).catch(() => 'Unknown Title') || 'Unknown Title';

      // Extract company name
      const company = await element.$eval(
        '.job-card-container__company-name, .job-card-container__primary-description, [class*="company"], h4',
        el => el.textContent?.trim()
      ).catch(() => 'Unknown Company') || 'Unknown Company';

      // Extract location
      const location = await element.$eval(
        '.job-card-container__metadata-item, [class*="location"], .job-card-container__metadata-wrapper li',
        el => el.textContent?.trim()
      ).catch(() => 'Unknown Location') || 'Unknown Location';

      // Extract job URL
      const urlPath = await element.$eval(
        'a[href*="/jobs/view/"], a[href*="/jobs/"]',
        el => el.getAttribute('href')
      ).catch(() => null);
      
      const url = urlPath 
        ? (urlPath.startsWith('http') ? urlPath : `https://www.linkedin.com${urlPath}`)
        : `https://www.linkedin.com/jobs/view/${jobId}`;

      // Extract date posted
      const dateText = await element.$eval(
        '.job-card-container__listed-time, time, [class*="date"], [class*="posted"]',
        el => el.textContent?.trim() || el.getAttribute('datetime')
      ).catch(() => null);
      
      const datePosted = this.parseDate(dateText);

      // Extract salary if available
      const salary = await element.$eval(
        '[class*="salary"], [class*="compensation"]',
        el => el.textContent?.trim()
      ).catch(() => undefined);

      // Check for remote work indicators
      const isRemote = await this.checkRemoteIndicators(element, location);

      // Check for Easy Apply
      const easyApply = await element.$('[class*="easy-apply"], [aria-label*="Easy Apply"]')
        .then(el => !!el)
        .catch(() => false);

      // Check if promoted
      const promoted = await element.$('[class*="promoted"], [aria-label*="Promoted"]')
        .then(el => !!el)
        .catch(() => false);

      // Extract brief description if available
      const description = await element.$eval(
        '[class*="description"], .job-card-container__snippet',
        el => el.textContent?.trim()
      ).catch(() => '') || '';

      const metadata: LinkedInJobMetadata = {
        linkedInJobId: jobId.toString(),
        easyApply,
        promoted,
        workplaceTypes: isRemote ? ['remote'] : ['onsite']
      };

      return {
        id: jobId.toString(),
        title,
        company,
        location,
        description: description.substring(0, 500),
        salary,
        url,
        platform: this.platform,
        datePosted,
        experienceLevel: this.inferExperienceLevel(title, description),
        remote: isRemote,
        metadata
      };

    } catch (error) {
      this.log(`Error parsing job element: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Check for remote work indicators
   */
  private async checkRemoteIndicators(
    element: Awaited<ReturnType<Page['$']>>,
    location: string
  ): Promise<boolean> {
    if (!element) return false;

    // Check location text
    const locationLower = location.toLowerCase();
    if (locationLower.includes('remote') || locationLower.includes('work from home')) {
      return true;
    }

    // Check for remote badge
    const hasRemoteBadge = await element.$('[class*="remote"], [aria-label*="Remote"]')
      .then(el => !!el)
      .catch(() => false);

    return hasRemoteBadge;
  }

  /**
   * Extract total job count from page
   */
  private async extractTotalCount(page: Page): Promise<number | null> {
    try {
      const countText = await page.$eval(
        '.jobs-search-results-list__subtitle, .results-context-header__job-count, [class*="job-count"]',
        el => el.textContent?.trim()
      ).catch(() => null);

      if (countText) {
        // Extract number from text like "1,234 jobs" or "Showing 1-25 of 1,234"
        const match = countText.match(/[\d,]+/);
        if (match) {
          return parseInt(match[0].replace(/,/g, ''), 10);
        }
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  /**
   * Check if the page is blocked by CAPTCHA or login wall
   */
  private async checkForBlocking(page: Page): Promise<boolean> {
    const blockedIndicators = [
      'checkpoint',
      'captcha',
      'sign in to view',
      'join linkedin',
      'authwall'
    ];

    try {
      const pageContent = await page.content();
      const pageUrl = page.url().toLowerCase();
      const contentLower = pageContent.toLowerCase();

      for (const indicator of blockedIndicators) {
        if (pageUrl.includes(indicator) || contentLower.includes(indicator)) {
          return true;
        }
      }
    } catch {
      // Ignore errors
    }

    return false;
  }

  /**
   * Parse date text into ISO string
   */
  private parseDate(dateText: string | null): string {
    if (!dateText) {
      return new Date().toISOString();
    }

    const now = new Date();
    const text = dateText.toLowerCase();

    // Handle relative dates
    if (text.includes('just now') || text.includes('moment')) {
      return now.toISOString();
    }
    if (text.includes('hour')) {
      const hours = parseInt(text.match(/\d+/)?.[0] || '1', 10);
      return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
    }
    if (text.includes('day')) {
      const days = parseInt(text.match(/\d+/)?.[0] || '1', 10);
      return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    }
    if (text.includes('week')) {
      const weeks = parseInt(text.match(/\d+/)?.[0] || '1', 10);
      return new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString();
    }
    if (text.includes('month')) {
      const months = parseInt(text.match(/\d+/)?.[0] || '1', 10);
      return new Date(now.getTime() - months * 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    // Try to parse as date string
    try {
      const parsed = new Date(dateText);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    } catch {
      // Ignore parse errors
    }

    return now.toISOString();
  }

  /**
   * Infer experience level from job title and description
   */
  private inferExperienceLevel(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();

    if (text.includes('intern')) return 'internship';
    if (text.includes('junior') || text.includes('entry')) return 'entry';
    if (text.includes('associate')) return 'associate';
    if (text.includes('director')) return 'director';
    if (text.includes('executive') || text.includes('vp') || text.includes('vice president') || text.includes('chief')) return 'executive';
    if (text.includes('senior') || text.includes('sr.') || text.includes('lead') || text.includes('principal') || text.includes('staff')) return 'senior';
    
    return 'mid';
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset window if needed
    if (now - this.windowStartTime > this.rateLimitWindow) {
      this.requestCount = 0;
      this.windowStartTime = now;
    }

    // Check if we've exceeded rate limit
    if (this.requestCount >= this.config.maxRequestsPerMinute) {
      const waitTime = this.rateLimitWindow - (now - this.windowStartTime);
      if (waitTime > 0) {
        this.log(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`);
        await this.wait(waitTime);
        this.requestCount = 0;
        this.windowStartTime = Date.now();
      }
    }

    // Enforce minimum delay between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.config.minDelay) {
      const delay = this.config.minDelay - timeSinceLastRequest;
      await this.wait(delay);
    }

    this.requestCount++;
    this.lastRequestTime = Date.now();
  }

  /**
   * Wait for a random duration between min and max
   */
  private async waitWithRandomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await this.wait(delay);
  }

  /**
   * Wait for specified milliseconds
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): RateLimitStatus {
    const now = Date.now();
    const windowReset = Math.max(0, this.rateLimitWindow - (now - this.windowStartTime));
    
    return {
      requestCount: this.requestCount,
      windowReset,
      canMakeRequest: this.requestCount < this.config.maxRequestsPerMinute || windowReset <= 0
    };
  }

  /**
   * Create empty response for error cases
   */
  private createEmptyResponse(params: LinkedInSearchParams, _errorMessage?: string): JobSearchResponse {
    return {
      jobs: [],
      totalCount: 0,
      platform: this.platform,
      searchParams: params,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log message if debug mode is enabled
   */
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[LinkedInJobScraper] ${message}`);
    }
  }

  /**
   * Shutdown the scraper and cleanup resources
   */
  async shutdown(): Promise<void> {
    this.log('Shutting down LinkedIn Job Scraper...');
    
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    
    this.log('LinkedIn Job Scraper shut down successfully');
  }
}
