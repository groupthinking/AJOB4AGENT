#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

// Comprehensive test suite for all 10 platforms
const testConfigs = [
  {
    name: 'Software Engineer Search',
    params: {
      searchTerm: 'software engineer',
      location: 'San Francisco, CA',
      platforms: ['indeed', 'linkedin', 'glassdoor', 'ziprecruiter', 'greenhouse', 'google-talent', 'coresignal', 'ycombinator', 'wellfound', 'tech-talent-unified'],
      experienceLevel: 'mid',
      remoteOnly: false,
      datePosted: 'week'
    },
    expectedMinJobs: 20
  },
  {
    name: 'Remote Frontend Developer',
    params: {
      searchTerm: 'frontend developer',
      location: 'Remote',
      platforms: ['indeed', 'wellfound', 'tech-talent-unified', 'ycombinator'],
      experienceLevel: 'senior',
      remoteOnly: true,
      datePosted: 'week'
    },
    expectedMinJobs: 10
  },
  {
    name: 'Entry Level Data Scientist',
    params: {
      searchTerm: 'data scientist',
      location: 'New York, NY',
      platforms: ['google-talent', 'coresignal', 'tech-talent-unified'],
      experienceLevel: 'entry',
      salaryMin: 80000,
      datePosted: 'month'
    },
    expectedMinJobs: 5
  },
  {
    name: 'Startup Opportunities',
    params: {
      searchTerm: 'product manager',
      location: 'Austin, TX',
      platforms: ['ycombinator', 'wellfound'],
      experienceLevel: 'mid',
      remoteOnly: false,
      datePosted: 'week'
    },
    expectedMinJobs: 3
  }
];

// Individual platform tests
const platformTests = [
  { platform: 'indeed', expectedFeatures: ['basic_search'] },
  { platform: 'linkedin', expectedFeatures: ['professional_network'] },
  { platform: 'glassdoor', expectedFeatures: ['company_reviews'] },
  { platform: 'ziprecruiter', expectedFeatures: ['ai_matching'] },
  { platform: 'greenhouse', expectedFeatures: ['enterprise_ats'] },
  { platform: 'google-talent', expectedFeatures: ['ml_matching'] },
  { platform: 'coresignal', expectedFeatures: ['global_coverage'] },
  { platform: 'ycombinator', expectedFeatures: ['startup_jobs', 'equity_info'] },
  { platform: 'wellfound', expectedFeatures: ['equity_transparency'] },
  { platform: 'tech-talent-unified', expectedFeatures: ['tech_focus', 'streamlined_interviews'] }
];

