import { parseJobCards, parseJobDetails, parseDate, cleanText, extractSalary } from '../src/utils/parser';
import { ThrottleManager } from '../src/utils/throttle';
import { LinkedInJobScraper } from '../src/LinkedInJobScraper';
import { LINKEDIN_EXPERIENCE_LEVELS, LINKEDIN_DATE_POSTED } from '../src/types';

// Mock Playwright
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        addCookies: jest.fn().mockResolvedValue(undefined),
        addInitScript: jest.fn().mockResolvedValue(undefined),
        newPage: jest.fn().mockResolvedValue({
          setDefaultTimeout: jest.fn(),
          goto: jest.fn().mockResolvedValue(null),
          content: jest.fn().mockResolvedValue('<html></html>'),
          waitForSelector: jest.fn().mockResolvedValue(null),
          waitForTimeout: jest.fn().mockResolvedValue(null),
          mouse: {
            move: jest.fn().mockResolvedValue(undefined),
            wheel: jest.fn().mockResolvedValue(undefined),
          },
          $: jest.fn().mockResolvedValue(null),
          close: jest.fn().mockResolvedValue(undefined),
        }),
        close: jest.fn().mockResolvedValue(undefined),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('LinkedIn Job Scraper', () => {
  describe('Parser Utils', () => {
    describe('parseJobCards', () => {
      it('should parse job cards from HTML', () => {
        const html = `
          <ul class="jobs-search__results-list">
            <li class="job-search-card" data-job-id="12345">
              <a href="/jobs/view/12345">
                <h3 class="base-search-card__title">Software Engineer</h3>
              </a>
              <h4 class="base-search-card__subtitle">Test Company</h4>
              <span class="job-search-card__location">San Francisco, CA</span>
              <time datetime="2024-01-15">2 days ago</time>
            </li>
          </ul>
        `;

        const jobs = parseJobCards(html);

        expect(jobs.length).toBe(1);
        expect(jobs[0].title).toBe('Software Engineer');
        expect(jobs[0].company).toBe('Test Company');
        expect(jobs[0].location).toBe('San Francisco, CA');
        expect(jobs[0].id).toBe('linkedin-12345');
      });

      it('should handle empty HTML', () => {
        const jobs = parseJobCards('<html></html>');
        expect(jobs.length).toBe(0);
      });

      it('should parse multiple job cards', () => {
        const html = `
          <div class="jobs-search__results-list">
            <div class="job-search-card" data-job-id="111">
              <h3 class="base-search-card__title">Job 1</h3>
              <h4 class="base-search-card__subtitle">Company 1</h4>
            </div>
            <div class="job-search-card" data-job-id="222">
              <h3 class="base-search-card__title">Job 2</h3>
              <h4 class="base-search-card__subtitle">Company 2</h4>
            </div>
          </div>
        `;

        const jobs = parseJobCards(html);
        expect(jobs.length).toBe(2);
      });
    });

    describe('parseJobDetails', () => {
      it('should parse job details from HTML', () => {
        const html = `
          <div class="job-details">
            <h1 class="top-card-layout__title">Senior Developer</h1>
            <a class="topcard__org-name-link">Great Company</a>
            <span class="topcard__flavor--bullet">New York, NY</span>
            <div class="description__text">
              We are looking for a skilled developer with TypeScript experience.
            </div>
            <span class="posted-time-ago__text">1 week ago</span>
          </div>
        `;

        const details = parseJobDetails(html);

        expect(details.title).toBe('Senior Developer');
        expect(details.company).toBe('Great Company');
        expect(details.location).toBe('New York, NY');
        expect(details.description).toContain('TypeScript');
        expect(details.tags).toContain('TypeScript');
      });

      it('should extract skills from description', () => {
        const html = `
          <div class="description__text">
            Requirements: JavaScript, Python, React, AWS, Docker
          </div>
        `;

        const details = parseJobDetails(html);
        expect(details.tags).toContain('JavaScript');
        expect(details.tags).toContain('Python');
        expect(details.tags).toContain('React');
      });
    });

    describe('parseDate', () => {
      it('should parse ISO format date', () => {
        const result = parseDate('2024-01-15T12:00:00Z');
        expect(result).toMatch(/2024-01-15/);
      });

      it('should parse "just now"', () => {
        const result = parseDate('just now');
        const now = new Date();
        expect(new Date(result).getDate()).toBe(now.getDate());
      });

      it('should parse hours ago', () => {
        const result = parseDate('5 hours ago');
        const parsed = new Date(result);
        const expected = new Date(Date.now() - 5 * 60 * 60 * 1000);
        // Allow 1 minute difference for test execution time
        expect(Math.abs(parsed.getTime() - expected.getTime())).toBeLessThan(60000);
      });

      it('should parse days ago', () => {
        const result = parseDate('3 days ago');
        const parsed = new Date(result);
        const expected = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        expect(Math.abs(parsed.getTime() - expected.getTime())).toBeLessThan(60000);
      });

      it('should parse weeks ago', () => {
        const result = parseDate('2 weeks ago');
        const parsed = new Date(result);
        const expected = new Date(Date.now() - 2 * 7 * 24 * 60 * 60 * 1000);
        expect(Math.abs(parsed.getTime() - expected.getTime())).toBeLessThan(60000);
      });

      it('should return current date for empty string', () => {
        const result = parseDate('');
        const now = new Date();
        expect(new Date(result).getDate()).toBe(now.getDate());
      });
    });

    describe('cleanText', () => {
      it('should normalize whitespace', () => {
        expect(cleanText('  hello   world  ')).toBe('hello world');
      });

      it('should remove newlines', () => {
        expect(cleanText('hello\n\nworld')).toBe('hello world');
      });
    });

    describe('extractSalary', () => {
      it('should extract salary range', () => {
        const result = extractSalary('Salary: $100,000 - $150,000 per year');
        expect(result).toBe('$100,000 - $150,000');
      });

      it('should extract single salary', () => {
        const result = extractSalary('Pay: $75,000/year');
        expect(result).toBe('$75,000/year');
      });

      it('should extract k format salary', () => {
        const result = extractSalary('Compensation: 120k - 180k');
        expect(result).toBe('120k - 180k');
      });

      it('should return undefined for no salary', () => {
        const result = extractSalary('No compensation listed');
        expect(result).toBeUndefined();
      });
    });
  });

  describe('ThrottleManager', () => {
    it('should create with default config', () => {
      const throttle = new ThrottleManager();
      const config = throttle.getConfig();

      expect(config.minDelayMs).toBe(2000);
      expect(config.maxDelayMs).toBe(5000);
      expect(config.requestsPerWindow).toBe(25);
    });

    it('should create with custom config', () => {
      const throttle = new ThrottleManager({
        minDelayMs: 1000,
        maxDelayMs: 3000,
      });
      const config = throttle.getConfig();

      expect(config.minDelayMs).toBe(1000);
      expect(config.maxDelayMs).toBe(3000);
    });

    it('should report correct status initially', () => {
      const throttle = new ThrottleManager();
      const status = throttle.getStatus();

      expect(status.requestsInWindow).toBe(0);
      expect(status.canMakeRequest).toBe(true);
    });

    it('should reset correctly', () => {
      const throttle = new ThrottleManager();
      throttle.reset();
      const status = throttle.getStatus();

      expect(status.requestsInWindow).toBe(0);
    });

    it('should update config', () => {
      const throttle = new ThrottleManager();
      throttle.updateConfig({ minDelayMs: 5000 });
      const config = throttle.getConfig();

      expect(config.minDelayMs).toBe(5000);
    });
  });

  describe('LinkedInJobScraper', () => {
    let scraper: LinkedInJobScraper;

    beforeEach(() => {
      scraper = new LinkedInJobScraper({
        headless: true,
        throttleMs: 100, // Fast for tests
        maxResults: 10,
      });
    });

    afterEach(async () => {
      await scraper.close();
    });

    it('should create with default config', () => {
      const defaultScraper = new LinkedInJobScraper();
      const config = defaultScraper.getConfig();

      expect(config.headless).toBe(true);
      expect(config.maxResults).toBe(50);
    });

    it('should create with custom config', () => {
      const config = scraper.getConfig();

      expect(config.maxResults).toBe(10);
      expect(config.throttleMs).toBe(100);
    });

    it('should get source name', () => {
      expect(scraper.getSourceName()).toBe('linkedin');
    });

    it('should not be ready before initialization', () => {
      expect(scraper.isReady()).toBe(false);
    });

    it('should be ready after initialization', async () => {
      await scraper.initialize();
      expect(scraper.isReady()).toBe(true);
    });

    it('should initialize only once', async () => {
      await scraper.initialize();
      await scraper.initialize(); // Should not throw
      expect(scraper.isReady()).toBe(true);
    });

    it('should get session info', () => {
      const session = scraper.getSession();

      expect(session.jobsScraped).toBe(0);
      expect(session.pagesVisited).toBe(0);
      expect(session.captchaEncountered).toBe(false);
    });

    it('should get throttle status', () => {
      const status = scraper.getThrottleStatus();

      expect(status.canMakeRequest).toBe(true);
      expect(status.requestsInWindow).toBe(0);
    });

    it('should update throttle config', () => {
      scraper.setThrottleConfig({ minDelayMs: 5000 });
      // Verify through throttle status behavior
      const status = scraper.getThrottleStatus();
      expect(status.canMakeRequest).toBe(true);
    });
  });

  describe('Type Constants', () => {
    it('should have correct experience level mappings', () => {
      expect(LINKEDIN_EXPERIENCE_LEVELS.entry).toBe('1,2');
      expect(LINKEDIN_EXPERIENCE_LEVELS.mid).toBe('3,4');
      expect(LINKEDIN_EXPERIENCE_LEVELS.senior).toBe('5');
      expect(LINKEDIN_EXPERIENCE_LEVELS.executive).toBe('6');
    });

    it('should have correct date posted mappings', () => {
      expect(LINKEDIN_DATE_POSTED['24h']).toBe('r86400');
      expect(LINKEDIN_DATE_POSTED['week']).toBe('r604800');
      expect(LINKEDIN_DATE_POSTED['month']).toBe('r2592000');
    });
  });
});
