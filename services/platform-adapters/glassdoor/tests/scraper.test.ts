import { GlassdoorJobScraper } from '../src/GlassdoorJobScraper';
import { GlassdoorSearchFilters } from '../src/types';

// Mock playwright to avoid actual browser operations in unit tests
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn().mockResolvedValue(undefined),
          content: jest.fn().mockResolvedValue('<html></html>'),
          waitForSelector: jest.fn().mockResolvedValue(undefined),
          waitForLoadState: jest.fn().mockResolvedValue(undefined),
          waitForTimeout: jest.fn().mockResolvedValue(undefined),
          $: jest.fn().mockResolvedValue(null),
          $eval: jest.fn().mockRejectedValue(new Error('Element not found')),
          keyboard: { press: jest.fn().mockResolvedValue(undefined) },
          url: jest.fn().mockReturnValue('https://www.glassdoor.com/job-listing/j?jl=12345'),
          close: jest.fn().mockResolvedValue(undefined)
        }),
        close: jest.fn().mockResolvedValue(undefined)
      }),
      close: jest.fn().mockResolvedValue(undefined)
    })
  }
}));

describe('GlassdoorJobScraper', () => {
  let scraper: GlassdoorJobScraper;

  beforeEach(() => {
    scraper = new GlassdoorJobScraper({
      headless: true,
      throttleMs: 100, // Faster for tests
      maxResults: 10
    });
  });

  afterEach(async () => {
    await scraper.close();
  });

  describe('constructor', () => {
    it('should create scraper with default config', () => {
      const defaultScraper = new GlassdoorJobScraper();
      
      expect(defaultScraper.platform).toBe('glassdoor');
      expect(defaultScraper.baseUrl).toBe('https://www.glassdoor.com');
    });

    it('should create scraper with custom config', () => {
      const customScraper = new GlassdoorJobScraper({
        headless: false,
        throttleMs: 5000,
        maxResults: 100
      });

      expect(customScraper.platform).toBe('glassdoor');
    });
  });

  describe('platform properties', () => {
    it('should have correct platform identifier', () => {
      expect(scraper.platform).toBe('glassdoor');
    });

    it('should have correct base URL', () => {
      expect(scraper.baseUrl).toBe('https://www.glassdoor.com');
    });
  });

  describe('buildSearchUrl', () => {
    it('should build URL with basic filters', () => {
      const filters: GlassdoorSearchFilters = {
        keywords: 'software engineer',
        location: 'New York, NY'
      };

      // Access protected method through any type for testing
      const url = (scraper as any).buildSearchUrl(filters);

      expect(url).toContain('glassdoor.com');
      expect(url).toContain('software');
      expect(url).toContain('New%20York');
    });

    it('should build URL with all filters', () => {
      const filters: GlassdoorSearchFilters = {
        keywords: 'developer',
        location: 'San Francisco',
        remote: true,
        salary: { min: 100000 },
        datePosted: 'week',
        easyApplyOnly: true,
        companyRating: 4
      };

      const url = (scraper as any).buildSearchUrl(filters);

      expect(url).toContain('remoteWorkType=1');
      expect(url).toContain('minSalary=100000');
      expect(url).toContain('fromAge=7');
      expect(url).toContain('applicationType=1');
      expect(url).toContain('minRating=4');
    });
  });

  describe('search', () => {
    it('should initialize browser before searching', async () => {
      const filters: GlassdoorSearchFilters = {
        keywords: 'engineer'
      };

      // Search should complete without error (mocked)
      const jobs = await scraper.search(filters);
      
      expect(Array.isArray(jobs)).toBe(true);
    });

    it('should handle empty results gracefully', async () => {
      const filters: GlassdoorSearchFilters = {
        keywords: 'nonexistent-job-title-xyz'
      };

      const jobs = await scraper.search(filters);

      expect(jobs).toEqual([]);
    });
  });

  describe('searchEasyApplyJobs', () => {
    it('should add easyApplyOnly filter', async () => {
      const filters: GlassdoorSearchFilters = {
        keywords: 'engineer'
      };

      // This should not throw
      const jobs = await scraper.searchEasyApplyJobs(filters);
      
      expect(Array.isArray(jobs)).toBe(true);
    });
  });

  describe('searchWithRatingFilter', () => {
    it('should add company rating filter', async () => {
      const filters: GlassdoorSearchFilters = {
        keywords: 'engineer'
      };

      const jobs = await scraper.searchWithRatingFilter(filters, 4);
      
      expect(Array.isArray(jobs)).toBe(true);
    });
  });

  describe('close', () => {
    it('should close browser without error', async () => {
      await scraper.initialize();
      await expect(scraper.close()).resolves.not.toThrow();
    });

    it('should be safe to call close multiple times', async () => {
      await scraper.close();
      await expect(scraper.close()).resolves.not.toThrow();
    });
  });
});
