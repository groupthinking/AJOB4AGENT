/**
 * LinkedIn Job Scraper Adapter
 *
 * A robust LinkedIn job scraper using Playwright for browser automation.
 * Supports filters, rate limiting, and exports to unified job pipeline format.
 *
 * @example
 * ```typescript
 * import { LinkedInJobScraper } from '@ajob4agent/linkedin-adapter';
 *
 * const scraper = new LinkedInJobScraper({
 *   headless: true,
 *   throttleMs: 3000,
 *   maxResults: 50
 * });
 *
 * const jobs = await scraper.search({
 *   keywords: 'software engineer',
 *   location: 'San Francisco, CA',
 *   remote: true,
 *   datePosted: 'week'
 * });
 *
 * await scraper.exportToJson(jobs, './output/linkedin-jobs.json');
 * await scraper.close();
 * ```
 */

// Main scraper class
export { LinkedInJobScraper } from './LinkedInJobScraper';

// Base scraper class
export { BaseJobScraper } from './BaseJobScraper';

// Types
export {
  Job,
  SearchFilters,
  ScraperConfig,
  SearchResult,
  LinkedInScraperConfig,
  LinkedInSearchParams,
  CaptchaDetection,
  ScrapingSession,
  PaginationState,
  LinkedInJobCard,
  LINKEDIN_EXPERIENCE_LEVELS,
  LINKEDIN_DATE_POSTED,
  LINKEDIN_WORKPLACE_TYPES,
} from './types';

// Utilities
export {
  createBrowser,
  createStealthContext,
  createStealthPage,
  safeNavigate,
  waitForElement,
  humanMouseMove,
  humanScroll,
} from './utils/browser';

export {
  parseJobCards,
  parseJobDetails,
  parseDate,
  cleanText,
  extractSalary,
} from './utils/parser';

export {
  ThrottleManager,
  createThrottledFunction,
} from './utils/throttle';

export type { ThrottleConfig } from './utils/throttle';
