# LinkedIn Job Scraper Adapter

A robust LinkedIn job scraper using Playwright for browser automation. Part of the AJOB4AGENT unified job pipeline.

## Features

- 🔍 **Search with Filters**: Keywords, location, remote/on-site, seniority, date posted
- 🛡️ **Stealth Mode**: Anti-detection measures with realistic browser fingerprinting
- ⏱️ **Rate Limiting**: Configurable throttling to respect LinkedIn's rate limits
- 📄 **Pagination**: Automatic handling of multiple result pages
- 🔄 **Retry Logic**: Built-in retry mechanism for failed requests
- 📊 **Unified Format**: Exports to standardized JSON for pipeline processing
- 🐳 **Docker Ready**: Production-ready Dockerfile included

## Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

## Quick Start

```typescript
import { LinkedInJobScraper } from '@ajob4agent/linkedin-adapter';

async function main() {
  // Create scraper instance
  const scraper = new LinkedInJobScraper({
    headless: true,        // Run in headless mode
    throttleMs: 3000,      // Wait 3s between requests
    maxResults: 50,        // Maximum jobs to scrape
  });

  try {
    // Search for jobs
    const jobs = await scraper.search({
      keywords: 'software engineer',
      location: 'San Francisco, CA',
      remote: true,
      seniority: 'senior',
      datePosted: 'week',
    });

    console.log(`Found ${jobs.length} jobs`);

    // Export to JSON
    await scraper.exportToJson(jobs, './output/linkedin-jobs.json');
  } finally {
    // Clean up
    await scraper.close();
  }
}

main();
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `headless` | boolean | `true` | Run browser in headless mode |
| `throttleMs` | number | `3000` | Minimum delay between requests (ms) |
| `maxResults` | number | `50` | Maximum number of jobs to scrape |
| `timeout` | number | `30000` | Page navigation timeout (ms) |
| `userAgent` | string | Chrome UA | Custom user agent string |
| `cookies` | Array | `[]` | Session cookies for authenticated scraping |
| `proxy` | object | - | Proxy server configuration |

## Search Filters

| Filter | Type | Options | Description |
|--------|------|---------|-------------|
| `keywords` | string | - | Job search keywords |
| `location` | string | - | Job location |
| `remote` | boolean | - | Filter for remote jobs only |
| `seniority` | string | `entry`, `mid`, `senior`, `director`, `executive` | Experience level |
| `datePosted` | string | `24h`, `week`, `month` | Time since posting |
| `salary` | object | `{ min, max }` | Salary range filter |

## Output Format

Jobs are exported in the unified pipeline format:

```json
{
  "jobs": [
    {
      "id": "linkedin-123456789",
      "title": "Software Engineer",
      "company": "Tech Corp",
      "location": "San Francisco, CA",
      "salary": "$120,000 - $180,000/yr",
      "postingDate": "2024-01-15T00:00:00.000Z",
      "url": "https://www.linkedin.com/jobs/view/123456789",
      "description": "We are looking for...",
      "tags": ["TypeScript", "React", "AWS"],
      "source": "linkedin",
      "scrapedAt": "2024-01-17T12:00:00.000Z"
    }
  ],
  "metadata": {
    "exportedAt": "2024-01-17T12:00:00.000Z",
    "totalCount": 1,
    "source": "linkedin"
  }
}
```

## Docker Usage

### Build the image

```bash
docker build -t linkedin-scraper .
```

### Run the container

```bash
docker run -v $(pwd)/output:/app/output linkedin-scraper
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HEADLESS` | `true` | Run in headless mode |
| `THROTTLE_MS` | `3000` | Throttle delay in milliseconds |
| `MAX_RESULTS` | `50` | Maximum results to scrape |

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Build for production
npm run build
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test -- tests/scraper.test.ts
```

## Extending for Other Platforms

This adapter extends the `BaseJobScraper` abstract class. To create a new platform adapter:

```typescript
import { BaseJobScraper } from '../base/BaseJobScraper';
import { Job, SearchFilters } from '../types/job';

export class MyPlatformScraper extends BaseJobScraper {
  async initialize(): Promise<void> {
    // Setup browser, connect to platform
  }

  async close(): Promise<void> {
    // Clean up resources
  }

  async search(filters: SearchFilters): Promise<Job[]> {
    // Implement search logic
  }

  async getJobDetails(jobId: string): Promise<Job | null> {
    // Get individual job details
  }

  getSourceName(): Job['source'] {
    return 'myplatform';
  }
}
```

## Ethical Scraping Guidelines

⚠️ **Important**: This tool is designed for ethical use only.

- Respect LinkedIn's Terms of Service
- Use reasonable throttle delays (minimum 2-3 seconds)
- Don't overload LinkedIn's servers
- Only scrape publicly available job listings
- Don't use for commercial purposes without proper authorization
- Consider using LinkedIn's official APIs when available

## License

MIT

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting a PR.
