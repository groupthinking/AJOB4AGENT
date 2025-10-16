import axios, { AxiosInstance } from 'axios';
import { JobSearchParams, JobResult, JobSearchResponse } from '../types/job-search';

export class GoogleTalentAdapter {
  private client: AxiosInstance;
  private projectId: string;
  private baseUrl: string;

  constructor(apiKey: string, projectId: string = 'your-project-id') {
    this.projectId = projectId;
    this.baseUrl = `https://jobs.googleapis.com/v4/projects/${projectId}`;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 30000
    });
  }

  async searchJobs(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      const searchRequest = {
        requestMetadata: {
          userId: 'ajob4agent-user',
          sessionId: `session-${Date.now()}`,
          domain: 'ajob4agent.com'
        },
        searchMode: 'JOB_SEARCH',
        jobQuery: {
          query: params.searchTerm,
          locationFilters: params.location ? [{
            address: params.location
          }] : undefined,
          employmentTypes: params.remoteOnly ? ['CONTRACTOR', 'PART_TIME', 'FULL_TIME'] : undefined,
          jobCategories: this.mapExperienceToCategory(params.experienceLevel)
        },
        jobView: 'JOB_VIEW_FULL',
        pageSize: 50,
        orderBy: 'relevance desc'
      };

      const response = await this.client.post('/jobs:search', searchRequest);
      const jobs = this.transformJobs(response.data.matchingJobs || []);

      return {
        jobs,
        totalCount: response.data.totalSize || jobs.length,
        platform: 'google-talent',
        searchParams: params,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Google Talent API error:', error.message);
      return {
        jobs: [],
        totalCount: 0,
        platform: 'google-talent',
        searchParams: params,
        timestamp: new Date().toISOString()
      };
    }
  }

  private transformJobs(googleJobs: any[]): JobResult[] {
    return googleJobs.map((item: any) => {
      const job = item.job;
      return {
        id: job.name?.split('/').pop() || `google-${Date.now()}`,
        title: job.title || 'Unknown Title',
        company: job.company?.displayName || job.company?.name || 'Unknown Company',
        location: this.formatLocation(job.addresses),
        description: job.description || '',
        salary: this.formatSalary(job.compensationInfo),
        url: job.applicationInfo?.uris?.[0] || '',
        platform: 'google-talent',
        datePosted: job.postingCreateTime || new Date().toISOString(),
        experienceLevel: this.extractExperienceLevel(job.title, job.description),
        remote: this.isRemote(job.addresses, job.description)
      };
    });
  }

  private mapExperienceToCategory(level?: string): string[] | undefined {
    switch (level) {
      case 'entry': return ['BEGINNER'];
      case 'mid': return ['INTERMEDIATE'];
      case 'senior': return ['EXPERIENCED'];
      default: return undefined;
    }
  }

  private formatLocation(addresses: any[]): string {
    if (!addresses || addresses.length === 0) return 'Remote';
    const addr = addresses[0];
    return `${addr.locality || ''}, ${addr.administrativeArea || ''}`.trim().replace(/^,|,$/, '');
  }

  private formatSalary(compensationInfo: any): string | undefined {
    if (!compensationInfo?.entries) return undefined;
    
    const entry = compensationInfo.entries[0];
    if (entry.range) {
      const min = entry.range.min?.nanos ? entry.range.min.nanos / 1000000000 : entry.range.min?.units || 0;
      const max = entry.range.max?.nanos ? entry.range.max.nanos / 1000000000 : entry.range.max?.units || 0;
      return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    }
    
    return undefined;
  }

  private extractExperienceLevel(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();
    if (text.includes('senior') || text.includes('lead') || text.includes('principal')) return 'senior';
    if (text.includes('junior') || text.includes('entry') || text.includes('associate')) return 'entry';
    return 'mid';
  }

  private isRemote(addresses: any[], description: string): boolean {
    if (!addresses || addresses.length === 0) return true;
    const text = description.toLowerCase();
    return text.includes('remote') || text.includes('work from home') || text.includes('wfh');
  }
}