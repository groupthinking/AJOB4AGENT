import { GlassdoorSearchFilters } from '../types';

/**
 * Glassdoor URL builder utility
 * Constructs search URLs based on filter parameters
 */

const BASE_URL = 'https://www.glassdoor.com';
const JOBS_PATH = '/Job/jobs.htm';

/**
 * Map date posted filter to Glassdoor's fromAge parameter
 */
function mapDatePosted(datePosted?: '24h' | 'week' | 'month'): string | undefined {
  const dateMap: Record<string, string> = {
    '24h': '1',
    'week': '7',
    'month': '30'
  };
  return datePosted ? dateMap[datePosted] : undefined;
}

/**
 * Map company size to Glassdoor's employee count filter
 */
function mapCompanySize(size?: 'small' | 'medium' | 'large' | 'enterprise'): string | undefined {
  const sizeMap: Record<string, string> = {
    'small': '10001',     // 1-200 employees
    'medium': '10002',    // 201-500 employees
    'large': '10003',     // 501-1000 employees
    'enterprise': '10004' // 1001+ employees
  };
  return size ? sizeMap[size] : undefined;
}

/**
 * Map job type to Glassdoor's job type filter
 */
function mapJobType(jobType?: 'fulltime' | 'parttime' | 'contract' | 'internship' | 'temporary'): string | undefined {
  const typeMap: Record<string, string> = {
    'fulltime': 'fulltime',
    'parttime': 'parttime',
    'contract': 'contract',
    'internship': 'internship',
    'temporary': 'temporary'
  };
  return jobType ? typeMap[jobType] : undefined;
}

/**
 * Build a Glassdoor job search URL from filters
 */
export function buildGlassdoorSearchUrl(filters: GlassdoorSearchFilters): string {
  const params: Record<string, string> = {};

  // Keywords/search term
  if (filters.keywords) {
    params.sc = 'keyword=' + encodeURIComponent(filters.keywords);
  }

  // Location handling
  if (filters.location) {
    params.locT = 'C'; // City type
    params.locKeyword = filters.location;
  }

  // Remote work filter
  if (filters.remote) {
    params.remoteWorkType = '1';
  }

  // Salary filter
  if (filters.salary?.min) {
    params.minSalary = filters.salary.min.toString();
  }
  if (filters.salary?.max) {
    params.maxSalary = filters.salary.max.toString();
  }

  // Date posted filter
  const fromAge = mapDatePosted(filters.datePosted);
  if (fromAge) {
    params.fromAge = fromAge;
  }

  // Easy Apply filter
  if (filters.easyApplyOnly) {
    params.applicationType = '1';
  }

  // Company rating filter (minimum stars)
  if (filters.companyRating && filters.companyRating >= 1 && filters.companyRating <= 5) {
    params.minRating = filters.companyRating.toString();
  }

  // Company size filter
  const employeeCount = mapCompanySize(filters.companySize);
  if (employeeCount) {
    params.employerSizes = employeeCount;
  }

  // Job type filter
  const jobType = mapJobType(filters.jobType);
  if (jobType) {
    params.jobType = jobType;
  }

  // Industry filter
  if (filters.industry) {
    params.industry = filters.industry;
  }

  // Company name filter
  if (filters.companyName) {
    params.employer = filters.companyName;
  }

  // Build query string
  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  return `${BASE_URL}${JOBS_PATH}${queryString ? '?' + queryString : ''}`;
}

/**
 * Build a Glassdoor job detail page URL from job ID
 */
export function buildJobDetailUrl(jobId: string): string {
  return `${BASE_URL}/job-listing/j?jl=${jobId}`;
}

/**
 * Build a Glassdoor company reviews URL
 */
export function buildCompanyReviewsUrl(companyName: string): string {
  const slug = companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `${BASE_URL}/Reviews/${slug}-reviews-SRCH_IL.htm`;
}

/**
 * Extract job ID from a Glassdoor job URL
 */
export function extractJobIdFromUrl(url: string): string | null {
  // Pattern 1: /job-listing/j?jl=123456
  const jlMatch = url.match(/[?&]jl=(\d+)/);
  if (jlMatch) {
    return jlMatch[1];
  }

  // Pattern 2: /partner/jobListing.htm?...&jobListingId=123456
  const jobListingIdMatch = url.match(/jobListingId=(\d+)/);
  if (jobListingIdMatch) {
    return jobListingIdMatch[1];
  }

  // Pattern 3: jobs in URL path like /Job/...-JV_...
  const pathMatch = url.match(/-JV_(\d+)/);
  if (pathMatch) {
    return pathMatch[1];
  }

  return null;
}

export default {
  buildGlassdoorSearchUrl,
  buildJobDetailUrl,
  buildCompanyReviewsUrl,
  extractJobIdFromUrl
};
