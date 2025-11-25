import { Browser, Page, BrowserContext } from 'playwright';
import { Job, SearchFilters, ScraperConfig } from '../types/job';
/**
 * Abstract base class for all job scraper implementations.
 * Provides common functionality for browser automation, rate limiting,
 * pagination, and data export.
 */
export declare abstract class BaseJobScraper<T extends Job = Job, F extends SearchFilters = SearchFilters> {
    /** Platform identifier (e.g., 'linkedin', 'glassdoor') */
    abstract readonly platform: string;
    /** Base URL for the job platform */
    abstract readonly baseUrl: string;
    protected browser: Browser | null;
    protected context: BrowserContext | null;
    protected config: ScraperConfig;
    protected lastRequestTime: number;
    constructor(config?: ScraperConfig);
    /**
     * Initialize the browser instance for scraping
     */
    initialize(): Promise<void>;
    /**
     * Close the browser and clean up resources
     */
    close(): Promise<void>;
    /**
     * Create a new page with the browser context
     */
    protected newPage(): Promise<Page>;
    /**
     * Apply rate limiting between requests
     */
    protected throttle(): Promise<void>;
    /**
     * Search for jobs with the given filters
     */
    search(filters: F): Promise<T[]>;
    /**
     * Export jobs to a JSON file
     */
    exportToJson(jobs: T[], filepath: string): Promise<void>;
    /**
     * Build the search URL from filters - implemented by subclasses
     */
    protected abstract buildSearchUrl(filters: F): string;
    /**
     * Parse job listings from the current page - implemented by subclasses
     */
    protected abstract parseJobList(page: Page): Promise<T[]>;
    /**
     * Check if there's a next page available - implemented by subclasses
     */
    protected abstract hasNextPage(page: Page): Promise<boolean>;
    /**
     * Navigate to the next page - implemented by subclasses
     */
    protected abstract goToNextPage(page: Page): Promise<void>;
}
//# sourceMappingURL=BaseJobScraper.d.ts.map