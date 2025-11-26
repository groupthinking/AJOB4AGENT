# Form Fill Engine

AI-powered automation component to auto-fill job application forms based on scraped job data and user's resume/profile.

## Overview

The Form Fill Engine is a core component of the AJOB4AGENT system that completes the automation loop: **Scrape Jobs → Tailor Resume → Auto-Apply**. It uses browser automation (Playwright) and LLM-enhanced field mapping to intelligently fill job application forms across multiple platforms.

## Features

- **Auto-detection** of application forms and input fields (email, name, phone, experience, education, links, etc.)
- **Browser automation** using Playwright for reliable form interaction
- **LLM-enhanced field mapping** for semantic matching when exact patterns don't match
- **Multi-platform support** with pluggable adapters (LinkedIn Easy Apply, Glassdoor)
- **Form-fill reliability scoring** to track success rates
- **Dry-run mode** for testing without actual submission
- **Screenshot capture** on completion and errors
- **Comprehensive error handling** with retry logic
- **Batch application** support for applying to multiple jobs

## Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Build the project
npm run build
```

## Quick Start

```typescript
import { 
  FormAutoFillEngine, 
  LinkedInEasyApplyAdapter,
  GlassdoorApplyAdapter,
  UserProfile 
} from 'form-fill-engine';

// Create the engine
const engine = new FormAutoFillEngine({
  headless: true,
  timeout: 30000,
  retryAttempts: 3,
  screenshotOnComplete: true,
  dryRun: false,
  llmServiceUrl: 'http://localhost:8002'
});

// Register platform adapters
engine.registerAdapter('linkedin', new LinkedInEasyApplyAdapter());
engine.registerAdapter('glassdoor', new GlassdoorApplyAdapter());

// Define user profile
const profile: UserProfile = {
  personalInfo: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@email.com',
    phone: '+1-555-123-4567',
    location: 'San Francisco, CA',
    linkedInUrl: 'https://linkedin.com/in/johndoe',
    portfolioUrl: 'https://johndoe.dev'
  },
  resume: {
    summary: 'Senior Software Engineer with 10+ years experience...',
    experience: [
      {
        company: 'TechCorp',
        title: 'Senior Software Engineer',
        startDate: '2020-01',
        current: true,
        description: 'Leading cloud-native development initiatives'
      }
    ],
    education: [
      {
        institution: 'Stanford University',
        degree: 'Master of Science',
        field: 'Computer Science',
        endDate: '2015'
      }
    ],
    skills: ['TypeScript', 'Python', 'AWS', 'React', 'Node.js']
  },
  preferences: {
    salaryExpectation: '$150,000',
    workAuthorization: 'US Citizen',
    requiresSponsorship: false
  }
};

// Apply to a job
const result = await engine.applyToJob(
  'https://www.linkedin.com/jobs/view/123456',
  profile
);

console.log(`Application ${result.status}: ${result.fieldsCompleted}/${result.fieldsCompleted + result.fieldsFailed} fields`);
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BROWSER_HEADLESS` | Run browser in headless mode | `true` |
| `BROWSER_TIMEOUT` | Page load timeout in ms | `30000` |
| `RETRY_ATTEMPTS` | Number of retry attempts | `3` |
| `RETRY_DELAY` | Initial retry delay in ms | `1000` |
| `LLM_SERVICE_URL` | URL to LLM service for semantic matching | `http://localhost:8002` |
| `DRY_RUN` | Fill forms but don't submit | `false` |
| `SCREENSHOT_ON_COMPLETE` | Take screenshot after application | `true` |
| `SCREENSHOT_ON_ERROR` | Take screenshot on errors | `true` |
| `MAX_CONCURRENT` | Max concurrent applications | `1` |
| `DEBUG` | Enable debug logging | `false` |
| `VIEWPORT_WIDTH` | Browser viewport width | `1280` |
| `VIEWPORT_HEIGHT` | Browser viewport height | `720` |

### Configuration Object

```typescript
interface FormFillConfig {
  headless: boolean;          // Run browser headlessly
  timeout: number;            // Page timeout in ms
  retryAttempts: number;      // Max retry attempts
  retryDelay: number;         // Initial retry delay
  screenshotOnComplete: boolean;
  screenshotOnError: boolean;
  dryRun: boolean;            // Don't actually submit
  llmServiceUrl: string;      // LLM service endpoint
  maxConcurrent: number;      // Concurrent applications
  userAgent?: string;         // Custom user agent
  viewport?: { width: number; height: number };
  slowMo?: number;            // Slow down actions (for debugging)
  debug?: boolean;
}
```

## API Reference

### FormAutoFillEngine

Main engine class for job application automation.

#### Methods

