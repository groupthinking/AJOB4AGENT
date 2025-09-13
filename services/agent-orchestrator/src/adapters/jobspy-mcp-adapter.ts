import { MCPClient } from '@modelcontextprotocol/client';
import { JobSearchParams, JobResult, JobSearchResponse } from '../types/job-search';

export class JobSpyMCPAdapter {
  private client: MCPClient;
  private serverUrl: string;

  constructor(serverUrl: string = 'http://localhost:9423') {
    this.serverUrl = serverUrl;
    this.client = new MCPClient({
      transport: {
        type: 'http',
        url: serverUrl
      }
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.client.connect();
      console.log('✅ JobSpy MCP Server connected');
    } catch (error) {
      console.error('❌ Failed to connect to JobSpy MCP Server:', error);
      throw error;
    }
  }

  async searchJobs(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      const response = await this.client.callTool('search_jobs', {
        search_term: params.searchTerm,
        location: params.location,
        site_names: params.platforms.join(','),
        results_wanted: 50,
        hours_old: this.mapDatePosted(params.datePosted),
        country_indeed: 'USA',
        offset: 0
      });

      return this.transformResponse(response, params);
    } catch (error) {
      console.error('❌ JobSpy search failed:', error);
      throw new Error(`Job search failed: ${error.message}`);
    }
  }

  private mapDatePosted(datePosted?: string): number {
    switch (datePosted) {
      case 'today': return 24;
      case 'week': return 168;
      case 'month': return 720;
      default: return 720; // Default to month
    }
  }

  private transformResponse(response: any, params: JobSearchParams): JobSearchResponse {
    const jobs: JobResult[] = response.jobs?.map((job: any) => ({
      id: job.id || `${job.title}-${job.company}-${Date.now()}`,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      salary: job.compensation,
      url: job.job_url,
      platform: job.site,
      datePosted: job.date_posted,
      experienceLevel: this.extractExperienceLevel(job.description),
      remote: this.isRemote(job.location, job.description)
    })) || [];

    return {
      jobs,
      totalCount: jobs.length,
      platform: 'jobspy-aggregator',
      searchParams: params,
      timestamp: new Date().toISOString()
    };
  }

  private extractExperienceLevel(description: string): string {
    const desc = description.toLowerCase();
    if (desc.includes('senior') || desc.includes('lead') || desc.includes('principal')) return 'senior';
    if (desc.includes('junior') || desc.includes('entry') || desc.includes('associate')) return 'entry';
    return 'mid';
  }

  private isRemote(location: string, description: string): boolean {
    const text = `${location} ${description}`.toLowerCase();
    return text.includes('remote') || text.includes('work from home') || text.includes('wfh');
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }
}