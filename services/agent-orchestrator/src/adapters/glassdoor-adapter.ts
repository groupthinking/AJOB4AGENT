import axios, { AxiosInstance } from 'axios';
import { JobSearchParams, JobResult, JobSearchResponse } from '../types/job-search';

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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

  private parseJobResults(html: string, params: JobSearchParams): GlassdoorJobResult[] {
    // Simple HTML parsing - in production, would use cheerio or similar
    const jobs: GlassdoorJobResult[] = [];

    // Extract job listings from HTML using regex patterns
    // Note: This is a simplified implementation. For production,
    // use the full GlassdoorJobScraper from platform-adapters/glassdoor
    
    // Pattern to find job listings
    const jobPattern = /data-test="jobListing"[^>]*data-id="(\d+)"[^]*?data-test="job-title"[^>]*>([^<]+)</g;
    let match;
    let index = 0;

    while ((match = jobPattern.exec(html)) !== null && jobs.length < 25) {
      const jobId = match[1];
      const jobTitle = match[2];

      jobs.push({
        id: `glassdoor-${jobId}-${Date.now()}-${index}`,
        title: jobTitle.trim(),
        company: this.extractCompany(html, jobId) || 'Unknown Company',
        location: this.extractLocation(html, jobId) || params.location || 'Remote',
        description: '',
        url: `${this.baseUrl}/job-listing/j?jl=${jobId}`,
        platform: 'glassdoor',
        datePosted: new Date().toISOString(),
        easyApply: html.includes('easy-apply'),
        companyRating: this.extractRating(html, jobId)
      });

      index++;
    }

    // If no jobs found through regex, return mock jobs for development
    if (jobs.length === 0 && params.searchTerm) {
      console.log('📋 Glassdoor: Returning sample job format (live scraping requires browser)');
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

  private extractCompany(html: string, jobId: string): string | null {
    const pattern = new RegExp(`data-id="${jobId}"[^]*?data-test="employer-name"[^>]*>([^<]+)<`, 'i');
    const match = html.match(pattern);
    return match ? match[1].trim() : null;
  }

  private extractLocation(html: string, jobId: string): string | null {
    const pattern = new RegExp(`data-id="${jobId}"[^]*?data-test="emp-location"[^>]*>([^<]+)<`, 'i');
    const match = html.match(pattern);
    return match ? match[1].trim() : null;
  }

  private extractRating(html: string, jobId: string): number | undefined {
    const pattern = new RegExp(`data-id="${jobId}"[^]*?data-test="rating"[^>]*>([0-9.]+)<`, 'i');
    const match = html.match(pattern);
    if (match) {
      const rating = parseFloat(match[1]);
      return isNaN(rating) ? undefined : rating;
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
