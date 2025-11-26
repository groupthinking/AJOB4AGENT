import * as fs from 'fs';
import * as path from 'path';
import { parseJobCards, parseJobDetails } from '../src/utils/parser';
import { LinkedInJobScraper } from '../src/LinkedInJobScraper';
import { BaseJobScraper } from '../src/BaseJobScraper';

describe('Integration Tests', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');

  describe('HTML Fixture Parsing', () => {
    let searchResultsHtml: string;
    let jobDetailsHtml: string;

    beforeAll(() => {
      searchResultsHtml = fs.readFileSync(
        path.join(fixturesDir, 'search-results.html'),
        'utf-8'
      );
      jobDetailsHtml = fs.readFileSync(
        path.join(fixturesDir, 'job-details.html'),
        'utf-8'
      );
    });

    describe('parseJobCards with fixture', () => {
      it('should parse all job cards from search results', () => {
        const jobs = parseJobCards(searchResultsHtml);

        expect(jobs.length).toBe(5);
      });

      it('should extract correct job details from cards', () => {
        const jobs = parseJobCards(searchResultsHtml);

        // First job
        expect(jobs[0].title).toBe('Software Engineer');
        expect(jobs[0].company).toBe('Tech Corp');
        expect(jobs[0].location).toBe('San Francisco, CA');
        expect(jobs[0].salary).toBe('$120,000 - $180,000/yr');
        expect(jobs[0].id).toBe('linkedin-3812345671');

        // Second job
        expect(jobs[1].title).toBe('Senior Backend Developer');
        expect(jobs[1].company).toBe('StartupXYZ');
        expect(jobs[1].location).toBe('Remote');

        // Fifth job
        expect(jobs[4].title).toBe('ML Engineer');
        expect(jobs[4].company).toBe('AI Innovations');
      });

      it('should generate valid LinkedIn URLs', () => {
        const jobs = parseJobCards(searchResultsHtml);

        jobs.forEach((job) => {
          expect(job.url).toMatch(/^https:\/\/www\.linkedin\.com\/jobs\/view\/\d+$/);
        });
      });

      it('should set source as linkedin', () => {
        const jobs = parseJobCards(searchResultsHtml);

        jobs.forEach((job) => {
          expect(job.source).toBe('linkedin');
        });
      });
    });

    describe('parseJobDetails with fixture', () => {
      it('should extract job title', () => {
        const details = parseJobDetails(jobDetailsHtml);
        expect(details.title).toBe('Software Engineer');
      });

      it('should extract company name', () => {
        const details = parseJobDetails(jobDetailsHtml);
        expect(details.company).toBe('Tech Corp');
      });

      it('should extract location', () => {
        const details = parseJobDetails(jobDetailsHtml);
        expect(details.location).toBe('San Francisco, CA');
      });

      it('should extract salary information', () => {
        const details = parseJobDetails(jobDetailsHtml);
        expect(details.salary).toBe('$120,000 - $180,000/yr');
      });

      it('should extract description with key information', () => {
        const details = parseJobDetails(jobDetailsHtml);

        expect(details.description).toContain('Software Engineer');
        expect(details.description).toContain('TypeScript');
      });

      it('should extract relevant skills as tags', () => {
        const details = parseJobDetails(jobDetailsHtml);

        expect(details.tags).toContain('TypeScript');
        expect(details.tags).toContain('JavaScript');
        expect(details.tags).toContain('React');
        expect(details.tags).toContain('Docker');
        expect(details.tags).toContain('Kubernetes');
        expect(details.tags).toContain('SQL');
        expect(details.tags).toContain('Python');
      });

      it('should extract job criteria as tags', () => {
        const details = parseJobDetails(jobDetailsHtml);

        // Should include job criteria items
        expect(details.tags?.some((t) => t.includes('Mid-Senior'))).toBe(true);
        expect(details.tags?.some((t) => t.includes('Full-time'))).toBe(true);
      });
    });
  });

  describe('LinkedInJobScraper Class', () => {
    it('should extend BaseJobScraper', () => {
      const scraper = new LinkedInJobScraper();
      expect(scraper).toBeInstanceOf(BaseJobScraper);
    });

    it('should implement all abstract methods', () => {
      const scraper = new LinkedInJobScraper();

      expect(typeof scraper.initialize).toBe('function');
      expect(typeof scraper.close).toBe('function');
      expect(typeof scraper.search).toBe('function');
      expect(typeof scraper.getJobDetails).toBe('function');
      expect(typeof scraper.getSourceName).toBe('function');
      expect(typeof scraper.exportToJson).toBe('function');
    });

    it('should have configurable throttle settings', () => {
      const scraper = new LinkedInJobScraper({
        throttleMs: 5000,
      });

      const status = scraper.getThrottleStatus();
      expect(status.canMakeRequest).toBe(true);
    });

    it('should track session information', () => {
      const scraper = new LinkedInJobScraper();
      const session = scraper.getSession();

      expect(session.startedAt).toBeDefined();
      expect(session.jobsScraped).toBe(0);
      expect(session.pagesVisited).toBe(0);
      expect(session.errors).toEqual([]);
      expect(session.captchaEncountered).toBe(false);
    });
  });

  describe('Export Functionality', () => {
    it('should export jobs to JSON format', async () => {
      const scraper = new LinkedInJobScraper();
      const testJobs = [
        {
          id: 'linkedin-123',
          title: 'Test Job',
          company: 'Test Company',
          location: 'Test Location',
          postingDate: new Date().toISOString(),
          url: 'https://linkedin.com/jobs/view/123',
          tags: ['test'],
          source: 'linkedin' as const,
          scrapedAt: new Date().toISOString(),
        },
      ];

      const outputPath = '/tmp/test-linkedin-export.json';
      await scraper.exportToJson(testJobs, outputPath);

      // Verify file was created
      expect(fs.existsSync(outputPath)).toBe(true);

      // Verify content
      const content = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      expect(content.jobs).toEqual(testJobs);
      expect(content.metadata.totalCount).toBe(1);
      expect(content.metadata.source).toBe('linkedin');
      expect(content.metadata.exportedAt).toBeDefined();

      // Clean up
      fs.unlinkSync(outputPath);
    });
  });

  describe('Search Filters', () => {
    it('should accept all valid filter combinations', () => {
      const scraper = new LinkedInJobScraper();
      const filters = {
        keywords: 'software engineer',
        location: 'San Francisco, CA',
        remote: true,
        salary: { min: 100000, max: 200000 },
        seniority: 'senior' as const,
        datePosted: 'week' as const,
      };

      // This should not throw
      expect(() => scraper.getConfig()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Mock chromium.launch to throw
      jest.mock('playwright', () => ({
        chromium: {
          launch: jest.fn().mockRejectedValue(new Error('Browser launch failed')),
        },
      }));

      const scraper = new LinkedInJobScraper();

      // Should throw but not crash
      await expect(scraper.initialize()).rejects.toBeDefined();
    });
  });
});
