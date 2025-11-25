/**
 * LinkedIn Job Scraper Types
 * Extends the unified job pipeline format for LinkedIn-specific data
 */

/**
 * LinkedIn job search parameters with advanced filter support
 */
export interface LinkedInSearchParams {
  /** Job title/keywords to search for */
  searchTerm: string;
  /** Location filter (city, state, or country) */
  location?: string;
  /** Minimum salary filter */
  salaryMin?: number;
  /** Maximum salary filter */
  salaryMax?: number;
  /** Remote/on-site/hybrid work type */
  workType?: 'remote' | 'onsite' | 'hybrid' | 'any';
  /** Experience/seniority level */
  experienceLevel?: 'internship' | 'entry' | 'associate' | 'mid' | 'senior' | 'director' | 'executive';
  /** Date posted filter */
  datePosted?: 'today' | 'week' | 'month' | 'any';
  /** Number of results per page (max 25) */
  limit?: number;
  /** Page offset for pagination */
  offset?: number;
}

/**
 * LinkedIn-specific job metadata
 */
export interface LinkedInJobMetadata {
  /** LinkedIn job posting ID */
  linkedInJobId: string;
  /** Workplace type codes */
  workplaceTypes?: string[];
  /** Number of applicants */
  applicantCount?: number;
  /** Industry/sector */
  industry?: string;
  /** Required skills */
  skills?: string[];
  /** Job benefits */
  benefits?: string[];
  /** Company LinkedIn ID */
  companyLinkedInId?: string;
  /** Easy apply availability */
  easyApply?: boolean;
  /** Promoted job indicator */
  promoted?: boolean;
}

/**
 * Unified job result format for pipeline processing
 * Compatible with existing JobResult interface
 */
export interface JobResult {
  /** Unique job identifier */
  id: string;
  /** Job title */
  title: string;
  /** Company name */
  company: string;
  /** Job location */
  location: string;
  /** Job description (truncated) */
  description: string;
  /** Salary information if available */
  salary?: string;
  /** Direct job URL */
  url: string;
  /** Source platform */
  platform: string;
  /** ISO date string of posting */
  datePosted: string;
  /** Experience level */
  experienceLevel?: string;
  /** Remote work flag */
  remote?: boolean;
  /** Platform-specific metadata */
  metadata?: LinkedInJobMetadata;
}

/**
 * Job search response format
 */
export interface JobSearchResponse {
  /** List of job results */
  jobs: JobResult[];
  /** Total count of available results */
  totalCount: number;
  /** Source platform name */
  platform: string;
  /** Search parameters used */
  searchParams: LinkedInSearchParams;
  /** ISO timestamp of search */
  timestamp: string;
  /** Pagination info */
  pagination?: {
    currentPage: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Scraper configuration options
 */
export interface ScraperConfig {
  /** Enable headless mode (default: true) */
  headless?: boolean;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Minimum delay between requests in ms (default: 2000) */
  minDelay?: number;
  /** Maximum delay between requests in ms (default: 5000) */
  maxDelay?: number;
  /** Maximum requests per minute (default: 20) */
  maxRequestsPerMinute?: number;
  /** Custom user agent string */
  userAgent?: string;
  /** Proxy URL for requests */
  proxyUrl?: string;
  /** Enable verbose logging */
  debug?: boolean;
}

/**
 * Base search parameters that all platform adapters should support
 */
export interface BaseSearchParams {
  /** Job title/keywords to search for */
  searchTerm: string;
  /** Location filter */
  location?: string;
  /** Number of results */
  limit?: number;
  /** Pagination offset */
  offset?: number;
}

/**
 * Platform adapter interface for extensibility
 * Generic interface allowing each platform to define its own search parameters
 */
export interface PlatformAdapter<TParams extends BaseSearchParams = LinkedInSearchParams> {
  /** Platform name identifier */
  readonly platform: string;
  
  /** Initialize the adapter */
  initialize(): Promise<void>;
  
  /** Search for jobs */
  searchJobs(params: TParams): Promise<JobSearchResponse>;
  
  /** Cleanup resources */
  shutdown(): Promise<void>;
}

/**
 * Rate limit status information
 */
export interface RateLimitStatus {
  /** Current request count in window */
  requestCount: number;
  /** Milliseconds until window reset */
  windowReset: number;
  /** Whether a request can be made now */
  canMakeRequest: boolean;
}
