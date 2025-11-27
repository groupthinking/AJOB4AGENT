import { Job, SearchFilters } from './base/types';

/**
 * Glassdoor-specific job interface with additional fields
 * that are unique to the Glassdoor platform
 */
export interface GlassdoorJob extends Job {
  /** Company rating on Glassdoor (1-5 stars) */
  companyRating?: number;

  /** Salary estimate with min/max range */
  salaryEstimate?: {
    min: number;
    max: number;
    currency: string;
  };

  /** Number of company reviews on Glassdoor */
  reviewCount?: number;

  /** Whether the job supports Easy Apply */
  easyApply: boolean;

  /** Company size category */
  companySize?: string;

  /** Industry sector */
  industry?: string;

  /** Company headquarters location */
  headquarters?: string;

  /** Full job description HTML (from detail page) */
  descriptionHtml?: string;

  /** Job benefits listed */
  benefits?: string[];

  /** Required skills */
  skills?: string[];

  /** Employment type (Full-time, Part-time, Contract, etc.) */
  employmentType?: string;
}

/**
 * Glassdoor-specific search filters
 */
export interface GlassdoorSearchFilters extends SearchFilters {
  /** Minimum company rating (1-5) */
  companyRating?: number;

  /** Company size filter */
  companySize?: 'small' | 'medium' | 'large' | 'enterprise';

  /** Industry filter */
  industry?: string;

  /** Filter for Easy Apply jobs only */
  easyApplyOnly?: boolean;

  /** Job type filter */
  jobType?: 'fulltime' | 'parttime' | 'contract' | 'internship' | 'temporary';

  /** Posted by (company or recruiter) */
  postedBy?: 'employer' | 'staffing';

  /** Specific company name to search within */
  companyName?: string;
}

/**
 * Configuration for Glassdoor scraper
 */
export interface GlassdoorScraperConfig {
  headless?: boolean;
  throttleMs?: number;
  maxResults?: number;
  userAgent?: string;
  timeout?: number;
  /** Glassdoor account email for authenticated scraping */
  email?: string;
  /** Glassdoor account password */
  password?: string;
}

/**
 * Raw job card data as extracted from Glassdoor HTML
 */
export interface RawJobCard {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  rating?: string;
  reviewCount?: string;
  easyApply: boolean;
  url: string;
  postedDate?: string;
}

/**
 * Raw job detail data from the job detail page
 */
export interface RawJobDetail {
  description: string;
  companySize?: string;
  industry?: string;
  headquarters?: string;
  benefits?: string[];
  skills?: string[];
  employmentType?: string;
}
