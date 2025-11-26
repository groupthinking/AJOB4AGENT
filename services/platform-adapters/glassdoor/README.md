# Glassdoor Platform Adapter

A job scraping adapter for Glassdoor that provides comprehensive job search and data extraction capabilities. This adapter extends the `BaseJobScraper` to scrape job listings from Glassdoor, including company ratings, salary estimates, and Easy Apply jobs.

## Features

- 🔍 **Full Job Search** - Search jobs by keywords, location, salary range, and more
- ⭐ **Company Ratings** - Extract Glassdoor company ratings (1-5 stars)
- 💰 **Salary Estimates** - Parse salary ranges with currency detection
- 🚀 **Easy Apply Detection** - Identify jobs with Easy Apply option
- 📄 **Pagination Support** - Navigate through multiple pages of results
- 🛡️ **Anti-Bot Measures** - Built-in throttling and random delays
- 📊 **JSON Export** - Export job data in unified pipeline format

## Installation

```bash
npm install @platform-adapters/glassdoor
# or
yarn add @platform-adapters/glassdoor
```

### Peer Dependencies

Make sure you have Playwright installed:

```bash
npm install playwright
npx playwright install chromium
```

## Quick Start

```typescript
import { GlassdoorJobScraper } from '@platform-adapters/glassdoor';

// Create scraper instance
const scraper = new GlassdoorJobScraper({
  headless: true,
  throttleMs: 3000,
  maxResults: 50
});

// Search for jobs
const jobs = await scraper.search({
  keywords: 'software engineer',
  location: 'New York, NY',
  remote: true,
  companyRating: 4,      // 4+ stars only
  easyApplyOnly: true,
  datePosted: 'week'
});

console.log(`Found ${jobs.length} jobs on Glassdoor`);

// Get detailed info for a specific job
const details = await scraper.getJobDetails(jobs[0].url);
console.log(`Company size: ${details.companySize}`);
console.log(`Industry: ${details.industry}`);

// Export results to JSON
await scraper.exportToJson(jobs, './output/glassdoor-jobs.json');

// Clean up
await scraper.close();
```

## Configuration

### ScraperConfig Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `headless` | boolean | `true` | Run browser in headless mode |
| `throttleMs` | number | `3000` | Minimum delay between requests (ms) |
| `maxResults` | number | `50` | Maximum number of jobs to scrape |
| `timeout` | number | `30000` | Page load timeout (ms) |
| `userAgent` | string | Chrome UA | Custom user agent string |

### Search Filters

| Filter | Type | Description |
|--------|------|-------------|
| `keywords` | string | Job title, skills, or company name |
| `location` | string | City, state, or country |
| `remote` | boolean | Filter for remote jobs |
| `salary.min` | number | Minimum salary |
| `salary.max` | number | Maximum salary |
| `datePosted` | '24h' \| 'week' \| 'month' | How recently the job was posted |
| `companyRating` | number (1-5) | Minimum company rating |
| `companySize` | string | 'small' \| 'medium' \| 'large' \| 'enterprise' |
| `easyApplyOnly` | boolean | Only show Easy Apply jobs |
| `industry` | string | Filter by industry sector |

## API Reference

### GlassdoorJobScraper

#### Constructor

```typescript
const scraper = new GlassdoorJobScraper(config?: GlassdoorScraperConfig)
```

#### Methods

##### `search(filters: GlassdoorSearchFilters): Promise<GlassdoorJob[]>`

Search for jobs with the specified filters.

```typescript
const jobs = await scraper.search({
  keywords: 'developer',
  location: 'San Francisco, CA'
});
```

##### `getJobDetails(jobUrl: string): Promise<GlassdoorJob>`

Get detailed information for a specific job.

```typescript
const details = await scraper.getJobDetails('https://www.glassdoor.com/job-listing/j?jl=123456');
```

