import axios, { AxiosInstance } from 'axios';
import { JobSearchParams, JobResult, JobSearchResponse } from '../types/job-search';

interface WellfoundJob {
  id: number;
  title: string;
  startup: {
    name: string;
    high_concept: string;
    product_desc: string;
    angellist_url: string;
    logo_url: string;
    quality: number;
    hidden: boolean;
    community_profile: boolean;
  };
  angellist_url: string;
  description: string;
  skills: Array<{ name: string }>;
  locations: Array<{ name: string }>;
  remote_ok: boolean;
  created_at: string;
  salary_min?: number;
  salary_max?: number;
  currency_code?: string;
  equity_min?: number;
  equity_max?: number;
  equity_vest?: number;
  job_type: string;
  experience: string;
}

export class WellfoundEnhancedAdapter {
  private client: AxiosInstance;
  private baseUrl = 'https://angel.co/api';

  constructor(accessToken?: string) {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AJOB4AGENT/1.0',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
      },
      timeout: 30000
    });
  }

  async searchJobs(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      // Enhanced search with equity transparency
      const searchParams = {
        // Basic filters
        filter_data: {
          role: params.searchTerm,
          locations: params.location ? [params.location] : undefined,
          remote: params.remoteOnly,
          experience: this.mapExperienceLevel(params.experienceLevel),
          
          // Equity-specific filters
          equity_min: 0.01, // Include jobs with equity info
          salary_min: params.salaryMin,
          
          // Startup quality filters
          quality: 3, // Minimum quality score
          stage: ['Early Stage Startup', 'Mid Stage Startup', 'Late Stage Startup'],
          
          // Date filters
          posted: this.mapDatePosted(params.datePosted)
        },
        page: 1,
        per_page: 50
      };

      const response = await this.client.get('/1/jobs/search', {
        params: searchParams
      });

      const jobs = this.transformJobs(response.data.jobs || []);
      
      return {
        jobs,
        totalCount: response.data.total || jobs.length,
        platform: 'wellfound',
        searchParams: params,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Wellfound API error:', error.message);
      
      // Fallback to web scraping if API fails
      return await this.fallbackWebScraping(params);
    }
  }

  private async fallbackWebScraping(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      console.log('🔄 Falling back to Wellfound web scraping...');
      
      const searchUrl = `https://wellfound.com/jobs`;
      const response = await axios.get(searchUrl, {
        params: {
          q: params.searchTerm,
          l: params.location,
          remote: params.remoteOnly ? 'true' : undefined
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });

      // Parse the HTML response (simplified)
      const jobs = this.parseJobsFromHTML(response.data, params);
      
      return {
        jobs,
        totalCount: jobs.length,
        platform: 'wellfound',
        searchParams: params,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Wellfound scraping failed:', error);
      return {
        jobs: [],
        totalCount: 0,
        platform: 'wellfound',
        searchParams: params,
        timestamp: new Date().toISOString()
      };
    }
  }

  private transformJobs(wellfoundJobs: WellfoundJob[]): JobResult[] {
    return wellfoundJobs.map((job: WellfoundJob) => ({
      id: job.id?.toString() || `wellfound-${Date.now()}`,
      title: job.title,
      company: job.startup.name,
      location: this.formatLocation(job.locations, job.remote_ok),
      description: this.formatDescription(job.description, job.startup.high_concept),
      salary: this.formatCompensation(job),
      url: job.angellist_url,
      platform: 'wellfound',
      datePosted: job.created_at,
      experienceLevel: this.normalizeExperience(job.experience),
      remote: job.remote_ok,
      
      // Enhanced Wellfound-specific metadata
      metadata: {
        startup_quality: job.startup.quality,
        startup_stage: this.inferStartupStage(job.startup),
        skills: job.skills?.map(s => s.name) || [],
        equity_range: this.formatEquityRange(job.equity_min, job.equity_max),
        equity_vesting: job.equity_vest,
        startup_description: job.startup.product_desc,
        logo_url: job.startup.logo_url
      }
    }));
  }

  private formatCompensation(job: WellfoundJob): string {
    const parts: string[] = [];
    
    // Salary information
    if (job.salary_min && job.salary_max) {
      const currency = job.currency_code || 'USD';
      parts.push(`$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()} ${currency}`);
    } else if (job.salary_min) {
      const currency = job.currency_code || 'USD';
      parts.push(`$${job.salary_min.toLocaleString()}+ ${currency}`);
    }
    
    // Equity information (key differentiator)
    if (job.equity_min && job.equity_max) {
      parts.push(`${job.equity_min}% - ${job.equity_max}% equity`);
    } else if (job.equity_min) {
      parts.push(`${job.equity_min}%+ equity`);
    }
    
    // Vesting information
    if (job.equity_vest) {
      parts.push(`${job.equity_vest}yr vesting`);
    }
    
    return parts.join(' • ');
  }

  private formatEquityRange(min?: number, max?: number): string | undefined {
    if (min && max) return `${min}% - ${max}%`;
    if (min) return `${min}%+`;
    return undefined;
  }

  private formatLocation(locations: Array<{ name: string }>, remoteOk: boolean): string {
    const locationNames = locations?.map(l => l.name) || [];
    if (remoteOk) locationNames.push('Remote');
    return locationNames.join(', ') || 'San Francisco, CA';
  }

  private formatDescription(description: string, highConcept: string): string {
    return `${highConcept ? highConcept + '\n\n' : ''}${description}`;
  }

  private inferStartupStage(startup: any): string {
    const quality = startup.quality || 0;
    if (quality >= 8) return 'Late Stage';
    if (quality >= 5) return 'Mid Stage';
    return 'Early Stage';
  }

  private mapExperienceLevel(level?: string): string | undefined {
    switch (level) {
      case 'entry': return 'junior';
      case 'mid': return 'mid';
      case 'senior': return 'senior';
      default: return undefined;
    }
  }

  private normalizeExperience(experience: string): string {
    const exp = experience.toLowerCase();
    if (exp.includes('senior') || exp.includes('lead') || exp.includes('principal')) return 'senior';
    if (exp.includes('junior') || exp.includes('entry') || exp.includes('associate')) return 'entry';
    return 'mid';
  }

  private mapDatePosted(datePosted?: string): string | undefined {
    switch (datePosted) {
      case 'today': return '1d';
      case 'week': return '7d';
      case 'month': return '30d';
      default: return '30d';
    }
  }

  private parseJobsFromHTML(html: string, params: JobSearchParams): JobResult[] {
    // Simplified HTML parsing for fallback
    // In production, you'd use cheerio for proper parsing
    const jobs: JobResult[] = [];
    
    // Extract basic job information from HTML structure
    // This is a placeholder - implement actual parsing based on Wellfound's HTML structure
    
    return jobs;
  }
}