| Method | Description |
|--------|-------------|
| `registerAdapter(platform, adapter)` | Register a platform-specific adapter |
| `applyToJob(jobUrl, profile)` | Apply to a single job |
| `batchApply(jobs, profile)` | Apply to multiple jobs |
| `getHistory()` | Get application history |
| `clearHistory()` | Clear application history |
| `exportResults(format)` | Export results as JSON or CSV |
| `getReliabilityScore()` | Get overall success rate |
| `getFieldMappingStats()` | Get field mapping statistics |
| `setFallbackValues(fallbacks)` | Set fallback values for unmapped fields |
| `setLLMEnabled(enabled)` | Enable/disable LLM matching |

### BaseFormAdapter

Abstract base class for platform-specific adapters.

#### Methods to Implement

| Method | Description |
|--------|-------------|
| `isApplyPage(url)` | Check if URL belongs to this platform |
| `detectForm(page)` | Detect form fields on the page |
| `fillField(page, field, value)` | Fill a single field |
| `submitForm(page)` | Submit the application |

### Included Adapters

- **LinkedInEasyApplyAdapter**: Handles LinkedIn Easy Apply flow
- **GlassdoorApplyAdapter**: Handles Glassdoor job applications

## Creating Custom Adapters

```typescript
import { BaseFormAdapter } from 'form-fill-engine';
import { Page } from 'playwright';

class CustomPlatformAdapter extends BaseFormAdapter {
  readonly platform = 'custom';
  
  readonly capabilities = {
    supportsMultiStep: true,
    supportsFileUpload: true,
    supportsScreenshot: true,
    requiresLogin: true,
    platformName: 'Custom Platform',
    platformUrl: 'https://custom.com'
  };

  isApplyPage(url: string): boolean {
    return url.includes('custom.com/apply');
  }

  async detectForm(page: Page): Promise<FormField[]> {
    // Implement field detection
  }

  async fillField(page: Page, field: FormField, value: string): Promise<boolean> {
    // Implement field filling
  }

  async submitForm(page: Page): Promise<boolean> {
    // Implement form submission
  }
}

// Register the adapter
engine.registerAdapter('custom', new CustomPlatformAdapter());
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/engine.test.ts
```

## Project Structure

```
/services/form-fill-engine/
├── src/
│   ├── index.ts                      # Main export
│   ├── FormAutoFillEngine.ts         # Core engine class
│   ├── types.ts                      # TypeScript interfaces
│   ├── config.ts                     # Configuration
│   ├── adapters/
│   │   ├── BaseFormAdapter.ts        # Abstract base adapter
│   │   ├── LinkedInEasyApplyAdapter.ts
│   │   └── GlassdoorApplyAdapter.ts
│   ├── services/
│   │   ├── FieldDetector.ts          # Form field detection
│   │   ├── FieldMapper.ts            # Profile to field mapping
│   │   ├── LLMFieldMatcher.ts        # LLM-powered matching
│   │   └── FormSubmitter.ts          # Form submission
│   └── utils/
│       ├── browser.ts                # Playwright utilities
│       ├── retry.ts                  # Retry logic
│       └── logger.ts                 # Logging
├── tests/
│   ├── engine.test.ts
│   ├── fieldMapper.test.ts
│   ├── utils.test.ts
│   ├── config.test.ts
│   └── fixtures/
│       ├── linkedin-easy-apply.html
│       └── glassdoor-apply.html
├── package.json
├── tsconfig.json
├── jest.config.js
├── Dockerfile
└── README.md
```

## LLM Integration

The Form Fill Engine integrates with an LLM service for semantic field matching. When exact pattern matching fails, the LLM analyzes field labels and user profile data to determine the best value to fill.

Expected LLM service endpoints:
- `POST /match-field` - Match a single field
- `POST /batch-match-fields` - Match multiple fields
- `POST /generate-response` - Generate a response for open-ended fields
- `GET /health` - Health check

## Error Handling

The engine provides comprehensive error handling:

- **FormFillError**: Base error class
- **FieldDetectionError**: Form field detection failed
- **FieldMappingError**: Unable to map profile data to field
- **FormSubmissionError**: Form submission failed
- **LLMServiceError**: LLM service unavailable
- **AdapterNotFoundError**: No adapter for the platform

All errors include:
- Error code for programmatic handling
- Associated field (if applicable)
- Recovery suggestion

## Best Practices

1. **Always use dry-run mode first** to test your configuration
2. **Set appropriate timeouts** for slow-loading pages
3. **Use fallback values** for commonly unmapped fields
4. **Monitor reliability scores** to identify problematic platforms
5. **Enable screenshots** for debugging failed applications
6. **Rate limit applications** to avoid platform detection

## License

MIT
