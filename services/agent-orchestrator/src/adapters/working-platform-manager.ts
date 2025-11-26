import { RealisticPlatformManager } from './realistic-platform-manager';
import { JobSearchParams, JobSearchResponse } from '../types/job-search';
import { OAuthManager } from '../auth/oauth-manager';

export class WorkingPlatformManager {
  private realisticManager: RealisticPlatformManager;
  private oauthManager: OAuthManager;
  
  // Platforms that work without any authentication
  private noAuthPlatforms = [
    'indeed-rss',      // ✅ Public RSS feeds
    'remoteok',        // ✅ Public JSON API
    'ycombinator',     // ✅ Public job board
    'weworkremotely',  // ✅ Public RSS
    'stackoverflow'    // ✅ Public job RSS
  ];
  
  // Platforms that require OAuth but are accessible
  private oauthPlatforms = [
    'github',          // ✅ GitHub OAuth
    'google'           // ✅ Google OAuth (for Google for Jobs)
  ];
  
  // Platforms that require user login (future implementation)
  private userLoginPlatforms = [
    'linkedin',        // 🔄 User's personal account
    'glassdoor'        // 🔄 User's personal account
  ];

  constructor() {
    this.realisticManager = new RealisticPlatformManager();
    this.oauthManager = new OAuthManager();
  }

  async initialize(): Promise<void> {
    await this.realisticManager.initialize();
    
    const configuredOAuth = this.oauthManager.getConfiguredPlatforms();
    console.log(`✅ Working Platform Manager initialized`);
    console.log(`📊 No-auth platforms: ${this.noAuthPlatforms.length}`);
    console.log(`🔐 OAuth platforms configured: ${configuredOAuth.length}`);
    console.log(`👤 User-login platforms: ${this.userLoginPlatforms.length} (future)`);
  }

