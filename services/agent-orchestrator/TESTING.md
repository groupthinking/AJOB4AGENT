# AJOB4AGENT Testing Guide

## 🚀 Quick Start

### 1. Setup Environment
```bash
cd services/agent-orchestrator
cp .env.example .env
# Edit .env with your LinkedIn/Wellfound credentials
```

### 2. Build & Test
```bash
npm run build
node test-agent.js
```

## 🧪 Testing Options

### Option A: Local Testing (Recommended)
**Best for:** Full browser automation testing, real job applications

**Steps:**
1. **Setup credentials** in `.env` file
2. **Find a real job posting** URL (LinkedIn, Wellfound, etc.)
3. **Update test data** in `test-agent.js`
4. **Run test:** `node test-agent.js`
5. **Watch browser** (set `headless: false` in agent files)

**What you'll see:**
- Browser opens automatically
- Logs in to job sites
- Navigates to job posting
- Fills application form
- Submits (currently simulated)

### Option B: API Testing
**Best for:** Testing server endpoints and data flow

**Steps:**
1. **Start server:** `npm run dev`
2. **Test health endpoint:**
   ```bash
   curl http://localhost:3000/health
   ```
3. **Test Stripe routes:**
   ```bash
   curl -X POST http://localhost:3000/api/create-checkout-session \
     -H "Content-Type: application/json" \
     -d '{"priceId": "price_test123"}'
   ```

## 📋 Test Data You Can Provide

### Job Application Test
```javascript
{
  "job_id": "unique_id_123",
  "platform": "linkedin", // or "glassdoor", "wellfound"
  "job_url": "https://www.linkedin.com/jobs/view/ACTUAL_JOB_ID/",
  "tailored_resume": "Your customized resume text...",
  "cover_letter": "Your cover letter text...",
  "outreach_message": "LinkedIn message to recruiter...",
  "confidence_score": 0.85
}
```

### Real Job URLs to Test:
- **LinkedIn:** `https://www.linkedin.com/jobs/view/[JOB_ID]/`
- **Wellfound:** `https://wellfound.com/jobs/[JOB_ID]`
- **Glassdoor:** `https://www.glassdoor.com/job-listing/[JOB_ID]`

## 🔧 Troubleshooting

### Common Issues:
1. **Missing credentials**: Check `.env` file
2. **Browser errors**: Install Playwright: `npx playwright install`
3. **Job URL invalid**: Use recent, active job postings
4. **Rate limiting**: Add delays between requests

### Debug Mode:
- Set `headless: false` in agent files to watch browser
- Check console logs for detailed error messages
- Use `npm run dev` for hot reloading during development

## 📊 What Gets Tested:
- ✅ TypeScript compilation
- ✅ Server startup
- ✅ API endpoints
- ✅ Browser automation
- ✅ Job site login
- ✅ Form filling
- ✅ Application submission (simulated)
- ✅ Error handling
- ✅ Status reporting

## 🎯 Success Indicators:
- Server runs on port 3000
- Agents create successfully
- Browser opens and navigates to job
- Login process completes
- Application form gets filled
- Status messages appear in console