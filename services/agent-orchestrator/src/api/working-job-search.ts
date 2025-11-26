import { Router, Request, Response } from 'express';
import { WorkingPlatformManager } from '../adapters/working-platform-manager';
import { JobSearchParams } from '../types/job-search';

const router = Router();
let platformManager: WorkingPlatformManager;

// Initialize the working platform manager
const initializePlatformManager = async () => {
  if (!platformManager) {
    platformManager = new WorkingPlatformManager();
    await platformManager.initialize();
  }
};

// Search jobs across all available platforms
router.post('/search', async (req: Request, res: Response) => {
  try {
    await initializePlatformManager();

    const searchParams: JobSearchParams = {
      searchTerm: req.body.searchTerm || 'software engineer',
      location: req.body.location || 'San Francisco, CA',
      platforms: req.body.platforms, // Will auto-select available platforms if not provided
      experienceLevel: req.body.experienceLevel,
      remoteOnly: req.body.remoteOnly,
      salaryMin: req.body.salaryMin,
      datePosted: req.body.datePosted || 'week'
    };

    // Get user tokens from headers (in production, get from session/database)
    const userTokens = {
      github: req.headers['x-github-token'],
      google: req.headers['x-google-token'],
      linkedin: req.headers['x-linkedin-token']
    };

    console.log(`🔍 Working job search: "${searchParams.searchTerm}" in ${searchParams.location}`);

    const startTime = Date.now();
    const results = await platformManager.searchAllPlatforms(searchParams, userTokens);
    const duration = Date.now() - startTime;

    // Aggregate results
    const allJobs = results.flatMap(result => result.jobs);
    const platformStats = results.reduce((stats, result) => {
      stats[result.platform] = result.totalCount;
      return stats;
    }, {} as { [key: string]: number });

    console.log(`✅ Search completed in ${duration}ms - Found ${allJobs.length} jobs across ${results.length} platforms`);

    res.json({
      success: true,
      totalJobs: allJobs.length,
      platforms: results.length,
      jobs: allJobs,
      platformStats,
      searchParams,
      performance: {
        duration_ms: duration,
        platforms_searched: results.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Working job search error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Get platform status and availability
router.get('/platforms', async (req: Request, res: Response) => {
  try {
    await initializePlatformManager();
    
    const platformStatus = platformManager.getPlatformStatus();
    const userTokens = {
      github: req.headers['x-github-token'],
      google: req.headers['x-google-token'],
      linkedin: req.headers['x-linkedin-token']
    };
    const availablePlatforms = platformManager.getAvailablePlatforms(userTokens);

    res.json({
      success: true,
      platforms: platformStatus,
      available: availablePlatforms,
      counts: {
        total: Object.keys(platformStatus).length,
        available: availablePlatforms.length,
        no_auth: availablePlatforms.filter(p => platformStatus[p]?.authType === 'none').length,
        oauth: availablePlatforms.filter(p => platformStatus[p]?.authType === 'oauth').length
      },
      configuration: {
        no_auth_platforms: ['indeed-rss', 'remoteok', 'ycombinator', 'weworkremotely', 'stackoverflow'],
        oauth_platforms: ['github', 'google'],
        future_platforms: ['linkedin', 'glassdoor']
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Search specific platform
router.post('/platform/:platform', async (req: Request, res: Response) => {
  try {
    await initializePlatformManager();
    
    const platform = req.params.platform;
    const searchParams: JobSearchParams = {
      searchTerm: req.body.searchTerm || 'software engineer',
      location: req.body.location || 'San Francisco, CA',
      platforms: [platform],
      experienceLevel: req.body.experienceLevel,
      remoteOnly: req.body.remoteOnly,
      salaryMin: req.body.salaryMin,
      datePosted: req.body.datePosted || 'week'
    };

    const userTokens = {
      github: req.headers['x-github-token'],
      google: req.headers['x-google-token'],
      linkedin: req.headers['x-linkedin-token']
    };

    const result = await platformManager.searchPlatform(platform, searchParams, userTokens);
    
    res.json({
      success: true,
      platform,
      totalJobs: result.totalCount,
      jobs: result.jobs,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Get OAuth authorization URLs
router.get('/auth/:platform/url', async (req: Request, res: Response) => {
  try {
    await initializePlatformManager();
    
    const platform = req.params.platform;
    const oauthManager = platformManager.getOAuthManager();
    
    if (!oauthManager.isPlatformConfigured(platform)) {
      res.status(400).json({
        success: false,
        error: `OAuth not configured for ${platform}`,
        required_env: [`${platform.toUpperCase()}_CLIENT_ID`, `${platform.toUpperCase()}_CLIENT_SECRET`]
      });
      return;
    }

    // Forward to OAuth manager
    req.url = `/auth/${platform}`;
    oauthManager.getRouter().handle(req, res);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check for working platforms
router.get('/health', async (req: Request, res: Response) => {
  try {
    await initializePlatformManager();
    
    const platformStatus = platformManager.getPlatformStatus();
    const availableCount = Object.values(platformStatus).filter(status => status.available).length;
    
    res.json({
      status: 'healthy',
      service: 'working-job-search',
      platforms: {
        total: Object.keys(platformStatus).length,
        available: availableCount,
        working: availableCount >= 3 // Healthy if at least 3 platforms work
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Configuration help
router.get('/setup', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Working Job Search API Setup Guide',
    immediate_platforms: {
      'indeed-rss': 'Works immediately - no setup required',
      'remoteok': 'Works immediately - no setup required',
      'ycombinator': 'Works immediately - no setup required',
      'weworkremotely': 'Works immediately - no setup required',
      'stackoverflow': 'Works immediately - no setup required'
    },
    oauth_setup: {
      github: {
        steps: [
          'Go to https://github.com/settings/applications/new',
          'Create OAuth App with redirect URI: http://localhost:8080/auth/github/callback',
          'Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables'
        ],
        test: 'GET /api/working/auth/github/url'
      },
      google: {
        steps: [
          'Go to https://console.cloud.google.com/apis/credentials',
          'Create OAuth 2.0 Client ID with redirect URI: http://localhost:8080/auth/google/callback',
          'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables'
        ],
        test: 'GET /api/working/auth/google/url'
      }
    },
    usage: {
      search_all: 'POST /api/working/search',
      platform_specific: 'POST /api/working/platform/{platform}',
      check_status: 'GET /api/working/platforms'
    }
  });
});

export default router;