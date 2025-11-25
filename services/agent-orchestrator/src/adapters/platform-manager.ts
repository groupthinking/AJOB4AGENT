import { JobSpyMCPAdapter } from './jobspy-mcp-adapter';
import { GreenhouseAdapter } from './greenhouse-adapter';
import { GoogleTalentAdapter } from './google-talent-adapter';
import { CoresignalAdapter } from './coresignal-adapter';
import { YCombinatorAdapter } from './ycombinator-adapter';
import { WellfoundEnhancedAdapter } from './wellfound-enhanced-adapter';
import { TechTalentAdapter } from './tech-talent-adapter';
import { GlassdoorAdapter } from './glassdoor-adapter';
import { JobSearchParams, JobSearchResponse } from '../types/job-search';

export class PlatformManager {
  private jobSpyAdapter: JobSpyMCPAdapter;
  private greenhouseAdapter: GreenhouseAdapter;
  private googleTalentAdapter: GoogleTalentAdapter;
  private coresignalAdapter: CoresignalAdapter;
  private ycombinatorAdapter: YCombinatorAdapter;
  private wellfoundAdapter: WellfoundEnhancedAdapter;
  private techTalentAdapter: TechTalentAdapter;
  private glassdoorAdapter: GlassdoorAdapter;
  
  private supportedPlatforms: string[] = [
    // JobSpy MCP platforms (4) - Tier 1
    'indeed', 'linkedin', 'glassdoor', 'ziprecruiter',
    // Enterprise API platforms (3) - Tier 2
    'greenhouse', 'google-talent', 'coresignal',
    // Custom MCP platforms (3) - Tier 3 - COMPLETE!
    'ycombinator', 'wellfound', 'tech-talent-unified',
    // Dedicated adapters - Tier 4
    'glassdoor-direct'
  ];

  constructor() {
    // Tier 1: JobSpy MCP (4 platforms)
    this.jobSpyAdapter = new JobSpyMCPAdapter();
    
    // Tier 2: Enterprise APIs (3 platforms)
    this.greenhouseAdapter = new GreenhouseAdapter(process.env.GREENHOUSE_API_KEY);
    this.googleTalentAdapter = new GoogleTalentAdapter(
      process.env.GOOGLE_TALENT_API_KEY || '', 
      process.env.GOOGLE_PROJECT_ID || 'ajob4agent-project'
    );
    this.coresignalAdapter = new CoresignalAdapter(process.env.CORESIGNAL_API_KEY || '');
    
    // Tier 3: Custom MCP Servers (3 platforms)
    this.ycombinatorAdapter = new YCombinatorAdapter();
    this.wellfoundAdapter = new WellfoundEnhancedAdapter(process.env.WELLFOUND_ACCESS_TOKEN);
    this.techTalentAdapter = new TechTalentAdapter(); // Hired/Vettery + Built In
    
    // Tier 4: Dedicated Adapters
    this.glassdoorAdapter = new GlassdoorAdapter(process.env.GLASSDOOR_ACCESS_TOKEN);
  }

  async initialize(): Promise<void> {
    // Initialize all MCP servers following Anthropic's parallel initialization pattern
    const initPromises = [
      this.jobSpyAdapter.initialize(),
      this.ycombinatorAdapter.initialize(),
      this.techTalentAdapter.initialize()
    ];

    try {
      await Promise.allSettled(initPromises);
      console.log(`✅ Platform Manager initialized with ${this.supportedPlatforms.length} platforms`);
      console.log(`🎯 Coverage: JobSpy(4) + Enterprise(3) + Custom MCP(3) = 10 total platforms`);
    } catch (error) {
      console.error('⚠️  Some MCP servers failed to initialize:', error);
      console.log('✅ Continuing with available platforms...');
    }
  }

