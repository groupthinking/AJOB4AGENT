import axios, { AxiosInstance } from 'axios';
import { JobSearchParams, JobResult, JobSearchResponse } from '../types/job-search';

export class CoresignalAdapter {
  private client: AxiosInstance;
  private baseUrl = 'https://api.coresignal.com/cdapi/v1';

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      timeout: 30000
    });
  }

  async searchJobs(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      const searchParams = {
        title: params.searchTerm,
        location: params.location,
        experience_level: this.mapExperienceLevel(params.experienceLevel),
        job_type: params.remoteOnly ? 'remote' : undefined,
        date_posted: this.mapDatePosted(params.datePosted),
        limit: 50,
        offset: 0
      };

      // Remove undefined values
      const cleanParams = Object.fromEntries(
        Object.entries(searchParams).filter(([_, value]) => value !== undefined)
      );

      const response = await this.client.get('/professional_network/job/search/filter', {
        params: cleanParams
      });

      const jobs = this.transformJobs(response.data.jobs || []);

      return {
        jobs,
        totalCount: response.data.total_count || jobs.length,
        platform: 'coresignal',
        searchParams: params,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Coresignal API error:', error.message);
      return {
        jobs: [],
        totalCount: 0,
        platform: 'coresignal',
        searchParams: params,
        timestamp: new Date().toISOString()
      };
    }
  }

  private transformJobs(coresignalJobs: any[]): JobResult[] {
    return coresignalJobs.map((job: any) => ({
      id: job.id?.toString() || `coresignal-${Date.now()}`,
      title: job.title || 'Unknown Title',
      company: job.company_name || 'Unknown Company',
      location: this.formatLocation(job.location),
      description: job.description || job.snippet || '',
      salary: job.salary || this.extractSalary(job.description),
      url: job.url || job.application_url || '',
      platform: 'coresignal',
      datePosted: job.posted_date || job.created_at || new Date().toISOString(),
      experienceLevel: job.experience_level || this.extractExperienceLevel(job.title, job.description),
      remote: job.remote || this.isRemote(job.location, job.description)
    }));
  }

  private mapExperienceLevel(level?: string): string | undefined {
    switch (level) {
      case 'entry': return 'entry_level';
      case 'mid': return 'mid_level';
      case 'senior': return 'senior_level';
      default: return undefined;
    }
  }

  private mapDatePosted(datePosted?: string): string | undefined {
    switch (datePosted) {
      case 'today': return '1';
      case 'week': return '7';
      case 'month': return '30';
      default: return '30';
    }
  }

  private formatLocation(location: any): string {
    if (typeof location === 'string') return location;
    if (location?.city && location?.country) {
      return `${location.city}, ${location.country}`;
    }
    if (location?.city) return location.city;
    if (location?.country) return location.country;
    return 'Remote';
  }

  private extractSalary(description: string): string | undefined {
    if (!description) return undefined;
    
    const salaryRegex = /(?:\$|USD|EUR|GBP)[\s]?(?:\d{1,3}(?:,\d{3})*(?:\.\d{2})?(?:\s*(?:-|to)\s*(?:\$|USD|EUR|GBP)?[\s]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)?)/gi;
    const matches = description.match(salaryRegex);
    return matches?.[0];
  }

  private extractExperienceLevel(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();
    if (text.includes('senior') || text.includes('lead') || text.includes('principal') || text.includes('staff')) return 'senior';
    if (text.includes('junior') || text.includes('entry') || text.includes('associate') || text.includes('graduate')) return 'entry';
    return 'mid';
  }

  private isRemote(location: any, description: string): boolean {
    const locationText = typeof location === 'string' ? location : JSON.stringify(location);
    const text = `${locationText} ${description}`.toLowerCase();
    return text.includes('remote') || text.includes('work from home') || text.includes('anywhere') || text.includes('wfh');
  }
}