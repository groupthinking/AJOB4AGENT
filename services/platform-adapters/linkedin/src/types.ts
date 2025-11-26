/**
 * Unified Job interface for all platform adapters
 * This interface standardizes job data across different sources
 */
export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  postingDate: string;
  url: string;
  description?: string;
  tags: string[];
  source: 'linkedin' | 'glassdoor' | 'wellfound';
  scrapedAt: string;
}

/**
 * Search filters for job scraping
 */
export interface SearchFilters {
  keywords: string;
  location?: string;
  remote?: boolean;
  salary?: { min?: number; max?: number };
  seniority?: 'entry' | 'mid' | 'senior' | 'director' | 'executive';
  datePosted?: '24h' | 'week' | 'month';
}

/**
 * Base configuration for job scrapers
 */
export interface ScraperConfig {
  headless?: boolean;
  throttleMs?: number;
  maxResults?: number;
  timeout?: number;
  userAgent?: string;
}

/**
 * Result from a search operation
 */
export interface SearchResult {
  jobs: Job[];
  totalCount: number;
  query: SearchFilters;
  scrapedAt: string;
  hasMore: boolean;
}

/**
 * LinkedIn-specific scraper configuration
 */
export interface LinkedInScraperConfig extends ScraperConfig {
  /** Cookies for authenticated sessions */
  cookies?: Array<{
    name: string;
    value: string;
    domain?: string;
  }>;
  /** Proxy configuration */
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
  /** Enable screenshot capture for debugging */
  captureScreenshots?: boolean;
  /** Directory for screenshots */
  screenshotDir?: string;
}

/**
 * LinkedIn search URL parameters
 */
export interface LinkedInSearchParams {
  keywords?: string;
  location?: string;
  geoId?: string;
  distance?: number;
  f_TPR?: string; // Time posted range
  f_WT?: string; // Workplace type (Remote = 2)
  f_E?: string; // Experience level
  f_SB2?: string; // Salary range
  start?: number;
  sortBy?: 'DD' | 'R'; // Date Descending or Relevance
}

/**
 * LinkedIn experience level mappings
 */
export const LINKEDIN_EXPERIENCE_LEVELS: Record<string, string> = {
  entry: '1,2', // Internship, Entry level
  mid: '3,4', // Associate, Mid-Senior level
  senior: '5', // Director
  director: '5', // Director
  executive: '6', // Executive
};

/**
 * LinkedIn date posted mappings
 */
export const LINKEDIN_DATE_POSTED: Record<string, string> = {
  '24h': 'r86400',
  week: 'r604800',
  month: 'r2592000',
};

/**
 * LinkedIn workplace type mappings
 */
export const LINKEDIN_WORKPLACE_TYPES = {
  onSite: '1',
  remote: '2',
  hybrid: '3',
};

/**
 * Captcha detection result
 */
export interface CaptchaDetection {
  detected: boolean;
  type?: 'recaptcha' | 'hcaptcha' | 'unknown';
}

/**
 * Scraping session state
 */
export interface ScrapingSession {
  startedAt: string;
  jobsScraped: number;
  pagesVisited: number;
  errors: string[];
  captchaEncountered: boolean;
}

/**
 * Job card raw data from LinkedIn
 */
export interface LinkedInJobCard {
  jobId: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  datePosted?: string;
  url: string;
  promoted?: boolean;
}

/**
 * Pagination state
 */
export interface PaginationState {
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  startIndex: number;
}
