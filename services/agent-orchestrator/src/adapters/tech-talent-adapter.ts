import { MCPClient } from '@modelcontextprotocol/client';
import { JobSearchParams, JobResult, JobSearchResponse } from '../types/job-search';

export class TechTalentAdapter {
  private client: MCPClient;
  private serverPath: string;

  constructor(serverPath?: string) {
    this.serverPath = serverPath || process.env.TECH_TALENT_MCP_SERVER_PATH || './mcp-servers/tech-talent-server/dist/index.js';
    this.client = new MCPClient({
      transport: {
        type: 'stdio',
        command: 'node',
        args: [serverPath]
      }
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.client.connect();
      console.log('✅ Tech Talent Unified MCP Server connected');
    } catch (error) {
      console.error('❌ Failed to connect to Tech Talent MCP Server:', error);
      throw error;
    }
  }

  async searchJobs(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      // Map location to Built In platforms
      const platforms = this.selectPlatforms(params.location);
      
      const response = await this.client.callTool('search_tech_talent_jobs', {
        query: params.searchTerm,
        location: params.location,
        platforms,
        experience_level: params.experienceLevel,
        remote_ok: params.remoteOnly,
        salary_min: params.salaryMin,
        limit: 30
      });

      return this.transformResponse(response, params);
    } catch (error) {
      console.error('❌ Tech talent search failed:', error);
      return {
        jobs: [],
        totalCount: 0,
        platform: 'tech-talent-unified',
        searchParams: params,
        timestamp: new Date().toISOString()
      };
    }
  }

  private selectPlatforms(location?: string): string[] {
    const platforms = ['hired', 'vettery']; // Always include unified platforms
    
    // Add regional Built In platforms based on location
    if (!location) return platforms;
    
    const loc = location.toLowerCase();
    if (loc.includes('san francisco') || loc.includes('sf') || loc.includes('bay area')) {
      platforms.push('builtin-sf');
    }
    if (loc.includes('new york') || loc.includes('nyc') || loc.includes('ny')) {
      platforms.push('builtin-nyc');
    }
    if (loc.includes('los angeles') || loc.includes('la') || loc.includes('california')) {
      platforms.push('builtin-la');
    }
    if (loc.includes('chicago') || loc.includes('illinois')) {
      platforms.push('builtin-chicago');
    }
    if (loc.includes('austin') || loc.includes('texas')) {
      platforms.push('builtin-austin');
    }
    if (loc.includes('seattle') || loc.includes('washington')) {
      platforms.push('builtin-seattle');
    }
    
    return platforms;
  }

  private transformResponse(response: any, params: JobSearchParams): JobSearchResponse {
    let parsedData;
    
    try {
      const content = response.content?.[0]?.text;
      parsedData = typeof content === 'string' ? JSON.parse(content) : response;
    } catch (error) {
      console.error('❌ Failed to parse tech talent response:', error);
      return {
        jobs: [],
        totalCount: 0,
        platform: 'tech-talent-unified',
        searchParams: params,
        timestamp: new Date().toISOString()
      };
    }

    const jobs: JobResult[] = (parsedData.jobs || []).map((job: any) => ({
      id: job.id || `tech-talent-${Date.now()}`,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      salary: job.salary_range,
      url: job.url,
      platform: job.platform,
      datePosted: job.posted_date,
      experienceLevel: job.experience_level,
      remote: job.remote,
      // Add tech talent specific metadata
      metadata: {
        skills: job.skills,
        company_size: job.company_size,
        interview_process: job.interview_process,
        benefits: job.benefits,
        platform_type: 'tech-talent',
        ai_matching: parsedData.unified_features?.ai_matching,
        salary_transparency: parsedData.unified_features?.salary_transparency
      }
    }));

    return {
      jobs,
      totalCount: parsedData.total_count || jobs.length,
      platform: 'tech-talent-unified',
      searchParams: params,
      timestamp: new Date().toISOString()
    };
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }
}