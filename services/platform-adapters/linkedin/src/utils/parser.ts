import { load, CheerioAPI } from 'cheerio';
import { Job } from '../types';

/**
 * Parse job cards from LinkedIn search results page
 */
export function parseJobCards(html: string): Partial<Job>[] {
  const $ = load(html);
  const jobs: Partial<Job>[] = [];

  // LinkedIn job cards selector (guest view)
  $(
    '.jobs-search__results-list li, .job-search-card, [data-job-id]'
  ).each((_index, element) => {
    const $el = $(element);
    const job = parseJobCard($, $el);
    if (job.title && job.company) {
      jobs.push(job);
    }
  });

  return jobs;
}

/**
 * Parse a single job card element
 */
function parseJobCard($: CheerioAPI, $el: ReturnType<CheerioAPI>): Partial<Job> {
  // Extract job ID from data attribute or link
  const jobLink = $el.find('a[href*="/jobs/view/"]').first();
  const href = jobLink.attr('href') ?? '';
  const jobIdMatch = href.match(/\/jobs\/view\/(\d+)/);
  const jobId = jobIdMatch ? jobIdMatch[1] : $el.attr('data-job-id') ?? '';

  // Extract title
  const title =
    $el.find('.base-search-card__title, .job-card-list__title').text().trim() ||
    $el.find('h3').text().trim() ||
    jobLink.text().trim();

  // Extract company name
  const company =
    $el
      .find('.base-search-card__subtitle, .job-card-container__primary-description')
      .text()
      .trim() || $el.find('h4').text().trim();

  // Extract location
  const location =
    $el
      .find('.job-search-card__location, .job-card-container__metadata-item')
      .first()
      .text()
      .trim() ||
    $el.find('.job-card-list__location').text().trim() ||
    '';

  // Extract posting date
  const dateText =
    $el.find('time').attr('datetime') ||
    $el.find('.job-search-card__listdate').text().trim() ||
    $el.find('[data-test-job-search-card__listdate]').text().trim() ||
    '';

  const postingDate = parseDate(dateText);

  // Build job URL
  const url = jobId
    ? `https://www.linkedin.com/jobs/view/${jobId}`
    : href.startsWith('http')
    ? href
    : `https://www.linkedin.com${href}`;

  // Extract salary if available
  const salary =
    $el.find('.job-search-card__salary-info').text().trim() ||
    $el.find('[data-test-job-search-card__salary]').text().trim() ||
    undefined;

  return {
    id: jobId ? `linkedin-${jobId}` : undefined,
    title,
    company,
    location,
    salary,
    postingDate,
    url,
    source: 'linkedin' as const,
    tags: [],
  };
}

/**
 * Parse job details from individual job page
 */
export function parseJobDetails(html: string): Partial<Job> {
  const $ = load(html);

  // Extract title
  const title =
    $('.top-card-layout__title, .job-details-jobs-unified-top-card__job-title')
      .first()
      .text()
      .trim() ||
    $('h1').first().text().trim() ||
    '';

  // Extract company
  const company =
    $('.topcard__org-name-link, .job-details-jobs-unified-top-card__company-name')
      .first()
      .text()
      .trim() ||
    $('[data-test-job-details-company-name]').text().trim() ||
    '';

  // Extract location
  const location =
    $('.topcard__flavor--bullet, .job-details-jobs-unified-top-card__bullet')
      .first()
      .text()
      .trim() ||
    $('[data-test-job-details-location]').text().trim() ||
    '';

  // Extract description
  const description =
    $('.description__text, .jobs-description-content__text')
      .first()
      .text()
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 2000) || '';

  // Extract salary
  const salary =
    $(
      '.salary-main-rail__compensation-value, [data-test-job-details-salary]'
    )
      .first()
      .text()
      .trim() || undefined;

  // Extract posting date
  const dateText =
    $('.posted-time-ago__text, [data-test-job-details-posted-date]')
      .first()
      .text()
      .trim() || '';
  const postingDate = parseDate(dateText);

  // Extract tags/requirements
  const tags: string[] = [];
  $('.job-criteria__item, .description__job-criteria-item').each(
    (_index, el) => {
      const text = $(el).text().trim();
      if (text) tags.push(text);
    }
  );

  // Extract skills from description
  const skillPatterns = [
    /typescript/gi,
    /javascript/gi,
    /python/gi,
    /react/gi,
    /node\.?js/gi,
    /aws/gi,
    /docker/gi,
    /kubernetes/gi,
    /sql/gi,
    /java\b/gi,
    /go\b/gi,
    /rust/gi,
    /c\+\+/gi,
    /machine learning/gi,
    /ai\b/gi,
  ];

  skillPatterns.forEach((pattern) => {
    const match = description.match(pattern);
    if (match && !tags.includes(match[0])) {
      tags.push(match[0]);
    }
  });

  return {
    title,
    company,
    location,
    description,
    salary,
    postingDate,
    tags: [...new Set(tags)],
    source: 'linkedin' as const,
  };
}

/**
 * Parse relative date strings to ISO format
 */
export function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();

  // If already ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return new Date(dateStr).toISOString();
  }

  const now = new Date();
  const lowerStr = dateStr.toLowerCase();

  // Parse relative dates
  if (lowerStr.includes('just now') || lowerStr.includes('moment')) {
    return now.toISOString();
  }

  const hourMatch = lowerStr.match(/(\d+)\s*hours?\s*ago/);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
  }

  const dayMatch = lowerStr.match(/(\d+)\s*days?\s*ago/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    return new Date(
      now.getTime() - days * 24 * 60 * 60 * 1000
    ).toISOString();
  }

  const weekMatch = lowerStr.match(/(\d+)\s*weeks?\s*ago/);
  if (weekMatch) {
    const weeks = parseInt(weekMatch[1], 10);
    return new Date(
      now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000
    ).toISOString();
  }

  const monthMatch = lowerStr.match(/(\d+)\s*months?\s*ago/);
  if (monthMatch) {
    const months = parseInt(monthMatch[1], 10);
    return new Date(
      now.getTime() - months * 30 * 24 * 60 * 60 * 1000
    ).toISOString();
  }

  // Default to current date
  return now.toISOString();
}

/**
 * Clean and normalize text
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

/**
 * Extract salary range from text
 */
export function extractSalary(text: string): string | undefined {
  // Common salary patterns
  const patterns = [
    /\$[\d,]+\s*[-–]\s*\$[\d,]+(?:\s*\/\s*(?:year|yr|hour|hr))?/i,
    /\$[\d,]+(?:\s*\/\s*(?:year|yr|hour|hr))?/i,
    /[\d,]+k\s*[-–]\s*[\d,]+k(?:\s*\/\s*(?:year|yr))?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return undefined;
}
