#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

// Test configuration
const testSearchParams = {
  searchTerm: 'software engineer',
  location: 'San Francisco, CA',
  platforms: ['indeed', 'linkedin', 'glassdoor', 'ziprecruiter'],
  experienceLevel: 'mid',
  remoteOnly: false,
  datePosted: 'week'
};

async function testHealthCheck() {
  console.log('\n🔍 Testing health check...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testPlatformsList() {
  console.log('\n🔍 Testing platforms list...');
  try {
    const response = await axios.get(`${BASE_URL}/api/jobs/platforms`);
    console.log('✅ Platforms list:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Platforms list failed:', error.message);
    return false;
  }
}

async function testJobSearch() {
  console.log('\n🔍 Testing job search...');
  try {
    const response = await axios.post(`${BASE_URL}/api/jobs/search`, testSearchParams);
    console.log('✅ Job search results:');
    console.log(`   Total jobs: ${response.data.totalJobs}`);
    console.log(`   Platforms: ${response.data.platforms}`);
    console.log(`   Search term: "${response.data.searchParams.searchTerm}"`);
    console.log(`   Location: ${response.data.searchParams.location}`);
    
    if (response.data.results.length > 0) {
      const firstResult = response.data.results[0];
      console.log(`   First platform: ${firstResult.platform}`);
      console.log(`   Sample jobs: ${Math.min(3, firstResult.jobs.length)}`);
      
      firstResult.jobs.slice(0, 3).forEach((job, index) => {
        console.log(`     ${index + 1}. ${job.title} at ${job.company} (${job.platform})`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Job search failed:', error.response?.data || error.message);
    return false;
  }
}

async function testSpecificPlatform() {
  console.log('\n🔍 Testing specific platform (Indeed)...');
  try {
    const response = await axios.post(`${BASE_URL}/api/jobs/platform/indeed`, {
      searchTerm: 'frontend developer',
      location: 'New York, NY',
      datePosted: 'today'
    });
    
    console.log('✅ Indeed search results:');
    console.log(`   Platform: ${response.data.platform}`);
    console.log(`   Total jobs: ${response.data.totalJobs}`);
    
    if (response.data.result.jobs.length > 0) {
      console.log(`   Sample job: ${response.data.result.jobs[0].title} at ${response.data.result.jobs[0].company}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Platform search failed:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting MCP Integration Tests');
  console.log('=====================================');
  
  const tests = [
    { name: 'Health Check', test: testHealthCheck },
    { name: 'Platforms List', test: testPlatformsList },
    { name: 'Job Search', test: testJobSearch },
    { name: 'Specific Platform', test: testSpecificPlatform }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ Test "${name}" threw error:`, error.message);
      failed++;
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n=====================================');
  console.log('🏁 Test Results Summary');
  console.log('=====================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! MCP integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };