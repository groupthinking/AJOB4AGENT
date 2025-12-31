import { Router, Request, Response } from 'express';
import { PlatformManager } from '../adapters/platform-manager';
import { JobSearchParams } from '../types/job-search';

const router = Router();

// Following Anthropic's error recovery and safety patterns
class UnifiedJobSearchAPI {
  private static instance: UnifiedJobSearchAPI;
  private platformManager: PlatformManager;
  private requestCount = 0;
  private errorCount = 0;
  private initialized = false;

  private constructor() {
    this.platformManager = new PlatformManager();
  }

  static getInstance(): UnifiedJobSearchAPI {
    if (!UnifiedJobSearchAPI.instance) {
      UnifiedJobSearchAPI.instance = new UnifiedJobSearchAPI();
    }
    return UnifiedJobSearchAPI.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.platformManager.initialize();
      this.initialized = true;
      console.log('🚀 Unified Job Search API initialized with 10 platforms');
    } catch (error) {
      console.error('❌ Failed to initialize Unified Job Search API:', error);
      throw error;
    }
  }

  async searchAllPlatforms(params: JobSearchParams): Promise<any> {
    this.requestCount++;
    const startTime = Date.now();

    try {
      // Input validation and sanitization
      const sanitizedParams = this.sanitizeParams(params);
      
      // Default to all 10 platforms if none specified
      if (!sanitizedParams.platforms || sanitizedParams.platforms.length === 0) {
        sanitizedParams.platforms = this.platformManager.getSupportedPlatforms();
      }

      console.log(`🔍 Searching ${sanitizedParams.platforms.length} platforms: ${sanitizedParams.platforms.join(', ')}`);

      // Execute search with timeout and error recovery
      const results = await Promise.race([
        this.platformManager.searchAllPlatforms(sanitizedParams),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Search timeout')), 45000))
      ]);

      // Aggregate and filter results
      const aggregatedResults = this.aggregateResults(results as any[], sanitizedParams);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Search completed in ${duration}ms - Found ${aggregatedResults.totalJobs} jobs`);

      return {
        success: true,
        ...aggregatedResults,
        performance: {
          duration_ms: duration,
          platforms_searched: sanitizedParams.platforms.length,
          request_count: this.requestCount,
          error_rate: this.errorCount / this.requestCount
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.errorCount++;
      const duration = Date.now() - startTime;
      
      console.error(`❌ Unified search failed after ${duration}ms:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        performance: {
          duration_ms: duration,
          request_count: this.requestCount,
          error_rate: this.errorCount / this.requestCount
        },
        fallback: await this.getFallbackResults(params),
        timestamp: new Date().toISOString()
      };
    }
  }

  private sanitizeParams(params: JobSearchParams): JobSearchParams {
    return {
      searchTerm: (params.searchTerm || '').trim(),
      location: (params.location || '').trim(),
      platforms: params.platforms?.filter(p => typeof p === 'string') || [],
      experienceLevel: params.experienceLevel,
      remoteOnly: Boolean(params.remoteOnly),
      salaryMin: params.salaryMin && params.salaryMin > 0 ? params.salaryMin : undefined,
      datePosted: params.datePosted || 'week'
    };
  }

  private aggregateResults(results: any[], params: JobSearchParams) {
    const allJobs: any[] = [];
    const platformStats: { [key: string]: number } = {};
    let totalJobs = 0;

    results.forEach((platformResult) => {
      if (platformResult.jobs && Array.isArray(platformResult.jobs)) {
        allJobs.push(...platformResult.jobs);
        platformStats[platformResult.platform] = platformResult.totalCount;
        totalJobs += platformResult.totalCount;
      }
    });

    // Remove duplicates based on company + title
    const uniqueJobs = this.deduplicateJobs(allJobs);
    
    // Sort by relevance and recency
    const sortedJobs = this.sortJobsByRelevance(uniqueJobs, params.searchTerm);

    return {
      jobs: sortedJobs,
      totalJobs,
      uniqueJobs: uniqueJobs.length,
      platformStats,
      searchParams: params,
      coverage: {
        platforms: Object.keys(platformStats).length,
        total_available: 10
      }
    };
  }

  private deduplicateJobs(jobs: any[]): any[] {
    const unique = new Map<string, any>();
    
    jobs.forEach(job => {
      const key = `${job.company}-${job.title}`.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!unique.has(key) || this.shouldReplaceJob(unique.get(key)!, job)) {
        unique.set(key, job);
      }
    });

    return Array.from(unique.values());
  }

  private shouldReplaceJob(existing: any, candidate: any): boolean {
    // Prefer jobs with salary information
    if (candidate.salary && !existing.salary) return true;
    if (!candidate.salary && existing.salary) return false;
    
    // Prefer more recent postings
    const existingDate = new Date(existing.datePosted || 0).getTime();
    const candidateDate = new Date(candidate.datePosted || 0).getTime();
    return candidateDate > existingDate;
  }

  private sortJobsByRelevance(jobs: any[], searchTerm: string): any[] {
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return jobs.sort((a, b) => {
      // Calculate relevance score
      const scoreA = this.calculateRelevanceScore(a, lowerSearchTerm);
      const scoreB = this.calculateRelevanceScore(b, lowerSearchTerm);
      
      if (scoreA !== scoreB) return scoreB - scoreA;
      
      // Secondary sort by date
      const dateA = new Date(a.datePosted || 0).getTime();
      const dateB = new Date(b.datePosted || 0).getTime();
      return dateB - dateA;
    });
  }

  private calculateRelevanceScore(job: any, searchTerm: string): number {
    let score = 0;
    const title = job.title?.toLowerCase() || '';
    const description = job.description?.toLowerCase() || '';
    
    // Title matches
    if (title.includes(searchTerm)) score += 10;
    if (title.startsWith(searchTerm)) score += 5;
    
    // Description matches
    if (description.includes(searchTerm)) score += 3;
    
    // Platform priority (Anthropic's quality-based scoring)
    if (job.platform === 'ycombinator') score += 2; // High-quality startups
    if (job.platform === 'google-talent') score += 2; // ML-powered matching
    if (job.platform?.includes('hired') || job.platform?.includes('vettery')) score += 1; // Curated tech jobs
    
    return score;
  }

  private async getFallbackResults(params: JobSearchParams): Promise<any> {
    try {
      // Fallback to just JobSpy MCP if available
      const fallbackParams = { ...params, platforms: ['indeed'] };
      const results = await this.platformManager.searchPlatform('indeed', fallbackParams);
      return {
        jobs: results.jobs.slice(0, 5),
        source: 'fallback-indeed',
        message: 'Showing fallback results from Indeed'
      };
    } catch {
      return {
        jobs: [],
        source: 'empty-fallback',
        message: 'No fallback results available'
      };
    }
  }

  getStats(): any {
    return {
      ...this.platformManager.getPlatformStats(),
      requests: this.requestCount,
      errors: this.errorCount,
      error_rate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
      uptime: process.uptime()
    };
  }

  async shutdown(): Promise<void> {
    await this.platformManager.shutdown();
    this.initialized = false;
  }
}

