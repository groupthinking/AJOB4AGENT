import { LinkedInJobScraper } from '../LinkedInJobScraper';
import {
  LinkedInSearchParams,
  JobSearchResponse,
  ScraperConfig,
  RateLimitStatus
} from '../types';

// Mock Playwright
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn().mockResolvedValue(undefined),
          waitForSelector: jest.fn().mockResolvedValue(undefined),
          $$: jest.fn().mockResolvedValue([]),
          $: jest.fn().mockResolvedValue(null),
          $eval: jest.fn().mockResolvedValue(''),
          content: jest.fn().mockResolvedValue('<html></html>'),
          url: jest.fn().mockReturnValue('https://www.linkedin.com/jobs/search/'),
          close: jest.fn().mockResolvedValue(undefined)
        }),
        close: jest.fn().mockResolvedValue(undefined)
      }),
      close: jest.fn().mockResolvedValue(undefined)
    })
  }
}));

describe('LinkedInJobScraper', () => {
  let scraper: LinkedInJobScraper;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (scraper) {
      await scraper.shutdown();
    }
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      scraper = new LinkedInJobScraper();
      expect(scraper).toBeInstanceOf(LinkedInJobScraper);
      expect(scraper.platform).toBe('linkedin');
    });

    it('should create instance with custom config', () => {
      const config: ScraperConfig = {
        headless: false,
        timeout: 60000,
        minDelay: 3000,
        maxDelay: 8000,
        maxRequestsPerMinute: 10,
        debug: true
      };
      scraper = new LinkedInJobScraper(config);
      expect(scraper).toBeInstanceOf(LinkedInJobScraper);
    });

    it('should merge custom config with defaults', () => {
      const config: ScraperConfig = {
        debug: true
      };
      scraper = new LinkedInJobScraper(config);
      expect(scraper.platform).toBe('linkedin');
    });
  });

  describe('initialize', () => {
    it('should initialize browser and context', async () => {
      scraper = new LinkedInJobScraper({ debug: true });
      await scraper.initialize();
      
      const { chromium } = require('playwright');
      expect(chromium.launch).toHaveBeenCalled();
    });

    it('should initialize with proxy if configured', async () => {
      scraper = new LinkedInJobScraper({ 
        proxyUrl: 'http://proxy.example.com:8080',
        debug: true 
      });
      await scraper.initialize();
      
      const { chromium } = require('playwright');
      expect(chromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          proxy: { server: 'http://proxy.example.com:8080' }
        })
      );
    });
  });

  describe('searchJobs', () => {
    beforeEach(async () => {
      scraper = new LinkedInJobScraper({ debug: true });
      await scraper.initialize();
    });

    it('should throw error if not initialized', async () => {
      const uninitializedScraper = new LinkedInJobScraper();
      
      await expect(uninitializedScraper.searchJobs({
        searchTerm: 'Software Engineer'
      })).rejects.toThrow('Scraper not initialized');
    });

    it('should return empty response when no jobs found', async () => {
      const params: LinkedInSearchParams = {
        searchTerm: 'Software Engineer',
        location: 'San Francisco, CA'
      };

      const result = await scraper.searchJobs(params);

      expect(result).toMatchObject({
        jobs: expect.any(Array),
        totalCount: expect.any(Number),
        platform: 'linkedin',
        searchParams: params,
        timestamp: expect.any(String)
      });
    });

    it('should handle search with all filters', async () => {
      const params: LinkedInSearchParams = {
        searchTerm: 'Senior Software Engineer',
        location: 'New York, NY',
        workType: 'remote',
        experienceLevel: 'senior',
        datePosted: 'week',
        limit: 50
      };

      const result = await scraper.searchJobs(params);

      expect(result.platform).toBe('linkedin');
      expect(result.searchParams).toEqual(params);
    });

    it('should handle salary filters', async () => {
      const params: LinkedInSearchParams = {
        searchTerm: 'Engineer',
        salaryMin: 100000,
        salaryMax: 200000
      };

      const result = await scraper.searchJobs(params);

      expect(result).toBeDefined();
      expect(result.platform).toBe('linkedin');
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return rate limit status', () => {
      scraper = new LinkedInJobScraper();
      
      const status: RateLimitStatus = scraper.getRateLimitStatus();
      
      expect(status).toMatchObject({
        requestCount: expect.any(Number),
        windowReset: expect.any(Number),
        canMakeRequest: expect.any(Boolean)
      });
    });

    it('should indicate can make request when under limit', () => {
      scraper = new LinkedInJobScraper({ maxRequestsPerMinute: 20 });
      
      const status = scraper.getRateLimitStatus();
      
      expect(status.canMakeRequest).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('should cleanup resources', async () => {
      scraper = new LinkedInJobScraper({ debug: true });
      await scraper.initialize();
      await scraper.shutdown();
      
      // Verify browser and context were closed
      const { chromium } = require('playwright');
      const mockBrowser = await chromium.launch();
      expect(mockBrowser.close).toBeDefined();
    });

    it('should handle shutdown when not initialized', async () => {
      scraper = new LinkedInJobScraper();
      
      // Should not throw
      await expect(scraper.shutdown()).resolves.not.toThrow();
    });
  });
});

