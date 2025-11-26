// Unified Job interface for all platform adapters
export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description?: string;
  salary?: string;
  url: string;
  postingDate?: string;
  tags: string[];
  source: string;
  scrapedAt: string;
}

// Base search filters applicable to all platforms
export interface SearchFilters {
  keywords: string;
  location?: string;
  remote?: boolean;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  datePosted?: '24h' | 'week' | 'month';
  experienceLevel?: 'entry' | 'mid' | 'senior';
}

// Configuration for scrapers
export interface ScraperConfig {
  headless?: boolean;
  throttleMs?: number;
  maxResults?: number;
  userAgent?: string;
  timeout?: number;
}

// Response format for job searches
export interface JobSearchResult<T extends Job = Job> {
  jobs: T[];
  totalCount: number;
  hasNextPage: boolean;
  platform: string;
  searchParams: SearchFilters;
  timestamp: string;
}
