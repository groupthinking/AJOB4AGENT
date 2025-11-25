import { Job, SearchFilters, ScraperConfig } from '../types/job';
/**
 * Abstract base class for all job scraper adapters
 * Provides a common interface for different job platform scrapers
 */
export declare abstract class BaseJobScraper {
    protected config: ScraperConfig;
    protected isInitialized: boolean;
    constructor(config?: ScraperConfig);
    /**
     * Initialize the scraper (browser setup, etc.)
     */
    abstract initialize(): Promise<void>;
    /**
     * Close the scraper and clean up resources
     */
    abstract close(): Promise<void>;
    /**
     * Search for jobs with the given filters
     */
    abstract search(filters: SearchFilters): Promise<Job[]>;
    /**
     * Get details for a specific job
     */
    abstract getJobDetails(jobId: string): Promise<Job | null>;
    /**
     * Export jobs to JSON file
     */
    exportToJson(jobs: Job[], filePath: string): Promise<void>;
    /**
     * Get the source name for this scraper
     */
    abstract getSourceName(): Job['source'];
    /**
     * Check if the scraper is initialized
     */
    isReady(): boolean;
    /**
     * Get current configuration
     */
    getConfig(): ScraperConfig;
    /**
     * Apply throttling between requests
     */
    protected throttle(): Promise<void>;
}
//# sourceMappingURL=BaseJobScraper.d.ts.map