  async searchAllPlatforms(params: JobSearchParams): Promise<JobSearchResponse[]> {
    const results: JobSearchResponse[] = [];
    
    // Following Anthropic's parallel processing pattern
    const searchPromises: Promise<JobSearchResponse>[] = [];
    
    // Phase 1: JobSpy platforms (4 core platforms)
    const jobSpyPlatforms = params.platforms.filter(p => 
      ['indeed', 'linkedin', 'glassdoor', 'ziprecruiter'].includes(p)
    );
    
    if (jobSpyPlatforms.length > 0) {
      const jobSpyParams = { ...params, platforms: jobSpyPlatforms };
      searchPromises.push(this.jobSpyAdapter.searchJobs(jobSpyParams));
    }

    // Phase 2: Enterprise APIs with error handling
    const enterprisePlatforms = params.platforms.filter(p => 
      ['greenhouse', 'google-talent', 'coresignal'].includes(p)
    );
    
    for (const platform of enterprisePlatforms) {
      const platformParams = { ...params, platforms: [platform] };
      
      switch (platform) {
        case 'greenhouse':
          searchPromises.push(this.greenhouseAdapter.searchJobs(platformParams));
          break;
        case 'google-talent':
          searchPromises.push(this.googleTalentAdapter.searchJobs(platformParams));
          break;
        case 'coresignal':
          searchPromises.push(this.coresignalAdapter.searchJobs(platformParams));
          break;
      }
    }

    // Phase 3: Custom MCP servers - COMPLETE!
    const customMCPPlatforms = params.platforms.filter(p => 
      ['ycombinator', 'wellfound', 'tech-talent-unified'].includes(p)
    );
    
    for (const platform of customMCPPlatforms) {
      const platformParams = { ...params, platforms: [platform] };
      
      switch (platform) {
        case 'ycombinator':
          searchPromises.push(this.ycombinatorAdapter.searchJobs(platformParams));
          break;
        case 'wellfound':
          searchPromises.push(this.wellfoundAdapter.searchJobs(platformParams));
          break;
        case 'tech-talent-unified':
          searchPromises.push(this.techTalentAdapter.searchJobs(platformParams));
          break;
      }
    }

    // Phase 4: Dedicated adapters (Glassdoor direct)
    if (params.platforms.includes('glassdoor-direct')) {
      const platformParams = { ...params, platforms: ['glassdoor-direct'] };
      searchPromises.push(this.glassdoorAdapter.searchJobs(platformParams));
    }

    // Execute all searches in parallel (Anthropic orchestrator-worker pattern)
    try {
      const allResults = await Promise.allSettled(searchPromises);
      
      allResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`❌ Platform search ${index} failed:`, result.reason);
          // Add empty result to maintain consistency
          results.push({
            jobs: [],
            totalCount: 0,
            platform: 'failed-search',
            searchParams: params,
            timestamp: new Date().toISOString()
          });
        }
      });
      
    } catch (error) {
      console.error('❌ Critical search error:', error);
    }

    return results;
  }

  async searchPlatform(platform: string, params: JobSearchParams): Promise<JobSearchResponse> {
    if (!this.supportedPlatforms.includes(platform)) {
      throw new Error(`Platform ${platform} not supported yet`);
    }

    const platformParams = { ...params, platforms: [platform] };
    
    // Route to appropriate adapter based on platform
    switch (platform) {
      // JobSpy MCP platforms
      case 'indeed':
      case 'linkedin':
      case 'glassdoor':
      case 'ziprecruiter':
        return await this.jobSpyAdapter.searchJobs(platformParams);
      
      // Enterprise API platforms
      case 'greenhouse':
        return await this.greenhouseAdapter.searchJobs(platformParams);
      case 'google-talent':
        return await this.googleTalentAdapter.searchJobs(platformParams);
      case 'coresignal':
        return await this.coresignalAdapter.searchJobs(platformParams);
      
      // Custom MCP platforms - COMPLETE!
      case 'ycombinator':
        return await this.ycombinatorAdapter.searchJobs(platformParams);
      case 'wellfound':
        return await this.wellfoundAdapter.searchJobs(platformParams);
      case 'tech-talent-unified':
        return await this.techTalentAdapter.searchJobs(platformParams);
      
      // Dedicated adapters
      case 'glassdoor-direct':
        return await this.glassdoorAdapter.searchJobs(platformParams);
      
      default:
        throw new Error(`Platform ${platform} adapter not configured`);
    }
  }

  getSupportedPlatforms(): string[] {
    return [...this.supportedPlatforms];
  }

  async shutdown(): Promise<void> {
    // Graceful shutdown of all MCP connections
    const shutdownPromises = [
      this.jobSpyAdapter.disconnect(),
      this.ycombinatorAdapter.disconnect(),
      this.techTalentAdapter.disconnect()
    ];

    try {
      await Promise.allSettled(shutdownPromises);
      console.log('✅ All platform adapters shut down gracefully');
    } catch (error) {
      console.error('⚠️  Some adapters failed to shut down:', error);
    }
  }

  // Get platform statistics for monitoring
  getPlatformStats(): { total: number; tiers: { [key: string]: number } } {
    return {
      total: this.supportedPlatforms.length,
      tiers: {
        'JobSpy MCP': 4,
        'Enterprise APIs': 3,
        'Custom MCP': 3,
        'Dedicated Adapters': 1
      }
    };
  }
}