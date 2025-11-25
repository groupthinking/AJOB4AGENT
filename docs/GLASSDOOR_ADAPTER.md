# Glassdoor Adapter Usage Guide

## Overview

The Glassdoor adapter is a job scraper that integrates with the AJOB4AGENT platform to search for jobs from Glassdoor. It mirrors the structure of the LinkedIn adapter and exports job data to the unified job pipeline JSON format.

## Features

- **Job Search**: Search for jobs by title, location, experience level, and more
- **Rate Limiting**: Built-in rate limiting to avoid detection (2.5s between requests, 20 requests per minute)
- **Company Insights**: Get company ratings, reviews, and other employer information
- **Salary Insights**: Access salary data for job titles and locations
- **Authenticated & Public Modes**: Works with or without authentication

## Installation

The Glassdoor adapter is included in the `agent-orchestrator` service. No additional installation is required.

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GLASSDOOR_ACCESS_TOKEN` | OAuth access token for authenticated API access | Optional |

### Example Configuration

```bash
# .env file
GLASSDOOR_ACCESS_TOKEN=your-access-token-here
```

## Usage

### Basic Usage

```typescript
import { GlassdoorAdapter } from './adapters/glassdoor-adapter';
import { JobSearchParams } from './types/job-search';

const adapter = new GlassdoorAdapter();

const params: JobSearchParams = {
  searchTerm: 'Software Engineer',
  location: 'San Francisco, CA',
  platforms: ['glassdoor']
};

const response = await adapter.searchJobs(params);
console.log(`Found ${response.jobs.length} jobs`);
```

### Authenticated Usage

```typescript
const adapter = new GlassdoorAdapter('your-access-token');

const response = await adapter.searchJobs({
  searchTerm: 'Data Scientist',
  location: 'New York, NY',
  platforms: ['glassdoor'],
  experienceLevel: 'senior',
  remoteOnly: true
});
```

### Using with Platform Manager

```typescript
import { PlatformManager } from './adapters/platform-manager';

const manager = new PlatformManager();
await manager.initialize();

// Search using the dedicated Glassdoor adapter
const response = await manager.searchPlatform('glassdoor-direct', {
  searchTerm: 'Frontend Developer',
  location: 'Austin, TX',
  platforms: ['glassdoor-direct']
});
```

## API Reference

### `searchJobs(params: JobSearchParams): Promise<JobSearchResponse>`

Search for jobs on Glassdoor.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `searchTerm` | `string` | Job title or keywords to search for |
| `location` | `string` | Location filter (city, state, or country) |
| `platforms` | `string[]` | Should include `'glassdoor'` or `'glassdoor-direct'` |
| `experienceLevel` | `'entry' \| 'mid' \| 'senior'` | Experience level filter (optional) |
| `remoteOnly` | `boolean` | Filter for remote jobs only (optional) |
| `salaryMin` | `number` | Minimum salary filter (optional) |
| `datePosted` | `'today' \| 'week' \| 'month'` | Posted date filter (optional) |

#### Response

```typescript
interface JobSearchResponse {
  jobs: JobResult[];
  totalCount: number;
  platform: 'glassdoor';
  searchParams: JobSearchParams;
  timestamp: string;
}
```

### `getCompanyInsights(companyName: string): Promise<object | null>`

Get company information and ratings.

```typescript
const insights = await adapter.getCompanyInsights('Google');
// Returns: { name, rating, reviewCount, recommendToFriend, ceoApproval, ... }
```

### `getSalaryInsights(jobTitle: string, location?: string): Promise<object | null>`

Get salary data for a job title.

```typescript
const salary = await adapter.getSalaryInsights('Software Engineer', 'San Francisco');
// Returns: { title, location, basePay, totalPay, additionalPay, sampleSize }
```

### `getRateLimitStatus(): object`

Check the current rate limit status.

```typescript
const status = adapter.getRateLimitStatus();
// Returns: { requestCount, windowReset, canMakeRequest }
```

## Job Result Format

Each job in the response follows the unified job pipeline format:

```typescript
interface JobResult {
  id: string;              // Unique job identifier
  title: string;           // Job title
  company: string;         // Company name
  location: string;        // Job location
  description: string;     // Job description (truncated to 500 chars)
  salary?: string;         // Salary range (e.g., "$120,000 - $180,000")
  url: string;             // Link to job posting
  platform: 'glassdoor';   // Source platform
  datePosted: string;      // ISO 8601 date string
  experienceLevel?: string; // 'entry' | 'mid' | 'senior'
  remote?: boolean;        // Whether the job is remote
  metadata?: {             // Additional Glassdoor-specific data
    companyRating?: number;
    industry?: string;
    benefits?: string[];
    jobType?: string;
  };
}
```

## Extensibility

The Glassdoor adapter is designed to be easily extensible for other job boards. To create a new adapter:

1. Copy the structure of `glassdoor-adapter.ts`
2. Update the base URLs and API endpoints
3. Modify the transformation methods to match the new platform's data format
4. Add the adapter to `platform-manager.ts`
5. Create unit tests following the pattern in `glassdoor-adapter.test.ts`

## Testing

Run the Glassdoor adapter tests:

```bash
cd services/agent-orchestrator
npm run test -- --testPathPattern=glassdoor-adapter
```

## Rate Limiting

The adapter implements conservative rate limiting to avoid detection:

- Minimum 2.5 seconds between requests
- Maximum 20 requests per minute window
- Automatic waiting when limits are reached

## Error Handling

The adapter gracefully handles errors:

- API failures fall back to mock data for development/testing
- Network errors are logged and return empty results
- Invalid responses are caught and handled

## License

MIT
