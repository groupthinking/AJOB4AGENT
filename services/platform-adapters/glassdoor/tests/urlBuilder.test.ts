import {
  buildGlassdoorSearchUrl,
  buildJobDetailUrl,
  buildCompanyReviewsUrl,
  extractJobIdFromUrl
} from '../src/utils/urlBuilder';
import { GlassdoorSearchFilters } from '../src/types';

describe('URL Builder Utils', () => {
  describe('buildGlassdoorSearchUrl', () => {
    it('should build basic search URL with keywords', () => {
      const filters: GlassdoorSearchFilters = {
        keywords: 'software engineer'
      };

      const url = buildGlassdoorSearchUrl(filters);

      expect(url).toContain('https://www.glassdoor.com/Job/jobs.htm');
    });

    it('should include location parameter', () => {
      const filters: GlassdoorSearchFilters = {
        keywords: 'developer',
        location: 'New York, NY'
      };

      const url = buildGlassdoorSearchUrl(filters);

      expect(url).toContain('locT=C');
      expect(url).toContain('locKeyword=New%20York%2C%20NY');
    });

    it('should include remote filter', () => {
      const filters: GlassdoorSearchFilters = {
        keywords: 'engineer',
        remote: true
      };

      const url = buildGlassdoorSearchUrl(filters);

      expect(url).toContain('remoteWorkType=1');
    });

    it('should include salary filters', () => {
      const filters: GlassdoorSearchFilters = {
        keywords: 'engineer',
        salary: { min: 100000, max: 200000 }
      };

      const url = buildGlassdoorSearchUrl(filters);

      expect(url).toContain('minSalary=100000');
      expect(url).toContain('maxSalary=200000');
    });

    it('should map datePosted to fromAge parameter', () => {
      const filters24h: GlassdoorSearchFilters = {
        keywords: 'engineer',
        datePosted: '24h'
      };

      const url24h = buildGlassdoorSearchUrl(filters24h);
      expect(url24h).toContain('fromAge=1');

      const filtersWeek: GlassdoorSearchFilters = {
        keywords: 'engineer',
        datePosted: 'week'
      };

      const urlWeek = buildGlassdoorSearchUrl(filtersWeek);
      expect(urlWeek).toContain('fromAge=7');

      const filtersMonth: GlassdoorSearchFilters = {
        keywords: 'engineer',
        datePosted: 'month'
      };

      const urlMonth = buildGlassdoorSearchUrl(filtersMonth);
      expect(urlMonth).toContain('fromAge=30');
    });

    it('should include Easy Apply filter', () => {
      const filters: GlassdoorSearchFilters = {
        keywords: 'engineer',
        easyApplyOnly: true
      };

      const url = buildGlassdoorSearchUrl(filters);

      expect(url).toContain('applicationType=1');
    });

    it('should include company rating filter', () => {
      const filters: GlassdoorSearchFilters = {
        keywords: 'engineer',
        companyRating: 4
      };

      const url = buildGlassdoorSearchUrl(filters);

      expect(url).toContain('minRating=4');
    });

    it('should not include invalid rating values', () => {
      const filters: GlassdoorSearchFilters = {
        keywords: 'engineer',
        companyRating: 6 // Invalid, should be 1-5
      };

      const url = buildGlassdoorSearchUrl(filters);

      expect(url).not.toContain('minRating');
    });

    it('should build URL with multiple filters', () => {
      const filters: GlassdoorSearchFilters = {
        keywords: 'senior software engineer',
        location: 'San Francisco, CA',
        remote: true,
        salary: { min: 150000 },
        datePosted: 'week',
        easyApplyOnly: true,
        companyRating: 4
      };

      const url = buildGlassdoorSearchUrl(filters);

      // Just verify key parameters are present (encoding may vary)
      expect(url).toContain('locKeyword=San%20Francisco');
      expect(url).toContain('remoteWorkType=1');
      expect(url).toContain('minSalary=150000');
      expect(url).toContain('fromAge=7');
      expect(url).toContain('applicationType=1');
      expect(url).toContain('minRating=4');
    });
  });

  describe('buildJobDetailUrl', () => {
    it('should build job detail URL from job ID', () => {
      const url = buildJobDetailUrl('123456');

      expect(url).toBe('https://www.glassdoor.com/job-listing/j?jl=123456');
    });
  });

  describe('buildCompanyReviewsUrl', () => {
    it('should build company reviews URL from company name', () => {
      const url = buildCompanyReviewsUrl('Google');

      expect(url).toContain('https://www.glassdoor.com/Reviews/');
      expect(url).toContain('google');
    });

    it('should handle company names with spaces', () => {
      const url = buildCompanyReviewsUrl('Goldman Sachs');

      expect(url).toContain('goldman-sachs');
    });

    it('should remove special characters from company name', () => {
      const url = buildCompanyReviewsUrl('AT&T Inc.');

      expect(url).not.toContain('&');
      // The slug portion should not contain the period from the company name
      expect(url).toContain('att-inc-reviews');
    });
  });

  describe('extractJobIdFromUrl', () => {
    it('should extract job ID from jl parameter', () => {
      const url = 'https://www.glassdoor.com/job-listing/j?jl=123456';
      const id = extractJobIdFromUrl(url);

      expect(id).toBe('123456');
    });

    it('should extract job ID from jobListingId parameter', () => {
      const url = 'https://www.glassdoor.com/partner/jobListing.htm?pos=101&jobListingId=789012';
      const id = extractJobIdFromUrl(url);

      expect(id).toBe('789012');
    });

    it('should extract job ID from URL path pattern', () => {
      const url = 'https://www.glassdoor.com/Job/senior-software-engineer-JV_456789.htm';
      const id = extractJobIdFromUrl(url);

      expect(id).toBe('456789');
    });

    it('should return null for URLs without job ID', () => {
      const url = 'https://www.glassdoor.com/Jobs/jobs.htm';
      const id = extractJobIdFromUrl(url);

      expect(id).toBeNull();
    });
  });
});