##### `searchEasyApplyJobs(filters: GlassdoorSearchFilters): Promise<GlassdoorJob[]>`

Search specifically for Easy Apply jobs.

```typescript
const easyApplyJobs = await scraper.searchEasyApplyJobs({
  keywords: 'engineer'
});
```

##### `searchWithRatingFilter(filters, minRating: number): Promise<GlassdoorJob[]>`

Search with additional client-side rating validation.

```typescript
const highRatedJobs = await scraper.searchWithRatingFilter(
  { keywords: 'engineer' },
  4.0  // Minimum 4-star companies only
);
```

##### `exportToJson(jobs: GlassdoorJob[], filepath: string): Promise<void>`

Export job results to a JSON file.

```typescript
await scraper.exportToJson(jobs, './jobs.json');
```

##### `close(): Promise<void>`

Clean up browser resources.

```typescript
await scraper.close();
```

### GlassdoorJob Interface

```typescript
interface GlassdoorJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description?: string;
  url: string;
  postingDate?: string;
  tags: string[];
  source: 'glassdoor';
  scrapedAt: string;
  
  // Glassdoor-specific fields
  companyRating?: number;        // 1-5 stars
  salaryEstimate?: {
    min: number;
    max: number;
    currency: string;
  };
  reviewCount?: number;
  easyApply: boolean;
  companySize?: string;
  industry?: string;
  headquarters?: string;
  benefits?: string[];
  skills?: string[];
  employmentType?: string;
}
```

## Utility Functions

### URL Builder

```typescript
import { buildGlassdoorSearchUrl, buildJobDetailUrl } from '@platform-adapters/glassdoor';

const searchUrl = buildGlassdoorSearchUrl({
  keywords: 'engineer',
  location: 'NYC',
  remote: true
});

const detailUrl = buildJobDetailUrl('123456');
```

### Rating Parser

```typescript
import { parseRating, parseReviewCount, formatRating } from '@platform-adapters/glassdoor';

const rating = parseRating('4.5 ★');        // 4.5
const count = parseReviewCount('12.3K');     // 12300
const display = formatRating(4.5);           // "4.5 ★"
```

## Docker Deployment

Build the Docker image:

```bash
docker build -t glassdoor-adapter .
```

Run the container:

```bash
docker run -e HEADLESS=true \
           -e THROTTLE_MS=3000 \
           -e MAX_RESULTS=50 \
           glassdoor-adapter
```

## Testing

Run unit tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Integration with JobSearchOrchestrator

This adapter integrates with the AJOB4AGENT platform's `JobSearchOrchestrator`:

```typescript
import { JobSearchOrchestrator } from '../agent-orchestrator';
import { GlassdoorJobScraper } from '../platform-adapters/glassdoor';

const orchestrator = new JobSearchOrchestrator();

// Register the Glassdoor adapter
orchestrator.registerAdapter('glassdoor', new GlassdoorJobScraper({
  headless: true,
  throttleMs: 3000
}));

// Search across multiple platforms
const jobs = await orchestrator.searchAllPlatforms({
  keywords: 'software engineer',
  location: 'New York',
  platforms: ['linkedin', 'glassdoor']
});
```

## Best Practices

1. **Rate Limiting**: Use appropriate `throttleMs` values (3000ms+) to avoid detection
2. **Headless Mode**: Keep `headless: true` in production for better performance
3. **Error Handling**: Always wrap searches in try-catch blocks
4. **Resource Cleanup**: Call `close()` when done to free browser resources
5. **Result Validation**: Verify scraped data before processing

## Troubleshooting

### Common Issues

1. **No jobs found**: Glassdoor may have changed their HTML structure. Check for selector updates.

2. **Rate limiting**: Increase `throttleMs` or add more random delays.

3. **Login prompts**: The scraper attempts to dismiss modals, but you may need to handle authentication for some searches.

4. **Timeout errors**: Increase the `timeout` config option for slow connections.

## License

MIT
