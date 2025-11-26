import * as fs from 'fs';
import * as path from 'path';
import {
  parseJobListHtml,
  parseJobDetailHtml,
  transformRawJobCard,
  parseSalaryEstimate,
  hasNextPageButton
} from '../src/utils/parser';

// Load test fixtures
const fixturesPath = path.join(__dirname, 'fixtures');
const searchResultsHtml = fs.readFileSync(path.join(fixturesPath, 'search-results.html'), 'utf-8');
const jobDetailHtml = fs.readFileSync(path.join(fixturesPath, 'job-detail.html'), 'utf-8');

describe('Parser Utils', () => {
  describe('parseJobListHtml', () => {
    it('should parse job cards from search results HTML', () => {
      const jobs = parseJobListHtml(searchResultsHtml);
      
      expect(jobs).toHaveLength(5);
    });

    it('should extract job ID from data attribute', () => {
      const jobs = parseJobListHtml(searchResultsHtml);
      
      expect(jobs[0].id).toBe('123456');
      expect(jobs[1].id).toBe('234567');
    });

    it('should extract job title', () => {
      const jobs = parseJobListHtml(searchResultsHtml);
      
      expect(jobs[0].title).toBe('Senior Software Engineer');
      expect(jobs[1].title).toBe('Frontend Developer');
    });

    it('should extract company name', () => {
      const jobs = parseJobListHtml(searchResultsHtml);
      
      expect(jobs[0].company).toBe('Google');
      expect(jobs[1].company).toBe('Meta');
    });

    it('should extract location', () => {
      const jobs = parseJobListHtml(searchResultsHtml);
      
      expect(jobs[0].location).toBe('Mountain View, CA');
      expect(jobs[2].location).toBe('Seattle, WA (Remote)');
    });

    it('should extract salary when present', () => {
      const jobs = parseJobListHtml(searchResultsHtml);
      
      expect(jobs[0].salary).toBe('$150K - $200K');
      expect(jobs[3].salary).toBe('$100,000 - $150,000');
    });

    it('should handle missing salary', () => {
      const jobs = parseJobListHtml(searchResultsHtml);
      
      // Last job doesn't have salary
      expect(jobs[4].salary).toBeUndefined();
    });

    it('should extract company rating', () => {
      const jobs = parseJobListHtml(searchResultsHtml);
      
      expect(jobs[0].rating).toBe('4.5');
      expect(jobs[1].rating).toBe('4.2');
    });

    it('should detect Easy Apply jobs', () => {
      const jobs = parseJobListHtml(searchResultsHtml);
      
      expect(jobs[0].easyApply).toBe(true);
      expect(jobs[1].easyApply).toBe(false);
      expect(jobs[2].easyApply).toBe(true);
    });

    it('should construct job URLs', () => {
      const jobs = parseJobListHtml(searchResultsHtml);
      
      expect(jobs[0].url).toContain('123456');
      expect(jobs[0].url).toContain('glassdoor.com');
    });
  });

  describe('parseJobDetailHtml', () => {
    it('should extract job description', () => {
      const detail = parseJobDetailHtml(jobDetailHtml);
      
      expect(detail.description).toContain('Senior Software Engineer');
      expect(detail.description).toContain('Responsibilities');
    });

    it('should extract company size', () => {
      const detail = parseJobDetailHtml(jobDetailHtml);
      
      expect(detail.companySize).toBe('10,000+ employees');
    });

    it('should extract industry', () => {
      const detail = parseJobDetailHtml(jobDetailHtml);
      
      expect(detail.industry).toBe('Internet & Technology');
    });

    it('should extract headquarters', () => {
      const detail = parseJobDetailHtml(jobDetailHtml);
      
      expect(detail.headquarters).toBe('Mountain View, CA');
    });

    it('should extract benefits', () => {
      const detail = parseJobDetailHtml(jobDetailHtml);
      
      expect(detail.benefits).toContain('Health Insurance');
      expect(detail.benefits).toContain('401(k) Matching');
      expect(detail.benefits).toHaveLength(5);
    });

    it('should extract skills', () => {
      const detail = parseJobDetailHtml(jobDetailHtml);
      
      expect(detail.skills).toContain('Python');
      expect(detail.skills).toContain('Java');
      expect(detail.skills).toHaveLength(5);
    });

    it('should extract employment type', () => {
      const detail = parseJobDetailHtml(jobDetailHtml);
      
      expect(detail.employmentType).toBe('Full-time');
    });
  });

  describe('transformRawJobCard', () => {
    it('should transform raw job card to GlassdoorJob format', () => {
      const rawJob = {
        id: '12345',
        title: 'Software Engineer',
        company: 'Test Company',
        location: 'New York, NY',
        salary: '$100K - $150K',
        rating: '4.2',
        reviewCount: '1,234 reviews',
        easyApply: true,
        url: 'https://www.glassdoor.com/job-listing/j?jl=12345',
        postedDate: 'Posted 3 days ago'
      };

      const job = transformRawJobCard(rawJob);

      expect(job.id).toBe('12345');
      expect(job.title).toBe('Software Engineer');
      expect(job.company).toBe('Test Company');
      expect(job.source).toBe('glassdoor');
      expect(job.companyRating).toBe(4.2);
      expect(job.reviewCount).toBe(1234);
      expect(job.easyApply).toBe(true);
      expect(job.scrapedAt).toBeDefined();
    });
  });

  describe('parseSalaryEstimate', () => {
    it('should parse salary range with K suffix', () => {
      const result = parseSalaryEstimate('$100K - $150K');
      
      expect(result).toEqual({
        min: 100000,
        max: 150000,
        currency: 'USD'
      });
    });

    it('should parse full number salary range', () => {
      const result = parseSalaryEstimate('$100,000 - $150,000');
      
      expect(result).toEqual({
        min: 100000,
        max: 150000,
        currency: 'USD'
      });
    });

    it('should parse salary with euro currency', () => {
      const result = parseSalaryEstimate('€80K - €120K');
      
      expect(result?.currency).toBe('EUR');
    });

    it('should return undefined for invalid salary', () => {
      const result = parseSalaryEstimate('Competitive salary');
      
      expect(result).toBeUndefined();
    });

    it('should handle single value salary', () => {
      const result = parseSalaryEstimate('$150K');
      
      expect(result?.min).toBe(150000);
      expect(result?.max).toBe(150000);
    });
  });

  describe('hasNextPageButton', () => {
    it('should detect enabled next button', () => {
      const result = hasNextPageButton(searchResultsHtml);
      
      expect(result).toBe(true);
    });

    it('should return false when no pagination exists', () => {
      const htmlWithoutPagination = '<div>No pagination</div>';
      const result = hasNextPageButton(htmlWithoutPagination);
      
      expect(result).toBe(false);
    });

    it('should return false when next button is disabled', () => {
      const htmlWithDisabledButton = `
        <div class="pagination">
          <button data-test="pagination-next" disabled>Next</button>
        </div>
      `;
      const result = hasNextPageButton(htmlWithDisabledButton);
      
      expect(result).toBe(false);
    });
  });
});
