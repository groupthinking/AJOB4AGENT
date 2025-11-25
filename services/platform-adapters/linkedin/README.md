# LinkedIn Job Scraper Adapter

A robust LinkedIn job scraper using Playwright headless browser automation. Part of the AJOB4AGENT platform adapter system.

## Features

- **Headless Browser Automation**: Uses Playwright for reliable web scraping
- **Anti-Bot Measures**: Mimics human behavior with delays, realistic user agents, and browser fingerprinting
- **Advanced Filtering**: Supports title, location, compensation, remote/on-site, and seniority filters
- **Rate Limiting**: Built-in throttle settings for ethical scraping
- **Unified Output Format**: Exports to standardized JSON for pipeline processing
- **Pluggable Design**: Implements the `PlatformAdapter` interface for easy integration

## Installation

```bash
cd services/platform-adapters/linkedin
npm install
```

Install Playwright browsers:

```bash
npx playwright install chromium
```

## Usage

### Basic Usage

```typescript
import { LinkedInJobScraper } from '@ajob4agent/linkedin-adapter';

async function searchJobs() {
  const scraper = new LinkedInJobScraper({
    headless: true,
    debug: true
  });

  await scraper.initialize();

  const results = await scraper.searchJobs({
    searchTerm: 'Software Engineer',
    location: 'San Francisco, CA',
    workType: 'remote',
    experienceLevel: 'mid'
  });

  console.log(`Found ${results.totalCount} jobs`);
  results.jobs.forEach(job => {
    console.log(`- ${job.title} at ${job.company}`);
  });

  await scraper.shutdown();
}

searchJobs();
```

### Advanced Usage with All Filters

```typescript
import { LinkedInJobScraper, LinkedInSearchParams } from '@ajob4agent/linkedin-adapter';

const scraper = new LinkedInJobScraper({
  headless: true,
  timeout: 60000,
  minDelay: 3000,
  maxDelay: 7000,
  maxRequestsPerMinute: 15,
  debug: true
});

await scraper.initialize();

const params: LinkedInSearchParams = {
  searchTerm: 'Senior Backend Engineer',
  location: 'New York, NY',
  salaryMin: 150000,
  salaryMax: 250000,
  workType: 'hybrid',
  experienceLevel: 'senior',
  datePosted: 'week',
  limit: 50,
  offset: 0
};

const results = await scraper.searchJobs(params);

// Process results
for (const job of results.jobs) {
  console.log({
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    salary: job.salary,
    remote: job.remote,
    url: job.url,
    datePosted: job.datePosted
  });
}

await scraper.shutdown();
```

### Using with Proxy

```typescript
const scraper = new LinkedInJobScraper({
  headless: true,
  proxyUrl: 'http://proxy.example.com:8080'
});
```

### Rate Limit Monitoring

```typescript
const scraper = new LinkedInJobScraper();
await scraper.initialize();

// Check rate limit status before making requests
const status = scraper.getRateLimitStatus();
console.log(`Requests made: ${status.requestCount}`);
console.log(`Window resets in: ${status.windowReset}ms`);
console.log(`Can make request: ${status.canMakeRequest}`);
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `headless` | boolean | `true` | Run browser in headless mode |
| `timeout` | number | `30000` | Request timeout in milliseconds |
| `minDelay` | number | `2000` | Minimum delay between requests (ms) |
| `maxDelay` | number | `5000` | Maximum delay between requests (ms) |
| `maxRequestsPerMinute` | number | `20` | Maximum requests per minute |
| `userAgent` | string | Chrome 120 | Custom user agent string |
| `proxyUrl` | string | - | Proxy URL for requests |
| `debug` | boolean | `false` | Enable verbose logging |

## Search Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `searchTerm` | string | Job title/keywords to search for |
| `location` | string | Location filter (city, state, country) |
| `salaryMin` | number | Minimum salary filter |
| `salaryMax` | number | Maximum salary filter |
| `workType` | enum | `'remote'` \| `'onsite'` \| `'hybrid'` \| `'any'` |
| `experienceLevel` | enum | `'internship'` \| `'entry'` \| `'associate'` \| `'mid'` \| `'senior'` \| `'director'` \| `'executive'` |
| `datePosted` | enum | `'today'` \| `'week'` \| `'month'` \| `'any'` |
| `limit` | number | Results per page (max 25) |
| `offset` | number | Pagination offset |

## Output Format

The scraper outputs jobs in a standardized format compatible with the AJOB4AGENT pipeline:

```typescript
interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  url: string;
  platform: 'linkedin';
  datePosted: string;
  experienceLevel?: string;
  remote?: boolean;
  metadata?: {
    linkedInJobId: string;
    workplaceTypes?: string[];
    applicantCount?: number;
    industry?: string;
    skills?: string[];
    benefits?: string[];
    companyLinkedInId?: string;
    easyApply?: boolean;
    promoted?: boolean;
  };
}
```

## Docker Support

The adapter is compatible with Docker. Include the following in your Dockerfile:

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

CMD ["node", "dist/index.js"]
```

Or use the docker-compose configuration:

```yaml
services:
  linkedin-scraper:
    build: ./services/platform-adapters/linkedin
    environment:
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
```

## Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- LinkedInJobScraper.test.ts
```

## Ethical Scraping Guidelines

This adapter is designed with ethical scraping practices in mind:

1. **Rate Limiting**: Built-in throttling to avoid overwhelming LinkedIn's servers
2. **Respectful Delays**: Human-like delays between requests
3. **No Authentication Bypass**: Uses LinkedIn's public job search pages
4. **Compliance**: Designed to work within LinkedIn's acceptable use

**Important**: Always respect LinkedIn's Terms of Service and robots.txt. Use this adapter responsibly and consider using LinkedIn's official APIs when available.

## Extending for Other Platforms

This adapter implements the `PlatformAdapter` interface, making it easy to create adapters for other job platforms:

```typescript
import { PlatformAdapter, LinkedInSearchParams, JobSearchResponse } from '@ajob4agent/linkedin-adapter';

class MyPlatformAdapter implements PlatformAdapter {
  readonly platform = 'my-platform';
  
  async initialize(): Promise<void> {
    // Initialize browser/connections
  }
  
  async searchJobs(params: LinkedInSearchParams): Promise<JobSearchResponse> {
    // Implement platform-specific scraping
  }
  
  async shutdown(): Promise<void> {
    // Cleanup resources
  }
}
```

## Troubleshooting

### Browser Not Installed

If you see an error about the browser not being installed:

```bash
npx playwright install chromium
```

### Rate Limiting

If you're seeing rate limit errors, try:
- Increasing `minDelay` and `maxDelay`
- Decreasing `maxRequestsPerMinute`
- Using a proxy

### CAPTCHA/Auth Walls

LinkedIn may show CAPTCHA or login prompts for frequent requests. Solutions:
- Reduce request frequency
- Use authenticated sessions (advanced)
- Rotate proxies

## License

MIT