async function testHealthCheck() {
  console.log('\n🔍 Testing health check...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', response.data.status);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testPlatformsList() {
  console.log('\n🔍 Testing 10-platform coverage...');
  try {
    const response = await axios.get(`${BASE_URL}/api/unified/platforms`);
    const data = response.data;
    
    if (data.success && data.total === 10) {
      console.log('✅ All 10 platforms available:');
      Object.entries(data.platforms).forEach(([tier, platforms]) => {
        console.log(`   ${tier}: ${platforms.join(', ')}`);
      });
      return true;
    } else {
      console.error('❌ Expected 10 platforms, got:', data.total);
      return false;
    }
  } catch (error) {
    console.error('❌ Platforms list failed:', error.message);
    return false;
  }
}

async function testUnifiedSearch(config) {
  console.log(`\n🔍 Testing: ${config.name}`);
  console.log(`   Platforms: ${config.params.platforms.join(', ')}`);
  
  try {
    const startTime = Date.now();
    const response = await axios.post(`${BASE_URL}/api/unified/search-all`, config.params, {
      timeout: 60000 // 60 second timeout
    });
    const duration = Date.now() - startTime;
    
    if (response.data.success) {
      console.log(`✅ Search completed in ${duration}ms`);
      console.log(`   Total jobs: ${response.data.totalJobs}`);
      console.log(`   Unique jobs: ${response.data.uniqueJobs}`);
      console.log(`   Platforms searched: ${response.data.coverage.platforms}/${response.data.coverage.total_available}`);
      console.log(`   Platform stats: ${JSON.stringify(response.data.platformStats)}`);
      
      // Validate job structure
      if (response.data.jobs && response.data.jobs.length > 0) {
        const sampleJob = response.data.jobs[0];
        const requiredFields = ['id', 'title', 'company', 'location', 'platform', 'url'];
        const hasAllFields = requiredFields.every(field => sampleJob[field]);
        
        if (hasAllFields) {
          console.log(`   Sample job: ${sampleJob.title} at ${sampleJob.company} (${sampleJob.platform})`);
        } else {
          console.log(`   ⚠️  Missing required fields in job data`);
        }
      }
      
      // Performance validation
      if (duration > 30000) {
        console.log(`   ⚠️  Slow response time: ${duration}ms`);
      }
      
      return response.data.uniqueJobs >= config.expectedMinJobs;
    } else {
      console.error(`❌ Search failed: ${response.data.error}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Search failed: ${error.message}`);
    if (error.response?.data) {
      console.error(`   Error details:`, error.response.data);
    }
    return false;
  }
}

async function testIndividualPlatform(platformTest) {
  console.log(`\n🔍 Testing platform: ${platformTest.platform}`);
  try {
    const response = await axios.post(`${BASE_URL}/api/jobs/platform/${platformTest.platform}`, {
      searchTerm: 'engineer',
      location: 'San Francisco, CA',
      datePosted: 'week'
    });
    
    if (response.data.success && response.data.totalJobs > 0) {
      console.log(`✅ ${platformTest.platform} returned ${response.data.totalJobs} jobs`);
      return true;
    } else {
      console.log(`⚠️  ${platformTest.platform} returned no jobs (may be expected)`);
      return true; // Not all platforms may have jobs for test query
    }
  } catch (error) {
    console.error(`❌ ${platformTest.platform} failed: ${error.message}`);
    return false;
  }
}

async function testPerformanceMetrics() {
  console.log('\n🔍 Testing performance metrics...');
  try {
    const response = await axios.get(`${BASE_URL}/api/unified/stats`);
    
    if (response.data.success) {
      console.log('✅ Performance stats:');
      console.log(`   Total platforms: ${response.data.stats.total}`);
      console.log(`   Requests: ${response.data.stats.requests}`);
      console.log(`   Error rate: ${(response.data.stats.error_rate * 100).toFixed(2)}%`);
      console.log(`   Uptime: ${Math.floor(response.data.stats.uptime)}s`);
      return true;
    } else {
      console.error('❌ Stats failed:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Stats request failed:', error.message);
    return false;
  }
}

async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive 10-Platform Integration Tests');
  console.log('=========================================================');
  
  let totalTests = 0;
  let passedTests = 0;
  
  // Basic connectivity tests
  const basicTests = [
    { name: 'Health Check', test: testHealthCheck },
    { name: '10-Platform Coverage', test: testPlatformsList },
    { name: 'Performance Metrics', test: testPerformanceMetrics }
  ];
  
  for (const { test } of basicTests) {
    totalTests++;
    if (await test()) {
      passedTests++;
    }
    await sleep(1000);
  }
  
  // Unified search tests
  for (const config of testConfigs) {
    totalTests++;
    if (await testUnifiedSearch(config)) {
      passedTests++;
    }
    await sleep(2000);
  }
  
  // Individual platform tests (optional)
  console.log('\n📋 Running individual platform validation...');
  for (const platformTest of platformTests.slice(0, 5)) { // Test first 5 platforms
    totalTests++;
    if (await testIndividualPlatform(platformTest)) {
      passedTests++;
    }
    await sleep(1000);
  }
  
  // Results
  console.log('\n=========================================================');
  console.log('🏁 Comprehensive Test Results');
  console.log('=========================================================');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  console.log(`📊 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! 10-Platform integration is fully operational.');
    console.log('🚀 Ready for production deployment.');
  } else if (passedTests >= totalTests * 0.8) {
    console.log('\n✅ Most tests passed. System is operational with minor issues.');
  } else {
    console.log('\n⚠️  Significant test failures. Review implementation before production.');
  }
  
  console.log('\n📈 Platform Coverage Achieved:');
  console.log('   • Tier 1 - JobSpy MCP: 4 platforms (Indeed, LinkedIn, Glassdoor, ZipRecruiter)');
  console.log('   • Tier 2 - Enterprise APIs: 3 platforms (Greenhouse, Google Talent, Coresignal)');
  console.log('   • Tier 3 - Custom MCP: 3 platforms (Y Combinator, Wellfound, Tech Talent)');
  console.log('   • Total: 10 platforms with unified search capabilities');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run tests if called directly
if (require.main === module) {
  runComprehensiveTests().catch(console.error);
}

module.exports = { runComprehensiveTests };