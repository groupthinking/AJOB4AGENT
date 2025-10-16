import { Router, Request, Response } from 'express';
import { PlatformManager } from '../adapters/platform-manager';
import { JobSearchParams } from '../types/job-search';

const router = Router();
let platformManager: PlatformManager;

// Initialize platform manager
const initializePlatformManager = async () => {
  if (!platformManager) {
    platformManager = new PlatformManager();
    await platformManager.initialize();
  }
};

// Search jobs across multiple platforms
router.post('/search', async (req: Request, res: Response) => {
  try {
    await initializePlatformManager();

    const searchParams: JobSearchParams = {
      searchTerm: req.body.searchTerm || 'software engineer',
      location: req.body.location || 'San Francisco, CA',
      platforms: req.body.platforms || ['indeed', 'linkedin', 'glassdoor', 'ziprecruiter'],
      experienceLevel: req.body.experienceLevel,
      remoteOnly: req.body.remoteOnly,
      salaryMin: req.body.salaryMin,
      datePosted: req.body.datePosted || 'week'
    };

    console.log(`🔍 Searching jobs: "${searchParams.searchTerm}" in ${searchParams.location}`);
    console.log(`📍 Platforms: ${searchParams.platforms.join(', ')}`);

    const results = await platformManager.searchAllPlatforms(searchParams);
    
    const totalJobs = results.reduce((sum, result) => sum + result.totalCount, 0);
    console.log(`✅ Found ${totalJobs} jobs across ${results.length} platform groups`);

    res.json({
      success: true,
      totalJobs,
      platforms: results.length,
      searchParams,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Job search error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get supported platforms
router.get('/platforms', async (req: Request, res: Response) => {
  try {
    await initializePlatformManager();
    const platforms = platformManager.getSupportedPlatforms();
    
    res.json({
      success: true,
      platforms,
      count: platforms.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
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

    const result = await platformManager.searchPlatform(platform, searchParams);
    
    res.json({
      success: true,
      platform,
      totalJobs: result.totalCount,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;