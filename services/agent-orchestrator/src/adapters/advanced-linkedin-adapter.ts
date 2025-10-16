import axios, { AxiosInstance } from 'axios';
import { JobSearchParams, JobResult, JobSearchResponse } from '../types/job-search';

interface LinkedInSearchResult {
  jobs: LinkedInJob[];
  metadata: {
    totalCount: number;
    hasMoreResults: boolean;
    searchId: string;
  };
}

interface LinkedInJob {
  jobId: string;
  title: string;
  companyName: string;
  companyId: string;
  location: string;
  description: string;
  postedDate: string;
  applicationUrl: string;
  salary?: string;
  workplaceTypes: string[];
  experienceLevel: string;
  industries: string[];
  skills: string[];
  benefits?: string[];
}

export class AdvancedLinkedInAdapter {
  private client: AxiosInstance;
  private baseUrl = 'https://www.linkedin.com/voyager/api';
  private jobsBaseUrl = 'https://www.linkedin.com/jobs-guest/jobs/api';
  private accessToken?: string;
  private csrfToken?: string;

  // Rate limiting to mimic human behavior (inspired by Job Hunter 3000)
  private lastRequestTime = 0;
  private minRequestInterval = 2000; // 2 seconds between requests
  private requestCount = 0;
  private rateLimitWindow = 60000; // 1 minute window
  private maxRequestsPerWindow = 25; // Conservative limit

