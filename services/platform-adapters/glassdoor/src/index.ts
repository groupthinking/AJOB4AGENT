/**
 * Glassdoor Platform Adapter
 * 
 * A job scraping adapter for Glassdoor that extends the BaseJobScraper
 * to provide comprehensive job search and data extraction capabilities.
 * 
 * @example
 * ```typescript
 * import { GlassdoorJobScraper } from '@platform-adapters/glassdoor';
 * 
 * const scraper = new GlassdoorJobScraper({
 *   headless: true,
 *   throttleMs: 3000,
 *   maxResults: 50
 * });
 * 
 * const jobs = await scraper.search({
 *   keywords: 'software engineer',
 *   location: 'New York, NY',
 *   remote: true,
 *   companyRating: 4,
 *   easyApplyOnly: true
 * });
 * 
 * await scraper.close();
 * ```
 */

// Main scraper class
export { GlassdoorJobScraper } from './GlassdoorJobScraper';
export { default as GlassdoorJobScraperDefault } from './GlassdoorJobScraper';

// Base types
export { Job, SearchFilters, ScraperConfig, JobSearchResult } from './base/types';
export { BaseJobScraper } from './base/BaseJobScraper';

// Types
export {
  GlassdoorJob,
  GlassdoorSearchFilters,
  GlassdoorScraperConfig,
  RawJobCard,
  RawJobDetail
} from './types';

// Utilities
export {
  buildGlassdoorSearchUrl,
  buildJobDetailUrl,
  buildCompanyReviewsUrl,
  extractJobIdFromUrl
} from './utils/urlBuilder';

export {
  parseJobListHtml,
  parseJobDetailHtml,
  transformRawJobCard,
  parseSalaryEstimate,
  hasNextPageButton
} from './utils/parser';

export {
  parseRating,
  parseReviewCount,
  getRatingCategory,
  formatRating,
  formatReviewCount,
  isValidRating,
  calculateAverageRating
} from './utils/ratingParser';
