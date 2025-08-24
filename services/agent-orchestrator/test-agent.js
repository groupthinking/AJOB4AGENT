// Load environment variables from .env file
require('dotenv').config();

const { LinkedInApplyAgent } = require('./dist/apply-agents/linkedin.agent');
const { GlassdoorApplyAgent } = require('./dist/apply-agents/glassdoor.agent');
const { WellfoundApplyAgent } = require('./dist/apply-agents/wellfound.agent');

// Mock TailoredOutput data for testing
const mockPayload = {
    job_id: "test_job_12345",
    platform: "linkedin",
    job_url: "https://www.linkedin.com/jobs/view/4289333317?refId=9Cc2Ub6jSDGkfBM7VXlhiA%3D%3D&trackingId=ETZ%2Fu1KcT5Kz2TS7dp0m6g%3D%3D",
    status: "ready",
    tailored_resume: "John Doe\nSoftware Engineer\n\nExperience:\n- 5+ years in web development\n- Expert in React, Node.js, TypeScript\n- Led team of 4 developers at ABC Corp\n\nEducation:\n- BS Computer Science, XYZ University",
    cover_letter: "Dear Hiring Manager,\n\nI am excited to apply for the Software Engineer position. My experience in React and TypeScript aligns perfectly with your requirements...\n\nBest regards,\nJohn Doe",
    outreach_message: "Hi [Recruiter Name], I'm interested in the Software Engineer role and would love to connect!",
    confidence_score: 0.85
};

// Mock RabbitMQ Channel for testing
const mockChannel = {
    publish: (exchange, routingKey, content) => {
        console.log(`[MOCK CHANNEL] Publishing to ${exchange}/${routingKey}:`, content.toString());
    },
    sendToQueue: (queue, content) => {
        console.log(`[MOCK CHANNEL] Sending to queue ${queue}:`, content.toString());
    }
};

async function testAgent(platform) {
    console.log(`\n=== Testing ${platform.toUpperCase()} Agent ===`);
    
    try {
        let agent;
        
        switch(platform) {
            case 'linkedin':
                agent = new LinkedInApplyAgent(mockPayload);
                break;
            case 'glassdoor':
                agent = new GlassdoorApplyAgent({...mockPayload, platform: 'glassdoor'});
                break;
            case 'wellfound':
                agent = new WellfoundApplyAgent({...mockPayload, platform: 'wellfound'});
                break;
            default:
                throw new Error('Unknown platform');
        }
        
        console.log(`✅ ${platform} agent created successfully`);
        console.log(`📋 Job ID: ${agent.payload.job_id}`);
        console.log(`🔗 Job URL: ${agent.payload.job_url}`);
        console.log(`⭐ Confidence Score: ${agent.payload.confidence_score}`);
        
        // Test the apply method (will be simulated)
        console.log(`\n🚀 Starting application process...`);
        await agent.apply(mockChannel);
        
        console.log(`✅ ${platform} agent test completed successfully`);
        
    } catch (error) {
        console.error(`❌ ${platform} agent test failed:`, error.message);
        console.error('Full error:', error);
    }
}

async function runAllTests() {
    console.log('🧪 AJOB4AGENT Testing Suite');
    console.log('============================');
    
    // Test each platform
    await testAgent('linkedin');
    await testAgent('glassdoor');
    await testAgent('wellfound');
    
    console.log('\n✅ All tests completed!');
    console.log('\n📝 Next Steps:');
    console.log('1. Copy .env.example to .env and fill in your credentials');
    console.log('2. Replace the job_url with a real job posting');
    console.log('3. Update the resume and cover letter content');
    console.log('4. Set headless: false in agents to watch browser automation');
}

// Handle uncaught errors gracefully
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
});

// Run the tests
runAllTests().catch(console.error);