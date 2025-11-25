import * as cheerio from 'cheerio';
import { RawJobCard, RawJobDetail, GlassdoorJob } from '../types';
import { parseRating, parseReviewCount } from './ratingParser';

// Type aliases for cheerio
type CheerioRoot = ReturnType<typeof cheerio.load>;
type CheerioSelection = ReturnType<CheerioRoot>;

/**
 * HTML parser utilities for Glassdoor job data extraction
 */

/**
 * Parse job cards from Glassdoor search results HTML
 */
export function parseJobListHtml(html: string): RawJobCard[] {
  const $ = cheerio.load(html);
  const jobs: RawJobCard[] = [];

  // Glassdoor job listings are typically in elements with data-test="jobListing"
  $('[data-test="jobListing"], .JobsList_jobListItem__JBBUV, .job-search-item').each((_, element) => {
    const $card = $(element);
    
    const job = parseJobCardElement($, $card);
    if (job && job.title && job.company) {
      jobs.push(job);
    }
  });

  return jobs;
}

/**
 * Parse a single job card element
 */
function parseJobCardElement($: CheerioRoot, $card: CheerioSelection): RawJobCard | null {
  try {
    // Extract job ID from data attribute or link
    const id = $card.attr('data-id') || 
               $card.attr('data-job-id') ||
               extractIdFromLink($, $card);

    if (!id) {
      return null;
    }

    // Job title
    const title = $card.find('[data-test="job-title"], .JobCard_jobTitle__GLyJ1, .job-title').first().text().trim() ||
                  $card.find('a[data-test="job-link"]').first().text().trim();

    // Company name
    const company = $card.find('[data-test="employer-name"], .EmployerProfile_employerName__Xemli, .employer-name').first().text().trim() ||
                    $card.find('.jobCard_companyName').first().text().trim();

    // Location
    const location = $card.find('[data-test="emp-location"], .JobCard_location__rCz3x, .location').first().text().trim();

    // Salary
    const salary = $card.find('[data-test="detailSalary"], .JobCard_salaryEstimate__arV5J, .salary-estimate').first().text().trim();

    // Company rating
    const rating = $card.find('[data-test="rating"], .EmployerProfile_ratingValue__2BBWA, .rating').first().text().trim();

    // Review count
    const reviewCountText = $card.find('[data-test="review-count"], .EmployerProfile_reviewCount__GpOvO').first().text().trim();

    // Easy Apply indicator
    const easyApply = $card.find('[data-test="easy-apply"], .JobCard_easyApply__fNCsj, .easy-apply').length > 0 ||
                      $card.text().toLowerCase().includes('easy apply');

    // Job URL
    const urlElement = $card.find('a[data-test="job-link"], a.JobCard_jobTitle__GLyJ1, a.job-link').first();
    let url = urlElement.attr('href') || '';
    if (url && !url.startsWith('http')) {
      url = 'https://www.glassdoor.com' + url;
    }

    // Posted date
    const postedDate = $card.find('[data-test="posted-date"], .JobCard_listingAge__KuaxZ, .posting-date').first().text().trim();

    return {
      id,
      title,
      company,
      location,
      salary: salary || undefined,
      rating: rating || undefined,
      reviewCount: reviewCountText || undefined,
      easyApply,
      url,
      postedDate: postedDate || undefined
    };
  } catch {
    return null;
  }
}

/**
 * Extract job ID from link element
 */
function extractIdFromLink($: CheerioRoot, $card: CheerioSelection): string {
  const link = $card.find('a').first().attr('href') || '';
  
  // Try various patterns
  const patterns = [
    /jl=(\d+)/,
    /jobListingId=(\d+)/,
    /-JV_(\d+)/,
    /\/job\/(\d+)\//
  ];

  for (const pattern of patterns) {
    const match = link.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // Fallback: generate ID from title and company hash
  const title = $card.find('[data-test="job-title"]').first().text();
  const company = $card.find('[data-test="employer-name"]').first().text();
  return `gd-${hashString(title + company)}`;
}

/**
 * Simple hash function for generating IDs
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Parse job detail page HTML
 */
export function parseJobDetailHtml(html: string): RawJobDetail {
  const $ = cheerio.load(html);

  // Job description
  const description = $('[data-test="job-description"], .JobDetails_jobDescription__uW_fK, #JobDescriptionContainer').first().html() || '';

  // Company size
  const companySize = $('[data-test="company-size"], .JobDetails_companySize__nBL9W').first().text().trim();

  // Industry
  const industry = $('[data-test="company-industry"], .JobDetails_industry__r1fhX').first().text().trim();

  // Headquarters
  const headquarters = $('[data-test="company-headquarters"], .JobDetails_headquarters__2vYKo').first().text().trim();

  // Benefits
  const benefits: string[] = [];
  $('[data-test="benefit-item"], .JobDetails_benefit__ZMpxc').each((_, el) => {
    const benefit = $(el).text().trim();
    if (benefit) {
      benefits.push(benefit);
    }
  });

  // Skills
  const skills: string[] = [];
  $('[data-test="skill-tag"], .JobDetails_skill__DCLVO').each((_, el) => {
    const skill = $(el).text().trim();
    if (skill) {
      skills.push(skill);
    }
  });

  // Employment type
  const employmentType = $('[data-test="employment-type"], .JobDetails_employmentType__qgI9E').first().text().trim();

  return {
    description,
    companySize: companySize || undefined,
    industry: industry || undefined,
    headquarters: headquarters || undefined,
    benefits: benefits.length > 0 ? benefits : undefined,
    skills: skills.length > 0 ? skills : undefined,
    employmentType: employmentType || undefined
  };
}

/**
 * Transform raw job card data into GlassdoorJob format
 */
export function transformRawJobCard(raw: RawJobCard): GlassdoorJob {
  return {
    id: raw.id,
    title: raw.title,
    company: raw.company,
    location: raw.location,
    salary: raw.salary,
    companyRating: raw.rating ? parseRating(raw.rating) : undefined,
    reviewCount: raw.reviewCount ? parseReviewCount(raw.reviewCount) : undefined,
    easyApply: raw.easyApply,
    url: raw.url,
    postingDate: raw.postedDate,
    tags: [],
    source: 'glassdoor',
    scrapedAt: new Date().toISOString()
  };
}

/**
 * Parse salary string into structured estimate
 */
export function parseSalaryEstimate(salaryStr: string): { min: number; max: number; currency: string } | undefined {
  if (!salaryStr) {
    return undefined;
  }

  // Detect currency first
  let currency = 'USD';
  if (salaryStr.includes('€')) currency = 'EUR';
  else if (salaryStr.includes('£')) currency = 'GBP';
  else if (salaryStr.includes('CAD')) currency = 'CAD';

  // Match patterns like "$80K - $120K" or "$80,000 - $120,000" or "€80K - €120K"
  const rangePattern = /[$€£]?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*[kK]?\s*[-–—to]+\s*[$€£]?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*[kK]?/;
  const match = salaryStr.match(rangePattern);

  if (match) {
    let min = parseFloat(match[1].replace(/,/g, ''));
    let max = parseFloat(match[2].replace(/,/g, ''));

    // If values are small, they're probably in thousands
    if (min < 1000 && salaryStr.toLowerCase().includes('k')) {
      min *= 1000;
      max *= 1000;
    }

    return { min, max, currency };
  }

  // Single value pattern
  const singlePattern = /[$€£]?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*[kK]?/;
  const singleMatch = salaryStr.match(singlePattern);

  if (singleMatch) {
    let value = parseFloat(singleMatch[1].replace(/,/g, ''));
    if (value < 1000 && salaryStr.toLowerCase().includes('k')) {
      value *= 1000;
    }

    return {
      min: value,
      max: value,
      currency: 'USD'
    };
  }

  return undefined;
}

/**
 * Check if pagination next button exists and is enabled
 */
export function hasNextPageButton(html: string): boolean {
  const $ = cheerio.load(html);
  
  const nextButton = $('[data-test="pagination-next"], .nextButton, [aria-label="Next"]').first();
  
  if (nextButton.length === 0) {
    return false;
  }

  // Check if button is disabled
  const isDisabled = nextButton.attr('disabled') !== undefined ||
                     nextButton.hasClass('disabled') ||
                     nextButton.attr('aria-disabled') === 'true';

  return !isDisabled;
}

export default {
  parseJobListHtml,
  parseJobDetailHtml,
  transformRawJobCard,
  parseSalaryEstimate,
  hasNextPageButton
};
