import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { JobSearchParams, JobResult, JobSearchResponse } from '../types/job-search';

// Default User-Agent for Glassdoor requests (Chrome 124 on macOS)
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Salary parsing patterns
// Matches salary ranges like "$80K - $120K", "$80,000 - $120,000", "€80K - €120K"
const SALARY_RANGE_PATTERN = /[$€£]?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*[kK]?\s*[-–—to]+\s*[$€£]?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*[kK]?/;
// Matches single salary values like "$80K", "$80,000"
const SALARY_SINGLE_PATTERN = /[$€£]?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*[kK]?/;

/**
 * Glassdoor-specific job result with additional fields
 */
interface GlassdoorJobResult extends JobResult {
  companyRating?: number;
  reviewCount?: number;
  easyApply: boolean;
  salaryEstimate?: {
    min: number;
    max: number;
    currency: string;
  };
  companySize?: string;
  industry?: string;
}

/**
 * Glassdoor adapter for the agent-orchestrator
 * Provides job search capabilities through Glassdoor's platform
 * 
 * Note: This adapter is not thread-safe due to the rate limiting implementation.
 * If concurrent access is required, use separate adapter instances or implement
 * external synchronization.
 */
export class GlassdoorAdapter {
  private client: AxiosInstance;
  private baseUrl = 'https://www.glassdoor.com';

  // Rate limiting configuration
  private lastRequestTime = 0;
  private minRequestInterval = 3000; // 3 seconds between requests
  private requestCount = 0;
  private rateLimitWindow = 60000; // 1 minute window
  private maxRequestsPerWindow = 20;

  constructor() {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': process.env.SCRAPER_USER_AGENT || DEFAULT_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    // Setup rate limiting interceptor
    this.client.interceptors.request.use(this.rateLimitInterceptor.bind(this));
  }