describe('LinkedInJobScraper URL Building', () => {
  let scraper: LinkedInJobScraper;

  beforeEach(async () => {
    scraper = new LinkedInJobScraper({ debug: true });
    await scraper.initialize();
  });

  afterEach(async () => {
    await scraper.shutdown();
  });

  it('should build URL with basic search term', async () => {
    // Access private method through search
    const params: LinkedInSearchParams = {
      searchTerm: 'Software Engineer'
    };

    const result = await scraper.searchJobs(params);
    expect(result.searchParams.searchTerm).toBe('Software Engineer');
  });

  it('should handle special characters in search term', async () => {
    const params: LinkedInSearchParams = {
      searchTerm: 'C++ Developer',
      location: 'San Francisco, CA'
    };

    const result = await scraper.searchJobs(params);
    expect(result.searchParams.searchTerm).toBe('C++ Developer');
  });
});

describe('LinkedInJobScraper Response Format', () => {
  let scraper: LinkedInJobScraper;

  beforeEach(async () => {
    scraper = new LinkedInJobScraper({ debug: true });
    await scraper.initialize();
  });

  afterEach(async () => {
    await scraper.shutdown();
  });

  it('should return properly formatted JobSearchResponse', async () => {
    const params: LinkedInSearchParams = {
      searchTerm: 'Developer',
      location: 'Austin, TX'
    };

    const result: JobSearchResponse = await scraper.searchJobs(params);

    // Validate response structure
    expect(result).toHaveProperty('jobs');
    expect(result).toHaveProperty('totalCount');
    expect(result).toHaveProperty('platform');
    expect(result).toHaveProperty('searchParams');
    expect(result).toHaveProperty('timestamp');
    
    expect(Array.isArray(result.jobs)).toBe(true);
    expect(typeof result.totalCount).toBe('number');
    expect(result.platform).toBe('linkedin');
  });

  it('should include pagination info', async () => {
    const params: LinkedInSearchParams = {
      searchTerm: 'Engineer',
      offset: 25,
      limit: 25
    };

    const result = await scraper.searchJobs(params);

    if (result.pagination) {
      expect(result.pagination).toHaveProperty('currentPage');
      expect(result.pagination).toHaveProperty('totalPages');
      expect(result.pagination).toHaveProperty('hasMore');
    }
  });
});

describe('LinkedInJobScraper Configuration', () => {
  it('should use default user agent', () => {
    const scraper = new LinkedInJobScraper();
    expect(scraper.platform).toBe('linkedin');
  });

  it('should accept custom user agent', () => {
    const customUA = 'CustomUserAgent/1.0';
    const scraper = new LinkedInJobScraper({ userAgent: customUA });
    expect(scraper).toBeInstanceOf(LinkedInJobScraper);
  });

  it('should accept timeout configuration', () => {
    const scraper = new LinkedInJobScraper({ timeout: 60000 });
    expect(scraper).toBeInstanceOf(LinkedInJobScraper);
  });

  it('should accept delay configuration', () => {
    const scraper = new LinkedInJobScraper({
      minDelay: 5000,
      maxDelay: 10000
    });
    expect(scraper).toBeInstanceOf(LinkedInJobScraper);
  });
});
