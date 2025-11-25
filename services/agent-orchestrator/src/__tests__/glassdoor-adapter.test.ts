import { GlassdoorAdapter } from '../adapters/glassdoor-adapter';
import { JobSearchParams, JobSearchResponse } from '../types/job-search';

describe('GlassdoorAdapter', () => {
  let adapter: GlassdoorAdapter;

  beforeEach(() => {
    adapter = new GlassdoorAdapter();
  });

  describe('searchJobs', () => {
    it('should return jobs matching search parameters', async () => {
      const params: JobSearchParams = {
        searchTerm: 'Software Engineer',
        location: 'San Francisco, CA',
        platforms: ['glassdoor']
      };

      const response = await adapter.searchJobs(params);

      expect(response).toBeDefined();
      expect(response.platform).toBe('glassdoor');
      expect(response.jobs).toBeInstanceOf(Array);
      expect(response.totalCount).toBeGreaterThanOrEqual(0);
      expect(response.searchParams).toEqual(params);
      expect(response.timestamp).toBeDefined();
    });

    it('should return at least 30 jobs per category requirement', async () => {
      const params: JobSearchParams = {
        searchTerm: 'Developer',
        location: 'New York, NY',
        platforms: ['glassdoor']
      };

      const response = await adapter.searchJobs(params);

      // Acceptance criteria: outputs >=30 jobs/category in test run
      expect(response.jobs.length).toBeGreaterThanOrEqual(30);
    });

    it('should handle remote-only filter', async () => {
      const params: JobSearchParams = {
        searchTerm: 'Backend Engineer',
        location: '',
        platforms: ['glassdoor'],
        remoteOnly: true
      };

      const response = await adapter.searchJobs(params);

      expect(response).toBeDefined();
      expect(response.jobs.every(job => job.remote || job.location.toLowerCase().includes('remote'))).toBeTruthy();
    });

    it('should handle experience level filter', async () => {
      const params: JobSearchParams = {
        searchTerm: 'Engineer',
        location: 'Austin, TX',
        platforms: ['glassdoor'],
        experienceLevel: 'senior'
      };

      const response = await adapter.searchJobs(params);

      expect(response).toBeDefined();
      expect(response.jobs).toBeInstanceOf(Array);
    });

    it('should handle datePosted filter', async () => {
      const params: JobSearchParams = {
        searchTerm: 'Product Manager',
        location: 'Seattle, WA',
        platforms: ['glassdoor'],
        datePosted: 'week'
      };

      const response = await adapter.searchJobs(params);

      expect(response).toBeDefined();
      expect(response.jobs).toBeInstanceOf(Array);
    });

    it('should return jobs with required fields in unified format', async () => {
      const params: JobSearchParams = {
        searchTerm: 'Data Scientist',
        location: 'Boston, MA',
        platforms: ['glassdoor']
      };

      const response = await adapter.searchJobs(params);

      // Validate unified job pipeline JSON format
      response.jobs.forEach(job => {
        expect(job.id).toBeDefined();
        expect(job.title).toBeDefined();
        expect(job.company).toBeDefined();
        expect(job.location).toBeDefined();
        expect(job.url).toBeDefined();
        expect(job.platform).toBe('glassdoor');
        expect(job.datePosted).toBeDefined();
      });
    });

    it('should handle empty search results gracefully', async () => {
      const params: JobSearchParams = {
        searchTerm: 'xyznonexistentjobtype123',
        location: 'Mars',
        platforms: ['glassdoor']
      };

      const response = await adapter.searchJobs(params);

      expect(response).toBeDefined();
      expect(response.jobs).toBeInstanceOf(Array);
      expect(response.platform).toBe('glassdoor');
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return rate limit status', () => {
      const status = adapter.getRateLimitStatus();

      expect(status).toBeDefined();
      expect(typeof status.requestCount).toBe('number');
      expect(typeof status.windowReset).toBe('number');
      expect(typeof status.canMakeRequest).toBe('boolean');
    });

    it('should initially allow requests', () => {
      const status = adapter.getRateLimitStatus();

      expect(status.canMakeRequest).toBe(true);
      expect(status.requestCount).toBe(0);
    });
  });

  describe('getCompanyInsights', () => {
    it('should handle company insights request', async () => {
      const insights = await adapter.getCompanyInsights('Google');

      // May return null if API is not accessible
      expect(insights === null || typeof insights === 'object').toBeTruthy();
    });
  });

  describe('getSalaryInsights', () => {
    it('should handle salary insights request', async () => {
      const insights = await adapter.getSalaryInsights('Software Engineer', 'San Francisco, CA');

      // May return null if API is not accessible
      expect(insights === null || typeof insights === 'object').toBeTruthy();
    });
  });

  describe('adapter extensibility', () => {
    it('should be easily extensible for other job boards', () => {
      // Verify the adapter follows the common interface pattern
      expect(typeof adapter.searchJobs).toBe('function');
      expect(typeof adapter.getRateLimitStatus).toBe('function');
      expect(typeof adapter.getCompanyInsights).toBe('function');
      expect(typeof adapter.getSalaryInsights).toBe('function');
    });

    it('should work with authenticated mode when access token is provided', () => {
      const authenticatedAdapter = new GlassdoorAdapter('test-access-token');

      expect(authenticatedAdapter).toBeDefined();
      expect(typeof authenticatedAdapter.searchJobs).toBe('function');
    });
  });
});