  private async rateLimitInterceptor(config: any) {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      console.log(`⏳ Glassdoor rate limiting: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    if (this.requestCount >= this.maxRequestsPerWindow) {
      const windowReset = this.lastRequestTime + this.rateLimitWindow;
      if (now < windowReset) {
        const delay = windowReset - now;
        console.log(`⚠️  Glassdoor rate limit reached: waiting ${Math.ceil(delay / 1000)}s`);
        await new Promise(resolve => setTimeout(resolve, delay));
        this.requestCount = 0;
      }
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;

    return config;
  }

  /**
   * Search for jobs on Glassdoor
   */
  async searchJobs(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      console.log('🔍 Glassdoor job search starting...');

      const searchParams = this.buildSearchParams(params);
      const url = `${this.baseUrl}/Job/jobs.htm`;

      const response = await this.client.get(url, { params: searchParams });
      const jobs = this.parseJobResults(response.data, params);

      return {
        jobs,
        totalCount: jobs.length,
        platform: 'glassdoor',
        searchParams: params,
        timestamp: new Date().toISOString()
      };

    } catch (error: unknown) {
      const errorMessage = (error as Error)?.message || 'Unknown error';
      console.error('❌ Glassdoor search failed:', errorMessage, error);
      return {
        jobs: [],
        totalCount: 0,
        platform: 'glassdoor',
        searchParams: params,
        timestamp: new Date().toISOString()
      };
    }
  }

  private buildSearchParams(params: JobSearchParams): Record<string, string> {
    const searchParams: Record<string, string> = {};

    if (params.searchTerm) {
      searchParams.sc = 'keyword=' + encodeURIComponent(params.searchTerm);
    }

    if (params.location) {
      searchParams.locT = 'C';
      searchParams.locKeyword = params.location;
    }

    if (params.remoteOnly) {
      searchParams.remoteWorkType = '1';
    }

    if (params.datePosted) {
      const dateMap = {
        'today': '1',
        'week': '7',
        'month': '30'
      };
      searchParams.fromAge = dateMap[params.datePosted] || '30';
    }

    if (params.salaryMin) {
      searchParams.minSalary = params.salaryMin.toString();
    }

    return searchParams;
  }

  /**
   * Parse job results from HTML using cheerio for robust HTML parsing.
   * This approach is more reliable than regex patterns and handles
   * HTML structure variations gracefully.
   */
  private parseJobResults(html: string, params: JobSearchParams): GlassdoorJobResult[] {
    const $ = cheerio.load(html);
    const jobs: GlassdoorJobResult[] = [];

    // Use multiple selectors to handle Glassdoor's varying HTML structure
    $('[data-test="jobListing"], .JobsList_jobListItem__JBBUV, .job-search-item, [class*="JobCard"]').each((index, element) => {
      if (jobs.length >= 25) return false; // Limit results

      const $card = $(element);
      const job = this.parseJobCard($, $card, index);
      
      if (job && job.title && job.company) {
        jobs.push(job);
      }
    });

    // If no jobs found, return informational message for development
    if (jobs.length === 0 && params.searchTerm) {
      console.log('📋 Glassdoor: No jobs found in HTML, returning sample job format');
      jobs.push({
        id: `glassdoor-sample-${Date.now()}`,
        title: `${params.searchTerm} (Glassdoor - requires browser for live data)`,
        company: 'Sample Company',
        location: params.location || 'Remote',
        description: 'Note: For live Glassdoor data, use the GlassdoorJobScraper with Playwright',
        url: `${this.baseUrl}/Job/jobs.htm?keyword=${encodeURIComponent(params.searchTerm)}`,
        platform: 'glassdoor',
        datePosted: new Date().toISOString(),
        easyApply: false
      });
    }

    return jobs;
  }

  /**
   * Parse a single job card element using cheerio selectors
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseJobCard($: cheerio.CheerioAPI, $card: any, index: number): GlassdoorJobResult | null {
    try {
      // Extract job ID from data attribute or link
      const id = $card.attr('data-id') || 
                 $card.attr('data-job-id') ||
                 this.extractJobIdFromLink($card.find('a').first().attr('href') || '') ||
                 `gd-${Date.now()}-${index}`;

      // Job title - try multiple selectors
      const title = $card.find('[data-test="job-title"], .JobCard_jobTitle__GLyJ1, .job-title, a[data-test="job-link"]').first().text().trim();

      // Company name
      const company = $card.find('[data-test="employer-name"], .EmployerProfile_employerName__Xemli, .employer-name, .jobCard_companyName').first().text().trim();

      // Location
      const location = $card.find('[data-test="emp-location"], .JobCard_location__rCz3x, .location').first().text().trim();

      // Salary
      const salary = $card.find('[data-test="detailSalary"], .JobCard_salaryEstimate__arV5J, .salary-estimate').first().text().trim();

      // Company rating
      const ratingText = $card.find('[data-test="rating"], .EmployerProfile_ratingValue__2BBWA, .rating').first().text().trim();
      const companyRating = ratingText ? this.parseRating(ratingText) : undefined;

      // Easy Apply indicator
      const easyApply = $card.find('[data-test="easy-apply"], .JobCard_easyApply__fNCsj, .easy-apply').length > 0 ||
                        $card.text().toLowerCase().includes('easy apply');

      // Job URL
      let url = $card.find('a[data-test="job-link"], a.JobCard_jobTitle__GLyJ1, a.job-link').first().attr('href') || '';
      if (url && !url.startsWith('http')) {
        url = this.baseUrl + url;
      }
      if (!url) {
        url = `${this.baseUrl}/job-listing/j?jl=${id}`;
      }

      // Posted date
      const postedDate = $card.find('[data-test="posted-date"], .JobCard_listingAge__KuaxZ, .posting-date').first().text().trim();

      // Only return if we have essential fields
      if (!title || !company) {
        return null;
      }

      return {
        id: `glassdoor-${id}`,
        title,
        company,
        location: location || 'Location not specified',
        description: '',
        url,
        platform: 'glassdoor',
        datePosted: postedDate || new Date().toISOString(),
        easyApply,
        companyRating,
        salaryEstimate: salary ? this.parseSalaryEstimate(salary) : undefined
      };
    } catch (error) {
      console.error('Error parsing job card:', error);
      return null;
    }
  }

  /**
   * Extract job ID from URL
   */
  private extractJobIdFromLink(url: string): string | null {
    if (!url) return null;
    
    const patterns = [
      /jl=(\d+)/,
      /jobListingId=(\d+)/,
      /-JV_(\d+)/,
      /\/job\/(\d+)\//
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Parse rating string to number
   */
  private parseRating(ratingStr: string): number | undefined {
    if (!ratingStr) return undefined;
    
    // Clean up the string and extract numeric value
    const cleaned = ratingStr.replace(/[^\d.]/g, '');
    const rating = parseFloat(cleaned);
    
    if (isNaN(rating) || rating < 0 || rating > 5) {
      return undefined;
    }
    
    return Math.round(rating * 10) / 10; // Round to 1 decimal
  }

  /**
   * Parse salary string into structured estimate
   */
  private parseSalaryEstimate(salaryStr: string): { min: number; max: number; currency: string } | undefined {
    if (!salaryStr) return undefined;

    // Detect currency
    let currency = 'USD';
    if (salaryStr.includes('€')) currency = 'EUR';
    else if (salaryStr.includes('£')) currency = 'GBP';
    else if (salaryStr.includes('CAD')) currency = 'CAD';

    // Match salary range pattern
    const match = salaryStr.match(SALARY_RANGE_PATTERN);

    if (match) {
      let min = parseFloat(match[1].replace(/,/g, ''));
      let max = parseFloat(match[2].replace(/,/g, ''));

      // Convert K values to full numbers
      if (min < 1000 && salaryStr.toLowerCase().includes('k')) {
        min *= 1000;
        max *= 1000;
      }

      return { min, max, currency };
    }

    // Single value pattern
    const singleMatch = salaryStr.match(SALARY_SINGLE_PATTERN);

    if (singleMatch) {
      let value = parseFloat(singleMatch[1].replace(/,/g, ''));
      if (value < 1000 && salaryStr.toLowerCase().includes('k')) {
        value *= 1000;
      }
      return { min: value, max: value, currency };
    }

    return undefined;
  }

  /**
   * Get rate limit status for monitoring
   */
  getRateLimitStatus(): { requestCount: number; windowReset: number; canMakeRequest: boolean } {
    const now = Date.now();
    const windowReset = this.lastRequestTime + this.rateLimitWindow;

    return {
      requestCount: this.requestCount,
      windowReset: Math.max(0, windowReset - now),
      canMakeRequest: this.requestCount < this.maxRequestsPerWindow || now >= windowReset
    };
  }
}