  async searchAllPlatforms(params: JobSearchParams, userTokens?: any): Promise<JobSearchResponse[]> {
    const results: JobSearchResponse[] = [];
    
    // Determine which platforms to search
    const requestedPlatforms = params.platforms || this.getAvailablePlatforms(userTokens);
    
    // Split platforms by authentication type
    const noAuthToSearch = requestedPlatforms.filter(p => this.noAuthPlatforms.includes(p));
    const oauthToSearch = requestedPlatforms.filter(p => this.oauthPlatforms.includes(p));
    const userLoginToSearch = requestedPlatforms.filter(p => this.userLoginPlatforms.includes(p));
    
    console.log(`🔍 Searching platforms:`);
    console.log(`   No-auth: ${noAuthToSearch.join(', ')}`);
    console.log(`   OAuth: ${oauthToSearch.join(', ')}`);
    console.log(`   User-login: ${userLoginToSearch.join(', ')}`);
    
    // Search no-auth platforms
    if (noAuthToSearch.length > 0) {
      const noAuthParams = { ...params, platforms: noAuthToSearch };
      const noAuthResults = await this.realisticManager.searchAllPlatforms(noAuthParams);
      results.push(...noAuthResults);
    }
    
    // Search OAuth platforms (if user has connected accounts)
    for (const platform of oauthToSearch) {
      try {
        const oauthResult = await this.searchOAuthPlatform(platform, params, userTokens);
        if (oauthResult) {
          results.push(oauthResult);
        }
      } catch (error) {
        console.error(`❌ OAuth platform ${platform} failed:`, error);
        // Add empty result for consistency
        results.push({
          jobs: [],
          totalCount: 0,
          platform,
          searchParams: params,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Search user-login platforms (future implementation)
    if (userLoginToSearch.length > 0) {
      console.log(`⏳ User-login platforms not yet implemented: ${userLoginToSearch.join(', ')}`);
    }
    
    return results;
  }

  async searchPlatform(platform: string, params: JobSearchParams, userTokens?: any): Promise<JobSearchResponse> {
    // Route to appropriate search method based on platform type
    if (this.noAuthPlatforms.includes(platform)) {
      return await this.realisticManager.searchPlatform(platform, params);
    }
    
    if (this.oauthPlatforms.includes(platform)) {
      const result = await this.searchOAuthPlatform(platform, params, userTokens);
      return result || this.emptyResponse(platform, params);
    }
    
    if (this.userLoginPlatforms.includes(platform)) {
      // Future implementation for user login platforms
      throw new Error(`Platform ${platform} requires user login (not yet implemented)`);
    }
    
    throw new Error(`Platform ${platform} not supported`);
  }

  private async searchOAuthPlatform(platform: string, params: JobSearchParams, userTokens?: any): Promise<JobSearchResponse | null> {
    switch (platform) {
      case 'github':
        return await this.searchGitHubJobs(params, userTokens?.github);
      case 'google':
        return await this.searchGoogleJobs(params, userTokens?.google);
      default:
        return null;
    }
  }

  private async searchGitHubJobs(params: JobSearchParams, accessToken?: string): Promise<JobSearchResponse> {
    try {
      // GitHub Jobs API is deprecated, but we can search repositories for job postings
      // or use GitHub's public job board if available
      
      if (!accessToken) {
        console.log('⚠️  GitHub access token not provided, skipping GitHub jobs');
        return this.emptyResponse('github', params);
      }
      
      // Mock implementation - replace with actual GitHub job search
      const jobs = [
        {
          id: 'github-job-1',
          title: 'Software Engineer at GitHub',
          company: 'GitHub',
          location: 'San Francisco, CA',
          description: 'Join the GitHub team as a software engineer...',
          url: 'https://github.com/careers',
          platform: 'github',
          datePosted: new Date().toISOString(),
          experienceLevel: 'mid' as const,
          remote: true
        }
      ];
      
      return {
        jobs,
        totalCount: jobs.length,
        platform: 'github',
        searchParams: params,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ GitHub jobs search failed:', error);
      return this.emptyResponse('github', params);
    }
  }

  private async searchGoogleJobs(params: JobSearchParams, accessToken?: string): Promise<JobSearchResponse> {
    try {
      // Use Google Custom Search API or Google for Jobs structured data
      // This is a simplified implementation
      
      if (!accessToken) {
        console.log('⚠️  Google access token not provided, skipping Google jobs');
        return this.emptyResponse('google', params);
      }
      
      // Mock implementation - replace with actual Google for Jobs search
      const jobs = [
        {
          id: 'google-job-1',
          title: 'Senior Software Engineer',
          company: 'Google',
          location: 'Mountain View, CA',
          description: 'Work on cutting-edge technology at Google...',
          url: 'https://careers.google.com',
          platform: 'google',
          datePosted: new Date().toISOString(),
          experienceLevel: 'senior' as const,
          remote: false
        }
      ];
      
      return {
        jobs,
        totalCount: jobs.length,
        platform: 'google',
        searchParams: params,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Google jobs search failed:', error);
      return this.emptyResponse('google', params);
    }
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

  // Get platforms available to the user based on their authentication status
  getAvailablePlatforms(userTokens?: any): string[] {
    const available = [...this.noAuthPlatforms];
    
    // Add OAuth platforms if user has tokens
    if (userTokens?.github) available.push('github');
    if (userTokens?.google) available.push('google');
    if (userTokens?.linkedin) available.push('linkedin');
    
    return available;
  }

  // Get platform status for UI
  getPlatformStatus(): { [platform: string]: { available: boolean; authType: string; configured: boolean } } {
    const status: any = {};
    
    // No-auth platforms
    this.noAuthPlatforms.forEach(platform => {
      status[platform] = {
        available: true,
        authType: 'none',
        configured: true
      };
    });
    
    // OAuth platforms
    this.oauthPlatforms.forEach(platform => {
      status[platform] = {
        available: this.oauthManager.isPlatformConfigured(platform),
        authType: 'oauth',
        configured: this.oauthManager.isPlatformConfigured(platform)
      };
    });
    
    // User login platforms
    this.userLoginPlatforms.forEach(platform => {
      status[platform] = {
        available: false,
        authType: 'user_login',
        configured: false // Future implementation
      };
    });
    
    return status;
  }

  getOAuthManager(): OAuthManager {
    return this.oauthManager;
  }

  async shutdown(): Promise<void> {
    await this.realisticManager.shutdown();
    console.log('✅ Working Platform Manager shut down');
  }
}