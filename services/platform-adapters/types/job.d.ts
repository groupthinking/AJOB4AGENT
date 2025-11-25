/**
 * Unified Job interface for all platform adapters
 * This interface standardizes job data across different sources
 */
export interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    salary?: string;
    postingDate: string;
    url: string;
    description?: string;
    tags: string[];
    source: 'linkedin' | 'glassdoor' | 'wellfound';
    scrapedAt: string;
}
/**
 * Search filters for job scraping
 */
export interface SearchFilters {
    keywords: string;
    location?: string;
    remote?: boolean;
    salary?: {
        min?: number;
        max?: number;
    };
    seniority?: 'entry' | 'mid' | 'senior' | 'director' | 'executive';
    datePosted?: '24h' | 'week' | 'month';
}
/**
 * Base configuration for job scrapers
 */
export interface ScraperConfig {
    headless?: boolean;
    throttleMs?: number;
    maxResults?: number;
    timeout?: number;
    userAgent?: string;
}
/**
 * Result from a search operation
 */
export interface SearchResult {
    jobs: Job[];
    totalCount: number;
    query: SearchFilters;
    scrapedAt: string;
    hasMore: boolean;
}
//# sourceMappingURL=job.d.ts.map