// API Routes
router.post('/search-all', async (req: Request, res: Response) => {
  try {
    const api = UnifiedJobSearchAPI.getInstance();
    await api.initialize();
    
    const searchParams: JobSearchParams = {
      searchTerm: req.body.searchTerm || 'software engineer',
      location: req.body.location || 'San Francisco, CA',
      platforms: req.body.platforms, // Will default to all 10 if not provided
      experienceLevel: req.body.experienceLevel,
      remoteOnly: req.body.remoteOnly,
      salaryMin: req.body.salaryMin,
      datePosted: req.body.datePosted || 'week'
    };

    const results = await api.searchAllPlatforms(searchParams);
    res.json(results);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const api = UnifiedJobSearchAPI.getInstance();
    const stats = api.getStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/platforms', async (req: Request, res: Response) => {
  try {
    const api = UnifiedJobSearchAPI.getInstance();
    await api.initialize();
    
    res.json({
      success: true,
      platforms: {
        'Tier 1 - JobSpy MCP': ['indeed', 'linkedin', 'glassdoor', 'ziprecruiter'],
        'Tier 2 - Enterprise APIs': ['greenhouse', 'google-talent', 'coresignal'], 
        'Tier 3 - Custom MCP': ['ycombinator', 'wellfound', 'tech-talent-unified']
      },
      total: 10,
      description: 'Complete 10-platform job search integration following Anthropic MCP patterns'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;