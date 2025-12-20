import { MCPClient } from '@modelcontextprotocol/client';
import { JobSearchParams, JobResult, JobSearchResponse } from '../types/job-search';
import path from 'path';

export class YCombinatorAdapter {
  private client: MCPClient;
  private serverPath: string;

  constructor(serverPath?: string) {
    // Use environment variable if set, otherwise use project-relative path
    this.serverPath = serverPath || 
      process.env.YCOMBINATOR_MCP_SERVER_PATH || 
      path.resolve(process.cwd(), 'mcp-servers/ycombinator-server/dist/index.js');
    
    this.client = new MCPClient({
      transport: {
        type: 'stdio',
        command: 'node',
        args: [this.serverPath]
      }
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.client.connect();
      console.log('✅ Y Combinator MCP Server connected');
    } catch (error) {
      console.error('❌ Failed to connect to Y Combinator MCP Server:', error);
      throw error;
    }
  }

  async searchJobs(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      const response = await this.client.callTool('search_yc_jobs', {
        query: params.searchTerm,
        location: params.location,
        experience_level: params.experienceLevel,
        remote_ok: params.remoteOnly,
        limit: 50
      });

      return this.transformResponse(response, params);
    } catch (error) {
      console.error('❌ Y Combinator search failed:', error);
      return {
        jobs: [],
        totalCount: 0,
        platform: 'ycombinator',
        searchParams: params,
        timestamp: new Date().toISOString()
      };
    }
  }

  private transformResponse(response: any, params: JobSearchParams): JobSearchResponse {
    let parsedData;
    
    try {
      // Parse the response from MCP server
      const content = response.content?.[0]?.text;
      parsedData = typeof content === 'string' ? JSON.parse(content) : response;
    } catch (error) {
      console.error('❌ Failed to parse Y Combinator response:', error);
      return {
        jobs: [],
        totalCount: 0,
        platform: 'ycombinator',
        searchParams: params,
        timestamp: new Date().toISOString()
      };
    }

    const jobs: JobResult[] = (parsedData.jobs || []).map((job: any) => ({
      id: job.id || `yc-${Date.now()}`,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      salary: job.salary || job.equity ? `${job.salary || 'Equity:'} ${job.equity || ''}`.trim() : undefined,
      url: job.url,
      platform: 'ycombinator',
      datePosted: job.posted_date,
      experienceLevel: job.experience_level,
      remote: job.remote,
      // Add YC-specific metadata
      metadata: {
        batch: job.batch,
        equity: job.equity,
        startup_type: 'ycombinator'
      }
    }));

    return {
      jobs,
      totalCount: parsedData.total_count || jobs.length,
      platform: 'ycombinator',
      searchParams: params,
      timestamp: new Date().toISOString()
    };
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }
}