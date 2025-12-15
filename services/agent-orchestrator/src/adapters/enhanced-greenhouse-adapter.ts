import axios, { AxiosInstance } from 'axios';
import { JobSearchParams, JobResult, JobSearchResponse } from '../types/job-search';

interface GreenhouseJobBoard {
  id: number;
  internal_job_id: number;
  title: string;
  updated_at: string;
  location: {
    name: string;
  };
  absolute_url: string;
  metadata: any[];
  content: string;
  departments: Array<{
    id: number;
    name: string;
  }>;
  offices: Array<{
    id: number;
    name: string;
    location: string;
  }>;
}

export class EnhancedGreenhouseAdapter {
  private client: AxiosInstance;
  private baseUrl = 'https://boards-api.greenhouse.io/v1';
  private harvestBaseUrl = 'https://harvest.greenhouse.io/v1';
  private organizationToken?: string;

  constructor(organizationToken?: string, harvestApiKey?: string) {
    this.organizationToken = organizationToken;
    
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AJOB4AGENT/1.0'
      }
    });

    // If harvest API key is provided, set up authentication for Harvest API
    if (harvestApiKey) {
      this.client.defaults.headers.common['Authorization'] = `Basic ${Buffer.from(harvestApiKey + ':').toString('base64')}`;
    }
  }

  async searchJobs(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      // Use Job Board API (public) or Harvest API (requires auth)
      const jobs = await this.searchJobBoard(params);
      
      return {
        jobs,
        totalCount: jobs.length,
        platform: 'greenhouse',
        searchParams: params,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Enhanced Greenhouse API error:', error.message);
      return {
        jobs: [],
        totalCount: 0,
        platform: 'greenhouse',
        searchParams: params,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async searchJobBoard(params: JobSearchParams): Promise<JobResult[]> {
    try {
      // Use public job boards if no organization token (limited functionality)
      if (!this.organizationToken) {
        console.log('⚠️  No organization token provided, using limited public access');
        return await this.searchPublicJobBoards(params);
      }
      
      // Use organization-specific endpoint
      const jobsUrl = `${this.baseUrl}/boards/${this.organizationToken}/jobs`;
      const response = await this.client.get(jobsUrl);
      const allJobs: GreenhouseJobBoard[] = response.data.jobs || response.data;

      // Filter jobs based on search parameters
      const filteredJobs = this.filterJobs(allJobs, params);
      
      return this.transformJobs(filteredJobs);

    } catch (error) {
      console.error('❌ Greenhouse job board search failed:', error);
      return [];
    }
  }

  private async searchPublicJobBoards(params: JobSearchParams): Promise<JobResult[]> {
    try {
      // This would require knowing specific company job board URLs
      // Greenhouse exposes job boards at: https://boards.greenhouse.io/company_name
      
      // For demo purposes, we'll search a few known public boards
      const knownCompanies = [
        'airbnb', 'stripe', 'gitlab', 'shopify', 'coinbase', 
        'twitter', 'uber', 'lyft', 'dropbox', 'slack'
      ];

      const allJobs: JobResult[] = [];

      for (const company of knownCompanies.slice(0, 3)) { // Limit to prevent rate limiting
        try {
          const companyJobs = await this.searchCompanyBoard(company, params);
          allJobs.push(...companyJobs);
        } catch (error) {
          console.log(`⚠️  ${company} board not accessible`);
        }
      }

      return allJobs;

    } catch (error) {
      console.error('❌ Public job boards search failed:', error);
      return [];
    }
  }

  private async searchCompanyBoard(company: string, params: JobSearchParams): Promise<JobResult[]> {
    try {
      const response = await this.client.get(`${this.baseUrl}/boards/${company}/jobs`);
      const jobs: GreenhouseJobBoard[] = response.data.jobs || [];
      
      const filteredJobs = this.filterJobs(jobs, params);
      return this.transformJobs(filteredJobs, company);

    } catch (error) {
      // Company board might not exist or be public
      return [];
    }
  }

  private filterJobs(jobs: GreenhouseJobBoard[], params: JobSearchParams): GreenhouseJobBoard[] {
    return jobs.filter(job => {
      // Filter by search term
      if (params.searchTerm) {
        const searchTerm = params.searchTerm.toLowerCase();
        const title = job.title.toLowerCase();
        const content = job.content.toLowerCase();
        
        if (!title.includes(searchTerm) && !content.includes(searchTerm)) {
          return false;
        }
      }

      // Filter by location
      if (params.location && !params.remoteOnly) {
        const jobLocation = job.location?.name?.toLowerCase() || '';
        const searchLocation = params.location.toLowerCase();
        
        if (!jobLocation.includes(searchLocation)) {
          return false;
        }
      }

      // Filter by remote preference
      if (params.remoteOnly) {
        const content = job.content.toLowerCase();
        const location = job.location?.name?.toLowerCase() || '';
        
        if (!content.includes('remote') && !location.includes('remote')) {
          return false;
        }
      }

      // Filter by experience level
      if (params.experienceLevel) {
        const content = job.content.toLowerCase();
        const title = job.title.toLowerCase();
        
        switch (params.experienceLevel) {
          case 'entry':
            if (!content.includes('entry') && !content.includes('junior') && 
                !title.includes('junior') && !title.includes('associate')) {
              return false;
            }
            break;
          case 'senior':
            if (!content.includes('senior') && !title.includes('senior') && 
                !title.includes('lead') && !title.includes('principal')) {
              return false;
            }
            break;
        }
      }

      return true;
    });
  }

  private transformJobs(jobs: GreenhouseJobBoard[], companyOverride?: string): JobResult[] {
    return jobs.map(job => ({
      id: job.id.toString(),
      title: job.title,
      company: companyOverride || this.extractCompanyFromContent(job.content) || 'Unknown Company',
      location: job.location?.name || 'Not specified',
      description: this.cleanContent(job.content),
      url: job.absolute_url,
      platform: 'greenhouse',
      datePosted: job.updated_at,
      experienceLevel: this.extractExperienceLevel(job.title, job.content),
      remote: this.isRemote(job.location?.name, job.content),
      metadata: {
        internal_job_id: job.internal_job_id,
        departments: job.departments?.map(d => d.name) || [],
        offices: job.offices?.map(o => o.name) || [],
        greenhouse_metadata: job.metadata
      }
    }));
  }

  private extractCompanyFromContent(content: string): string | undefined {
    // Try to extract company name from job content
    const companyRegex = /(?:at|@|for)\s+([A-Z][a-zA-Z\s&.,-]+?)(?:\s|,|\.|\n)/;
    const match = content.match(companyRegex);
    return match?.[1]?.trim();
  }

  private cleanContent(content: string): string {
    // Remove HTML tags and clean up content
    return content
      .replace(/<[^>]*>/g, '')
      .replace(/&[a-zA-Z]+;/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500); // Limit description length
  }

  private extractExperienceLevel(title: string, content: string): string {
    const text = `${title} ${content}`.toLowerCase();
    
    if (text.includes('senior') || text.includes('lead') || text.includes('principal') || text.includes('staff')) {
      return 'senior';
    }
    if (text.includes('junior') || text.includes('entry') || text.includes('associate') || text.includes('intern')) {
      return 'entry';
    }
    return 'mid';
  }

  private isRemote(location: string, content: string): boolean {
    const text = `${location} ${content}`.toLowerCase();
    return text.includes('remote') || text.includes('anywhere') || text.includes('work from home');
  }

  // Method to submit applications (requires Harvest API access)
  async submitApplication(jobId: string, candidateData: any): Promise<any> {
    if (!this.client.defaults.headers.common['Authorization']) {
      throw new Error('Harvest API authentication required for application submission');
    }

    try {
      const response = await this.client.post(`${this.harvestBaseUrl}/applications`, {
        job_id: jobId,
        ...candidateData
      });

      return response.data;
    } catch (error) {
      console.error('❌ Application submission failed:', error);
      throw error;
    }
  }

  // Method to get detailed job information
  async getJobDetails(jobId: string): Promise<any> {
    try {
      const response = await this.client.get(`${this.baseUrl}/jobs/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get job details:', error);
      throw error;
    }
  }

  // Method to get company departments and offices
  async getCompanyInfo(organizationToken: string): Promise<any> {
    try {
      const [departments, offices] = await Promise.all([
        this.client.get(`${this.baseUrl}/boards/${organizationToken}/departments`),
        this.client.get(`${this.baseUrl}/boards/${organizationToken}/offices`)
      ]);

      return {
        departments: departments.data.departments || [],
        offices: offices.data.offices || []
      };
    } catch (error) {
      console.error('❌ Failed to get company info:', error);
      return { departments: [], offices: [] };
    }
  }
}