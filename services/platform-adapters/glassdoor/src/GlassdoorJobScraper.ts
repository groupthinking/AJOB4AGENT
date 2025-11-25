import { Page } from 'playwright';
import { BaseJobScraper } from './base/BaseJobScraper';
import { ScraperConfig } from './base/types';
import { GlassdoorJob, GlassdoorSearchFilters, GlassdoorScraperConfig } from './types';
import { buildGlassdoorSearchUrl } from './utils/urlBuilder';
import { 
  parseJobListHtml, 
  parseJobDetailHtml, 
  transformRawJobCard,
  parseSalaryEstimate,
  hasNextPageButton
} from './utils/parser';
import { parseRating, parseReviewCount } from './utils/ratingParser';

/**
 * Glassdoor job scraper implementation
 * Extends BaseJobScraper with Glassdoor-specific functionality
 */
export class GlassdoorJobScraper extends BaseJobScraper<GlassdoorJob, GlassdoorSearchFilters> {
  readonly platform = 'glassdoor';
  readonly baseUrl = 'https://www.glassdoor.com';

  private glassdoorConfig: GlassdoorScraperConfig;

  constructor(config: GlassdoorScraperConfig = {}) {
    const baseConfig: ScraperConfig = {
      headless: config.headless ?? true,
      throttleMs: config.throttleMs ?? 3000,
      maxResults: config.maxResults ?? 50,
      userAgent: config.userAgent,
      timeout: config.timeout ?? 30000
    };

    super(baseConfig);
    this.glassdoorConfig = config;
  }

  /**
   * Build Glassdoor search URL from filters
   */
  protected buildSearchUrl(filters: GlassdoorSearchFilters): string {
    return buildGlassdoorSearchUrl(filters);
  }

  /**
   * Parse job listings from the current page
   */
  protected async parseJobList(page: Page): Promise<GlassdoorJob[]> {
    // Wait for job listings to load
    try {
      await page.waitForSelector('[data-test="jobListing"], .JobsList_jobListItem__JBBUV, .job-search-item', {
        timeout: 10000
      });
    } catch {
      // No jobs found on page
      console.log('⚠️ No job listings found on page');
      return [];
    }

    // Get page HTML and parse job cards
    const html = await page.content();
    const rawJobs = parseJobListHtml(html);

    // Transform raw job cards to GlassdoorJob format
    const jobs: GlassdoorJob[] = rawJobs.map(raw => {
      const job = transformRawJobCard(raw);
      
      // Parse salary estimate if available
      if (raw.salary) {
        job.salaryEstimate = parseSalaryEstimate(raw.salary);
      }

      return job;
    });

    console.log(`📋 Parsed ${jobs.length} jobs from current page`);
    return jobs;
  }

  /**
   * Check if there's a next page available
   */
  protected async hasNextPage(page: Page): Promise<boolean> {
    try {
      const html = await page.content();
      return hasNextPageButton(html);
    } catch {
      return false;
    }
  }

  /**
   * Navigate to the next page
   */
  protected async goToNextPage(page: Page): Promise<void> {
    const nextButton = await page.$('[data-test="pagination-next"], .nextButton, [aria-label="Next"]');
    
    if (nextButton) {
      await nextButton.click();
      await page.waitForLoadState('networkidle');
    }
  }

