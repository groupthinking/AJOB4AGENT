import { JobSearchParams, JobResult, JobSearchResponse } from '../types/job-search';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class RealisticPlatformManager {
  private supportedPlatforms: string[] = [
    'indeed-rss',      // Indeed RSS feeds (no auth needed)
    'ycombinator',     // YC job board (public)
    'github-jobs',     // GitHub job board (public) 
    'stackoverflow',   // Stack Overflow jobs (public)
    'remoteok',        // RemoteOK (public API)
    'weworkremotely',  // We Work Remotely (public)
    'freelancer'       // Freelancer.com (public listings)
  ];

  constructor() {
    console.log('🎯 Initializing realistic platform manager with working platforms');
  }

  async initialize(): Promise<void> {
    console.log(`✅ Platform Manager initialized with ${this.supportedPlatforms.length} working platforms`);
    console.log('📋 Platforms: Indeed RSS, YC Jobs, GitHub Jobs, Stack Overflow, RemoteOK, We Work Remotely, Freelancer');
  }

  async searchAllPlatforms(params: JobSearchParams): Promise<JobSearchResponse[]> {
    const results: JobSearchResponse[] = [];
    
    // Only search platforms that actually work
    const workingPlatforms = params.platforms?.filter(p => 
      this.supportedPlatforms.includes(p)
    ) || ['indeed-rss', 'ycombinator', 'remoteok'];

    const searchPromises = workingPlatforms.map(platform => 
      this.searchPlatform(platform, params)
    );

    try {
      const allResults = await Promise.allSettled(searchPromises);
      
      allResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`❌ Platform ${workingPlatforms[index]} failed:`, result.reason);
        }
      });

    } catch (error) {
      console.error('❌ Search error:', error);
    }

    return results;
  }

  async searchPlatform(platform: string, params: JobSearchParams): Promise<JobSearchResponse> {
    switch (platform) {
      case 'indeed-rss':
        return await this.searchIndeedRSS(params);
      case 'ycombinator':
        return await this.searchYCombinator(params);
      case 'github-jobs':
        return await this.searchGitHubJobs(params);
      case 'stackoverflow':
        return await this.searchStackOverflow(params);
      case 'remoteok':
        return await this.searchRemoteOK(params);
      case 'weworkremotely':
        return await this.searchWeWorkRemotely(params);
      case 'freelancer':
        return await this.searchFreelancer(params);
      default:
        throw new Error(`Platform ${platform} not supported`);
    }
  }

  // Indeed RSS feeds - WORKS without auth
  private async searchIndeedRSS(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      const query = encodeURIComponent(params.searchTerm || 'developer');
      const location = encodeURIComponent(params.location || 'remote');
      
      // Indeed RSS is publicly accessible
      const rssUrl = `https://www.indeed.com/rss?q=${query}&l=${location}`;
      
      const response = await axios.get(rssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JobAggregator/1.0)'
        },
        timeout: 10000
      });

      const jobs = this.parseIndeedRSS(response.data);
      
      return {
        jobs,
        totalCount: jobs.length,
        platform: 'indeed-rss',
        searchParams: params,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Indeed RSS failed:', error);
      return this.emptyResponse('indeed-rss', params);
    }
  }

  // Y Combinator - WORKS, public job board
  private async searchYCombinator(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      const response = await axios.get('https://www.workatastartup.com/jobs', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JobAggregator/1.0)'
        },
        timeout: 15000
      });

      const jobs = this.parseYCJobs(response.data, params);
      
      return {
        jobs,
        totalCount: jobs.length,
        platform: 'ycombinator',
        searchParams: params,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Y Combinator failed:', error);
      return this.emptyResponse('ycombinator', params);
    }
  }

  // RemoteOK - WORKS, has public API
  private async searchRemoteOK(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      const response = await axios.get('https://remoteok.io/api', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JobAggregator/1.0)'
        },
        timeout: 10000
      });

      // RemoteOK returns JSON directly
      const jobsData = response.data.slice(1); // Remove first element (metadata)
      const jobs = this.parseRemoteOKJobs(jobsData, params);
      
      return {
        jobs,
        totalCount: jobs.length,
        platform: 'remoteok',
        searchParams: params,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ RemoteOK failed:', error);
      return this.emptyResponse('remoteok', params);
    }
  }

  // GitHub Jobs - Public listings
  private async searchGitHubJobs(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      // GitHub's jobs page is scrapeable
      const response = await axios.get('https://jobs.github.com/positions.json', {
        params: {
          description: params.searchTerm,
          location: params.location,
          full_time: !params.remoteOnly
        },
        timeout: 10000
      });

      const jobs = this.parseGitHubJobs(response.data, params);
      
      return {
        jobs,
        totalCount: jobs.length,
        platform: 'github-jobs',
        searchParams: params,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ GitHub Jobs failed:', error);
      return this.emptyResponse('github-jobs', params);
    }
  }

  // Stack Overflow - Public job listings
  private async searchStackOverflow(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      const query = encodeURIComponent(params.searchTerm || 'developer');
      const response = await axios.get(`https://stackoverflow.com/jobs/feed?q=${query}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JobAggregator/1.0)'
        },
        timeout: 10000
      });

      const jobs = this.parseStackOverflowRSS(response.data);
      
      return {
        jobs,
        totalCount: jobs.length,
        platform: 'stackoverflow',
        searchParams: params,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Stack Overflow failed:', error);
      return this.emptyResponse('stackoverflow', params);
    }
  }

  // We Work Remotely - Public listings
  private async searchWeWorkRemotely(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      const response = await axios.get('https://weworkremotely.com/remote-jobs.rss', {
        timeout: 10000
      });

      const jobs = this.parseWeWorkRemotelyRSS(response.data);
      
      return {
        jobs,
        totalCount: jobs.length,
        platform: 'weworkremotely',
        searchParams: params,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ We Work Remotely failed:', error);
      return this.emptyResponse('weworkremotely', params);
    }
  }

  // Freelancer - Public project listings
  private async searchFreelancer(params: JobSearchParams): Promise<JobSearchResponse> {
    try {
      const response = await axios.get('https://www.freelancer.com/jobs/', {
        params: {
          keyword: params.searchTerm,
          location: params.location
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JobAggregator/1.0)'
        },
        timeout: 10000
      });

      const jobs = this.parseFreelancerJobs(response.data, params);
      
      return {
        jobs,
        totalCount: jobs.length,
        platform: 'freelancer',
        searchParams: params,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Freelancer failed:', error);
      return this.emptyResponse('freelancer', params);
    }
  }

  // Parsing methods
  private parseIndeedRSS(rssData: string): JobResult[] {
    const jobs: JobResult[] = [];
    const $ = cheerio.load(rssData, { xmlMode: true });
    
    $('item').each((index, element) => {
      const $item = $(element);
      const title = $item.find('title').text();
      const link = $item.find('link').text();
      const description = $item.find('description').text();
      const pubDate = $item.find('pubDate').text();
      
      if (title && link) {
        jobs.push({
          id: `indeed-${index}-${Date.now()}`,
          title: title.replace(/ at .+$/, ''), // Remove company from title
          company: this.extractCompanyFromTitle(title) || 'Unknown Company',
          location: this.extractLocationFromDescription(description) || 'Remote',
          description: description.replace(/<[^>]*>/g, ''), // Strip HTML
          url: link,
          platform: 'indeed',
          datePosted: new Date(pubDate).toISOString(),
          experienceLevel: this.extractExperienceLevel(title, description),
          remote: description.toLowerCase().includes('remote')
        });
      }
    });
    
    return jobs;
  }

  private parseRemoteOKJobs(jobsData: any[], params: JobSearchParams): JobResult[] {
    return jobsData
      .filter(job => {
        if (!params.searchTerm) return true;
        const searchTerm = params.searchTerm.toLowerCase();
        return job.position?.toLowerCase().includes(searchTerm) ||
               job.company?.toLowerCase().includes(searchTerm) ||
               job.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm));
      })
      .slice(0, 20)
      .map(job => ({
        id: `remoteok-${job.id}`,
        title: job.position || 'Unknown Position',
        company: job.company || 'Unknown Company',
        location: 'Remote',
        description: job.description || '',
        salary: job.salary_min && job.salary_max ? `$${job.salary_min} - $${job.salary_max}` : undefined,
        url: `https://remoteok.io/remote-jobs/${job.id}`,
        platform: 'remoteok',
        datePosted: new Date(job.date * 1000).toISOString(),
        experienceLevel: 'mid',
        remote: true,
        metadata: {
          tags: job.tags,
          apply_url: job.apply_url
        }
      }));
  }

  private parseYCJobs(html: string, params: JobSearchParams): JobResult[] {
    const $ = cheerio.load(html);
    const jobs: JobResult[] = [];
    
    $('.job-listing, .startup-job, [data-job]').each((index, element) => {
      const $job = $(element);
      const title = $job.find('.job-title, h3').first().text().trim();
      const company = $job.find('.company-name, .startup-name').first().text().trim();
      const location = $job.find('.location').first().text().trim();
      const description = $job.find('.description, p').first().text().trim();
      
      if (title && company) {
        jobs.push({
          id: `yc-${index}-${Date.now()}`,
          title,
          company,
          location: location || 'San Francisco, CA',
          description,
          url: `https://www.workatastartup.com/jobs/${index}`,
          platform: 'ycombinator',
          datePosted: new Date().toISOString(),
          experienceLevel: this.extractExperienceLevel(title, description),
          remote: location.toLowerCase().includes('remote')
        });
      }
    });
    
    return jobs;
  }

  private parseGitHubJobs(jobsData: any[], params: JobSearchParams): JobResult[] {
    return jobsData.map(job => ({
      id: job.id || `github-${Date.now()}`,
      title: job.title || 'Unknown Position',
      company: job.company || 'Unknown Company',
      location: job.location || 'Remote',
      description: job.description || '',
      url: job.url || job.how_to_apply || '',
      platform: 'github',
      datePosted: job.created_at || new Date().toISOString(),
      experienceLevel: this.extractExperienceLevel(job.title, job.description),
      remote: job.location?.toLowerCase().includes('remote') || false
    }));
  }

  private parseStackOverflowRSS(rssData: string): JobResult[] {
    const jobs: JobResult[] = [];
    const $ = cheerio.load(rssData, { xmlMode: true });
    
    $('item').each((index, element) => {
      const $item = $(element);
      const title = $item.find('title').text();
      const link = $item.find('link').text();
      const description = $item.find('description').text();
      const location = $item.find('location').text();
      
      if (title) {
        jobs.push({
          id: `stackoverflow-${index}-${Date.now()}`,
          title,
          company: 'Stack Overflow Job',
          location: location || 'Remote',
          description: description.replace(/<[^>]*>/g, ''),
          url: link,
          platform: 'stackoverflow',
          datePosted: new Date().toISOString(),
          experienceLevel: this.extractExperienceLevel(title, description),
          remote: location?.toLowerCase().includes('remote') || false
        });
      }
    });
    
    return jobs;
  }

  private parseWeWorkRemotelyRSS(rssData: string): JobResult[] {
    const jobs: JobResult[] = [];
    const $ = cheerio.load(rssData, { xmlMode: true });
    
    $('item').each((index, element) => {
      const $item = $(element);
      const title = $item.find('title').text();
      const link = $item.find('link').text();
      const description = $item.find('description').text();
      
      if (title) {
        jobs.push({
          id: `wwr-${index}-${Date.now()}`,
          title,
          company: 'Remote Company',
          location: 'Remote',
          description: description.replace(/<[^>]*>/g, ''),
          url: link,
          platform: 'weworkremotely',
          datePosted: new Date().toISOString(),
          experienceLevel: this.extractExperienceLevel(title, description),
          remote: true
        });
      }
    });
    
    return jobs;
  }

  private parseFreelancerJobs(html: string, params: JobSearchParams): JobResult[] {
    const $ = cheerio.load(html);
    const jobs: JobResult[] = [];
    
    $('.project-item, .job-item').each((index, element) => {
      const $job = $(element);
      const title = $job.find('.project-title, .job-title').first().text().trim();
      const description = $job.find('.project-description, .description').first().text().trim();
      const budget = $job.find('.budget, .price').first().text().trim();
      
      if (title) {
        jobs.push({
          id: `freelancer-${index}-${Date.now()}`,
          title,
          company: 'Freelancer Project',
          location: 'Remote',
          description,
          salary: budget,
          url: `https://www.freelancer.com/projects/${index}`,
          platform: 'freelancer',
          datePosted: new Date().toISOString(),
          experienceLevel: 'mid',
          remote: true
        });
      }
    });
    
    return jobs;
  }

  // Helper methods
  private extractCompanyFromTitle(title: string): string | undefined {
    const match = title.match(/ at (.+)$/);
    return match?.[1];
  }

  private extractLocationFromDescription(description: string): string | undefined {
    const locationRegex = /(?:in|at|location:)\s*([A-Za-z\s,]+)/i;
    const match = description.match(locationRegex);
    return match?.[1]?.trim();
  }

  private extractExperienceLevel(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();
    if (text.includes('senior') || text.includes('lead') || text.includes('principal')) return 'senior';
    if (text.includes('junior') || text.includes('entry') || text.includes('intern')) return 'entry';
    return 'mid';
  }

  private emptyResponse(platform: string, params: JobSearchParams): JobSearchResponse {
    return {
      jobs: [],
      totalCount: 0,
      platform,
      searchParams: params,
      timestamp: new Date().toISOString()
    };
  }

  getSupportedPlatforms(): string[] {
    return [...this.supportedPlatforms];
  }

  async shutdown(): Promise<void> {
    console.log('✅ Platform manager shut down');
  }
}