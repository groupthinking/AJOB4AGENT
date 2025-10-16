import axios, { AxiosInstance } from 'axios';
import { JobSearchParams, JobResult, JobSearchResponse } from '../types/job-search';

export class GreenhouseAdapter {
  private client: AxiosInstance;
  private baseUrl = 'https://boards-api.greenhouse.io/v1';

  constructor(apiKey?: string) {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
      },
      timeout: 30000
    });
  }

  async searchJobs(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      // Greenhouse API endpoints for job boards
      const response = await this.client.get('/boards/jobs', {
        params: {
          content: params.searchTerm,
          location: params.location,
          department: this.mapExperienceToCategory(params.experienceLevel)
        }
      });

      const jobs = this.transformJobs(response.data.jobs || []);
      
      return {
        jobs,
        totalCount: jobs.length,
        platform: 'greenhouse',
        searchParams: params,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Greenhouse API error:', error.message);
      return {
        jobs: [],
        totalCount: 0,
        platform: 'greenhouse',
        searchParams: params,
        timestamp: new Date().toISOString()
      };
    }
  }

  private transformJobs(greenhouseJobs: any[]): JobResult[] {
    return greenhouseJobs.map((job: any) => ({
      id: job.id?.toString() || `greenhouse-${Date.now()}`,
      title: job.title || 'Unknown Title',
      company: job.company?.name || 'Unknown Company',
      location: job.location?.name || 'Remote',
      description: job.content || '',
      salary: this.extractSalary(job.content),
      url: job.absolute_url || '',
      platform: 'greenhouse',
      datePosted: job.updated_at || new Date().toISOString(),
      experienceLevel: this.extractExperienceLevel(job.title, job.content),
      remote: this.isRemote(job.location?.name, job.content)
    }));
  }

  private mapExperienceToCategory(level?: string): string | undefined {
    switch (level) {
      case 'entry': return 'Junior';
      case 'senior': return 'Senior';
      default: return undefined;
    }
  }

  private extractSalary(content: string): string | undefined {
    const salaryRegex = /\$[\d,]+(?:\s*-\s*\$[\d,]+)?/g;
    const matches = content?.match(salaryRegex);
    return matches?.[0];
  }

  private extractExperienceLevel(title: string, content: string): string {
    const text = `${title} ${content}`.toLowerCase();
    if (text.includes('senior') || text.includes('lead') || text.includes('principal')) return 'senior';
    if (text.includes('junior') || text.includes('entry') || text.includes('associate')) return 'entry';
    return 'mid';
  }

  private isRemote(location: string, content: string): boolean {
    const text = `${location} ${content}`.toLowerCase();
    return text.includes('remote') || text.includes('anywhere') || text.includes('work from home');
  }
}