  /**
   * Get detailed job information from a job detail page
   */
  async getJobDetails(jobUrl: string): Promise<GlassdoorJob> {
    await this.initialize();

    const page = await this.newPage();

    try {
      await this.throttle();
      await page.goto(jobUrl, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout
      });

      // Wait for job description to load
      await page.waitForSelector('[data-test="job-description"], .JobDetails_jobDescription__uW_fK, #JobDescriptionContainer', {
        timeout: 10000
      }).catch(() => {
        console.log('⚠️ Job description selector not found, continuing...');
      });

      // Parse the page content
      const html = await page.content();
      const detail = parseJobDetailHtml(html);

      // Get basic info from the page
      const basicInfo = await this.parseBasicInfoFromDetailPage(page);

      return {
        ...basicInfo,
        descriptionHtml: detail.description,
        description: this.stripHtml(detail.description),
        companySize: detail.companySize,
        industry: detail.industry,
        headquarters: detail.headquarters,
        benefits: detail.benefits,
        skills: detail.skills,
        employmentType: detail.employmentType,
        url: jobUrl,
        source: 'glassdoor',
        scrapedAt: new Date().toISOString()
      };

    } finally {
      await page.close();
    }
  }

  /**
   * Parse basic job info from the detail page
   */
  private async parseBasicInfoFromDetailPage(page: Page): Promise<GlassdoorJob> {
    const title = await page.$eval('[data-test="job-title"], .JobDetails_jobTitle__bFQf_, h1', 
      el => el.textContent?.trim() || ''
    ).catch(() => 'Unknown Title');

    const company = await page.$eval('[data-test="employer-name"], .EmployerProfile_employerName__Xemli', 
      el => el.textContent?.trim() || ''
    ).catch(() => 'Unknown Company');

    const location = await page.$eval('[data-test="emp-location"], .JobDetails_location__4j4Qv', 
      el => el.textContent?.trim() || ''
    ).catch(() => '');

    const salary = await page.$eval('[data-test="detailSalary"], .JobDetails_salaryEstimate__cPQyl', 
      el => el.textContent?.trim() || ''
    ).catch(() => undefined);

    const ratingText = await page.$eval('[data-test="rating"], .EmployerProfile_ratingValue__2BBWA', 
      el => el.textContent?.trim() || ''
    ).catch(() => '');

    const reviewCountText = await page.$eval('[data-test="review-count"]', 
      el => el.textContent?.trim() || ''
    ).catch(() => '');

    const easyApply = await page.$('[data-test="easy-apply"], .JobDetails_easyApply__YZw6j')
      .then(el => el !== null)
      .catch(() => false);

    // Extract job ID from URL
    const url = page.url();
    const idMatch = url.match(/jl=(\d+)/) || url.match(/-JV_(\d+)/);
    const id = idMatch ? idMatch[1] : `gd-${Date.now()}`;

    return {
      id,
      title,
      company,
      location,
      salary: salary || undefined,
      companyRating: ratingText ? parseRating(ratingText) : undefined,
      reviewCount: reviewCountText ? parseReviewCount(reviewCountText) : undefined,
      easyApply,
      salaryEstimate: salary ? parseSalaryEstimate(salary) : undefined,
      url,
      tags: [],
      source: 'glassdoor',
      scrapedAt: new Date().toISOString()
    };
  }

  /**
   * Strip HTML tags from a string
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Handle Glassdoor's anti-bot measures
   * Override the throttle method with more aggressive rate limiting
   */
  protected async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    
    // Use a longer throttle time for Glassdoor (default 3 seconds)
    const throttleMs = this.config.throttleMs || 3000;

    // Add some randomness to avoid detection patterns
    const jitter = Math.floor(Math.random() * 1000);
    const totalDelay = throttleMs + jitter;

    if (elapsed < totalDelay) {
      const delay = totalDelay - elapsed;
      console.log(`⏳ Throttling: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Search for jobs and handle any login prompts
   */
  async search(filters: GlassdoorSearchFilters): Promise<GlassdoorJob[]> {
    await this.initialize();

    const page = await this.newPage();
    const allJobs: GlassdoorJob[] = [];

    try {
      const searchUrl = this.buildSearchUrl(filters);
      console.log(`🔍 Searching Glassdoor: ${searchUrl}`);
      
      await this.throttle();
      await page.goto(searchUrl, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      // Handle potential modal or overlay
      await this.dismissModals(page);

      let pageNum = 1;
      const maxResults = this.config.maxResults || 50;

      while (allJobs.length < maxResults) {
        console.log(`📄 Processing page ${pageNum}...`);
        
        // Handle modals that might appear mid-session
        await this.dismissModals(page);
        
        const jobs = await this.parseJobList(page);
        allJobs.push(...jobs);

        console.log(`✅ Total jobs collected: ${allJobs.length}`);

        if (allJobs.length >= maxResults) {
          break;
        }

        const hasMore = await this.hasNextPage(page);
        if (!hasMore) {
          console.log('📍 No more pages available');
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
   * Dismiss any modals or overlays that might appear
   */
  private async dismissModals(page: Page): Promise<void> {
    try {
      // Close sign-in modals
      const closeButtons = [
        '[data-test="modal-close"]',
        '.modal-close',
        '[aria-label="Close"]',
        '.CloseButton',
        'button.close'
      ];

      for (const selector of closeButtons) {
        const closeButton = await page.$(selector);
        if (closeButton) {
          await closeButton.click();
          await page.waitForTimeout(500);
          break;
        }
      }

      // Press Escape to close any modal
      await page.keyboard.press('Escape');
      
    } catch {
      // Ignore errors from modal dismissal
    }
  }

  /**
   * Search jobs with company rating filter
   */
  async searchWithRatingFilter(
    filters: GlassdoorSearchFilters,
    minRating: number
  ): Promise<GlassdoorJob[]> {
    const jobs = await this.search({
      ...filters,
      companyRating: minRating
    });

    // Additional client-side filtering to ensure ratings
    return jobs.filter(job => 
      !job.companyRating || job.companyRating >= minRating
    );
  }

  /**
   * Get jobs with Easy Apply only
   */
  async searchEasyApplyJobs(filters: GlassdoorSearchFilters): Promise<GlassdoorJob[]> {
    return this.search({
      ...filters,
      easyApplyOnly: true
    });
  }
}

export default GlassdoorJobScraper;
