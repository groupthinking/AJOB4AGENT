import { Job, SearchFilters, ScraperConfig, SearchResult } from '../types/job';

/**
 * Abstract base class for all job scraper adapters
 * Provides a common interface for different job platform scrapers
 */
export abstract class BaseJobScraper {
  protected config: ScraperConfig;
  protected isInitialized = false;

  constructor(config: ScraperConfig = {}) {
    this.config = {
      headless: true,
      throttleMs: 3000,
      maxResults: 50,
      timeout: 30000,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...config,
    };
  }

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
  async exportToJson(jobs: Job[], filePath: string): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write jobs to file
    const output = {
      jobs,
      metadata: {
        exportedAt: new Date().toISOString(),
        totalCount: jobs.length,
        source: this.getSourceName(),
      },
    };

    await fs.writeFile(filePath, JSON.stringify(output, null, 2), 'utf-8');
  }

  /**
   * Get the source name for this scraper
   */
  abstract getSourceName(): Job['source'];

  /**
   * Check if the scraper is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current configuration
   */
  getConfig(): ScraperConfig {
    return { ...this.config };
  }

  /**
   * Apply throttling between requests
   */
  protected async throttle(): Promise<void> {
    const delay = this.config.throttleMs ?? 3000;
    // Add some randomness to appear more human-like
    const randomDelay = delay + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, randomDelay));
  }
}
