# Form Auto-Fill Engine

AI-powered automation component for auto-filling job application forms based on scraped job data and user's resume/profile.

## Overview

The Form Auto-Fill Engine is a TypeScript-based service that automates the process of filling out job application forms across multiple job platforms. It uses browser automation (Playwright) combined with LLM-enhanced field mapping to intelligently detect and fill form fields.

## Features

- **Auto-detect application forms and input fields** - Automatically identifies form fields including email, name, phone, experience, education, links, etc.
- **Browser automation with Playwright** - Uses headless browser automation for reliable form interaction
- **LLM-enhanced field mapping** - Semantic understanding of form fields with pattern-based fallback
- **Platform-specific adapters** - Modular adapters for different job portals:
  - LinkedIn Easy Apply (primary)
  - Glassdoor
- **Form-fill reliability scoring** - Confidence metrics for form fill accuracy
- **Pluggable architecture** - Easy to extend with new platform adapters
- **Error handling and retries** - Robust error handling with configurable retry logic
- **Success/failure logging** - Detailed logging for debugging and monitoring

## Installation

```bash
cd services/form-fill-engine
npm install
npm run build
```

## Usage

### Basic Usage

```typescript
import { FormAutoFillEngine } from './src';
import { ScrapedJob, UserProfile } from './src/types';

// Create engine instance
const engine = new FormAutoFillEngine({
  headless: true,
  timeout: 30000,
  maxRetries: 3,
});

// Define user profile
const userProfile: UserProfile = {
  userId: 'user-123',
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+1-555-123-4567',
  linkedInUrl: 'https://linkedin.com/in/johndoe',
  githubUrl: 'https://github.com/johndoe',
  currentTitle: 'Senior Software Engineer',
  yearsOfExperience: 8,
  skills: ['TypeScript', 'React', 'Node.js'],
  summary: 'Experienced software engineer...',
  resumeContent: 'Full resume content here...',
};

// Define job to apply to
const job: ScrapedJob = {
  jobId: 'linkedin-123',
  platform: 'linkedin',
  url: 'https://www.linkedin.com/jobs/view/123456',
  title: 'Senior Software Engineer',
  company: 'Tech Corp',
  description: 'We are looking for...',
};

// Auto-fill the application
const result = await engine.autoFill(job, userProfile, {
  dryRun: true, // Set to false for actual submission
});

console.log('Result:', result);
// {
//   jobId: 'linkedin-123',
//   platform: 'linkedin',
//   success: true,
//   reliability: {
//     overall: 92,
//     fieldsDetected: 10,
//     fieldsFilled: 9,
//     fieldsFailed: 1,
//     confidenceAverage: 0.87,
//     warnings: ['1 field(s) used fallback values']
//   },
//   fieldResults: [...],
//   formSubmitted: false,
//   duration: 5234,
//   timestamp: '2024-01-15T10:30:00.000Z'
// }

// Clean up
await engine.close();
```

### Batch Processing

```typescript
const jobs: ScrapedJob[] = [
  { jobId: '1', platform: 'linkedin', url: '...', ... },
  { jobId: '2', platform: 'glassdoor', url: '...', ... },
];

const results = await engine.autoFillBatch(jobs, userProfile, {
  dryRun: false,
  delayBetweenJobs: 5000, // 5 second delay between applications
});

results.forEach((result) => {
  console.log(`Job ${result.jobId}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
});
```

### Custom Platform Adapter

```typescript
import { BasePlatformAdapter } from './src/adapters';
import { FieldMappingService } from './src/field-mapping/FieldMappingService';

class CustomPlatformAdapter extends BasePlatformAdapter {
  readonly platformName = 'custom-platform';

  async isOnPlatform(page: Page): Promise<boolean> {
    return page.url().includes('custom-platform.com');
  }

  async detectApplicationForm(page: Page): Promise<boolean> {
    // Custom detection logic
    return true;
  }

  async navigateToNextStep(page: Page): Promise<boolean> {
    // Custom navigation logic
    return true;
  }

  async submitApplication(page: Page): Promise<boolean> {
    // Custom submission logic
    return true;
  }

  async isApplicationComplete(page: Page): Promise<boolean> {
    // Custom completion check
    return true;
  }
}

// Register the custom adapter
const fieldMapper = new FieldMappingService();
engine.registerAdapter(new CustomPlatformAdapter(fieldMapper));
```

## Configuration

```typescript
interface FormFillConfig {
  headless: boolean;           // Run browser in headless mode (default: true)
  timeout: number;             // Page timeout in ms (default: 30000)
  maxRetries: number;          // Max retry attempts (default: 3)
  retryDelay: number;          // Delay between retries in ms (default: 2000)
  screenshotOnError: boolean;  // Take screenshot on error (default: true)
  screenshotPath?: string;     // Path for error screenshots
  simulateHumanTyping: boolean; // Type with human-like delays (default: true)
  typingDelay: { min: number; max: number }; // Typing delay range (default: 30-100ms)
  llmServiceUrl?: string;      // URL for LLM field mapping service
}
```

## Supported Field Types

The engine can automatically detect and fill the following field types:

- **Contact Info**: email, firstName, lastName, fullName, phone
- **Links**: linkedIn, github, portfolio, website
- **Professional**: currentTitle, yearsExperience, skills, summary
- **Education**: education entries
- **Work History**: workExperience entries
- **Application**: coverLetter, resume (file upload)
- **Compliance**: workAuthorization, sponsorship
- **Other**: salaryExpectation, startDate, referral, additionalInfo

## Reliability Scoring

Each form fill operation returns a reliability score:

```typescript
interface ReliabilityScore {
  overall: number;        // Overall score 0-100
  fieldsDetected: number; // Number of fields detected
  fieldsFilled: number;   // Number of fields successfully filled
  fieldsFailed: number;   // Number of fields that failed
  confidenceAverage: number; // Average confidence of field mappings
  warnings: string[];     // Any warnings or issues
}
```

A score of 90+ is considered excellent, 70-89 good, below 70 may need review.

## Error Handling

The engine provides graceful degradation when fields can't be mapped:

1. **Pattern Matching**: Uses regex patterns to identify field types
2. **LLM Fallback**: Can use LLM service for semantic field matching
3. **Default Values**: Uses sensible defaults for common questions
4. **Fallback Indicators**: Reports which fields used fallback values

## Integration

The Form Auto-Fill Engine integrates with:

- **Job Scraper Output**: Receives `ScrapedJob` objects from job scraping service
- **Resume Tailoring Service**: Uses tailored resume content from LLM service
- **Agent Orchestrator**: Can be orchestrated as part of the job application pipeline

## Testing

```bash
npm test        # Run unit tests
npm run lint    # Run linter
npm run build   # Build TypeScript
```

## Directory Structure

```
services/form-fill-engine/
├── src/
│   ├── adapters/
│   │   ├── BasePlatformAdapter.ts    # Base adapter class
│   │   ├── LinkedInAdapter.ts        # LinkedIn Easy Apply adapter
│   │   ├── GlassdoorAdapter.ts       # Glassdoor adapter
│   │   └── index.ts
│   ├── field-mapping/
│   │   └── FieldMappingService.ts    # LLM-enhanced field mapping
│   ├── types/
│   │   └── index.ts                  # TypeScript interfaces
│   ├── __tests__/
│   │   ├── FieldMappingService.test.ts
│   │   ├── FormAutoFillEngine.test.ts
│   │   └── adapters.test.ts
│   ├── FormAutoFillEngine.ts         # Main engine class
│   └── index.ts                      # Public exports
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.json
└── README.md
```

## License

MIT