  constructor(accessToken?: string) {
    this.accessToken = accessToken;
    
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/vnd.linkedin.normalized+json+2.1',
        'Accept-Language': 'en-US,en;q=0.9',
        'x-li-lang': 'en_US',
        'x-restli-protocol-version': '2.0.0'
      }
    });

    if (accessToken) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    }

    // Setup request interceptor for rate limiting
    this.client.interceptors.request.use(this.rateLimitInterceptor.bind(this));
  }

  private async rateLimitInterceptor(config: any) {
    // Implement rate limiting to avoid detection
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Check if we're within rate limit window
    if (this.requestCount >= this.maxRequestsPerWindow) {
      const windowReset = this.lastRequestTime + this.rateLimitWindow;
      if (now < windowReset) {
        const delay = windowReset - now;
        console.log(`⚠️  Rate limit reached: waiting ${Math.ceil(delay / 1000)}s`);
        await new Promise(resolve => setTimeout(resolve, delay));
        this.requestCount = 0;
      }
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
    
    return config;
  }

  async searchJobs(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      console.log('🔍 Advanced LinkedIn job search starting...');
      
      let jobs: JobResult[] = [];
      
      if (this.accessToken) {
        // Use authenticated API for better results
        jobs = await this.searchAuthenticatedJobs(params);
      } else {
        // Use guest API (limited but doesn't require auth)
        jobs = await this.searchGuestJobs(params);
      }

      return {
        jobs,
        totalCount: jobs.length,
        platform: 'linkedin-advanced',
        searchParams: params,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Advanced LinkedIn search failed:', error);
      return {
        jobs: [],
        totalCount: 0,
        platform: 'linkedin-advanced',
        searchParams: params,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async searchAuthenticatedJobs(params: JobSearchParams): Promise<JobResult[]> {
    try {
      const searchParams = this.buildSearchParams(params);
      const url = `${this.baseUrl}/voyagerJobsDashJobCards`;
      
      const response = await this.client.get(url, { params: searchParams });
      const jobCards = response.data?.included?.filter((item: any) => 
        item.$type === 'com.linkedin.voyager.dash.jobs.JobPosting'
      ) || [];

      return this.transformLinkedInJobs(jobCards, 'authenticated');

    } catch (error) {
      console.error('❌ Authenticated LinkedIn search failed:', error);
      return [];
    }
  }

  private async searchGuestJobs(params: JobSearchParams): Promise<JobResult[]> {
    try {
      // Use LinkedIn's guest job search API
      const searchParams = {
        keywords: params.searchTerm,
        location: params.location,
        distance: '25',
        f_TPR: this.mapDatePosted(params.datePosted),
        f_WT: params.remoteOnly ? '2' : undefined, // 2 = Remote
        f_E: this.mapExperienceLevel(params.experienceLevel),
        start: '0',
        count: '25'
      };

      // Remove undefined parameters
      const cleanParams = Object.fromEntries(
        Object.entries(searchParams).filter(([_, value]) => value !== undefined)
      );

      const response = await this.client.get(`${this.jobsBaseUrl}/jobPostings`, {
        params: cleanParams
      });

      const jobElements = response.data?.elements || [];
      return this.transformGuestJobs(jobElements);

    } catch (error) {
      console.error('❌ Guest LinkedIn search failed:', error);
      return [];
    }
  }

  private buildSearchParams(params: JobSearchParams): any {
    return {
      decorationId: 'com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-174',
      count: 25,
      q: 'jobSearch',
      query: `(keywords:${params.searchTerm || ''},locationFallback:${params.location || 'United States'})`,
      sortBy: 'DD', // Date descending
      filters: this.buildFilters(params)
    };
  }

  private buildFilters(params: JobSearchParams): string {
    const filters: string[] = [];
    
    if (params.remoteOnly) {
      filters.push('workplaceType->2'); // Remote
    }
    
    if (params.experienceLevel) {
      const levelMap = {
        'entry': '1,2', // Internship, Entry level
        'mid': '3,4',   // Associate, Mid-Senior level
        'senior': '5,6' // Director, Executive
      };
      filters.push(`experience->${levelMap[params.experienceLevel]}`);
    }

    if (params.datePosted) {
      const dateMap = {
        'today': 'r86400',
        'week': 'r604800', 
        'month': 'r2592000'
      };
      filters.push(`timePostedRange->${dateMap[params.datePosted] || 'r604800'}`);
    }

    return `List(${filters.join(',')})`;
  }

  private transformLinkedInJobs(jobCards: any[], source: string): JobResult[] {
    return jobCards.map((job: any, index: number) => ({
      id: job.jobPostingId || `linkedin-${source}-${index}-${Date.now()}`,
      title: job.title || 'Unknown Title',
      company: job.companyDetails?.company || 'Unknown Company',
      location: job.formattedLocation || 'Remote',
      description: this.extractDescription(job.description?.text || ''),
      salary: job.compensation?.salary || undefined,
      url: `https://www.linkedin.com/jobs/view/${job.jobPostingId}`,
      platform: 'linkedin-advanced',
      datePosted: job.listedAt ? new Date(job.listedAt).toISOString() : new Date().toISOString(),
      experienceLevel: this.mapLinkedInExperienceLevel(job.formattedExperienceLevel),
      remote: job.workplaceTypes?.includes('1') || false, // 1 = Remote in LinkedIn
      metadata: {
        source,
        companyId: job.companyDetails?.companyResolutionResult?.entityUrn,
        industryName: job.companyDetails?.company?.industryName,
        workplaceTypes: job.workplaceTypes,
        skills: job.skillsMatch?.skills || [],
        applicantCount: job.applies,
        benefits: job.benefits || []
      }
    }));
  }

  private transformGuestJobs(jobElements: any[]): JobResult[] {
    return jobElements.map((job: any, index: number) => {
      const jobData = job.jobPostingResolutionResult || job;
      
      return {
        id: jobData.jobPostingId || `linkedin-guest-${index}-${Date.now()}`,
        title: jobData.title || 'Unknown Title',
        company: jobData.companyName || 'Unknown Company',
        location: jobData.formattedLocation || jobData.locationName || 'Remote',
        description: this.extractDescription(jobData.description || ''),
        url: `https://www.linkedin.com/jobs/view/${jobData.jobPostingId}`,
        platform: 'linkedin-advanced',
        datePosted: jobData.originalListedAt ? new Date(jobData.originalListedAt).toISOString() : new Date().toISOString(),
        experienceLevel: this.extractExperienceFromDescription(jobData.description || jobData.title || ''),
        remote: this.isRemoteJob(jobData.formattedLocation, jobData.description),
        metadata: {
          source: 'guest',
          workRemoteAllowed: jobData.workRemoteAllowed,
          workplaceTypesFromDescription: this.extractWorkplaceTypes(jobData.description || ''),
          applicantCount: jobData.applies
        }
      };
    });
  }

  private extractDescription(description: string): string {
    // Clean and truncate description
    return description
      .replace(/<[^>]*>/g, '') // Remove HTML
      .replace(/\n\s*\n/g, '\n') // Remove extra line breaks
      .trim()
      .substring(0, 500);
  }

  private mapDatePosted(datePosted?: string): string | undefined {
    switch (datePosted) {
      case 'today': return 'r86400';
      case 'week': return 'r604800';
      case 'month': return 'r2592000';
      default: return 'r604800';
    }
  }

  private mapExperienceLevel(level?: string): string | undefined {
    switch (level) {
      case 'entry': return '1,2';
      case 'mid': return '3,4';
      case 'senior': return '5,6';
      default: return undefined;
    }
  }

  private mapLinkedInExperienceLevel(level?: string): string {
    if (!level) return 'mid';
    const levelStr = level.toLowerCase();
    
    if (levelStr.includes('entry') || levelStr.includes('intern') || levelStr.includes('associate')) return 'entry';
    if (levelStr.includes('senior') || levelStr.includes('director') || levelStr.includes('lead')) return 'senior';
    return 'mid';
  }

  private extractExperienceFromDescription(text: string): string {
    const content = text.toLowerCase();
    
    if (content.includes('senior') || content.includes('lead') || content.includes('principal') || content.includes('director')) {
      return 'senior';
    }
    if (content.includes('junior') || content.includes('entry') || content.includes('intern') || content.includes('associate')) {
      return 'entry';
    }
    return 'mid';
  }

  private isRemoteJob(location: string, description: string): boolean {
    const text = `${location} ${description}`.toLowerCase();
    return text.includes('remote') || text.includes('work from home') || text.includes('anywhere');
  }

  private extractWorkplaceTypes(description: string): string[] {
    const types: string[] = [];
    const content = description.toLowerCase();
    
    if (content.includes('remote') || content.includes('work from home')) types.push('remote');
    if (content.includes('hybrid')) types.push('hybrid');
    if (content.includes('on-site') || content.includes('onsite') || content.includes('office')) types.push('onsite');
    
    return types;
  }

  // Method to get company insights (inspired by Job Hunter 3000's approach)
  async getCompanyInsights(companyId: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Authentication required for company insights');
    }

    try {
      const response = await this.client.get(`${this.baseUrl}/organization/companies/${companyId}`, {
        params: {
          decorationId: 'com.linkedin.voyager.deco.organization.web.WebFullCompanyMain-12'
        }
      });

      return {
        name: response.data.name,
        industry: response.data.industryName,
        size: response.data.staffCountRange,
        headquarters: response.data.headquarters,
        founded: response.data.founded,
        specialties: response.data.specialties,
        websiteUrl: response.data.websiteUrl,
        description: response.data.description
      };

    } catch (error) {
      console.error('❌ Failed to get company insights:', error);
      return null;
    }
  }

  // Method to get job recommendations based on profile
  async getJobRecommendations(profileId?: string): Promise<JobResult[]> {
    if (!this.accessToken) {
      console.log('⚠️  Authentication required for personalized recommendations');
      return [];
    }

    try {
      const response = await this.client.get(`${this.baseUrl}/voyagerJobsDashJobCards`, {
        params: {
          decorationId: 'com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-174',
          count: 10,
          q: 'jobRecommendations',
          profileId: profileId || 'me'
        }
      });

      const jobCards = response.data?.included?.filter((item: any) => 
        item.$type === 'com.linkedin.voyager.dash.jobs.JobPosting'
      ) || [];

      return this.transformLinkedInJobs(jobCards, 'recommendations');

    } catch (error) {
      console.error('❌ Failed to get job recommendations:', error);
      return [];
    }
  }

  // Enhanced rate limiting status
  getRateLimitStatus(): { requestCount: number; windowReset: number; canMakeRequest: boolean } {
    const now = Date.now();
    const windowReset = this.lastRequestTime + this.rateLimitWindow;
    
    return {
      requestCount: this.requestCount,
      windowReset: Math.max(0, windowReset - now),
      canMakeRequest: this.requestCount < this.maxRequestsPerWindow || now >= windowReset
    };
  }
}