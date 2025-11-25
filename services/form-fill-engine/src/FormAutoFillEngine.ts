import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';
import {
  FormFillConfig,
  FormFillResult,
  ReliabilityScore,
  FieldFillResult,
  ScrapedJob,
  UserProfile,
  IPlatformAdapter,
  DetectedField,
  FormFillLogger,
} from './types';
import { FieldMappingService } from './field-mapping/FieldMappingService';
import { LinkedInAdapter } from './adapters/LinkedInAdapter';
import { GlassdoorAdapter } from './adapters/GlassdoorAdapter';

/**
 * Default configuration for the form fill engine
 */
const DEFAULT_CONFIG: FormFillConfig = {
  headless: true,
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 2000,
  screenshotOnError: true,
  simulateHumanTyping: true,
  typingDelay: { min: 30, max: 100 },
};

/**
 * Main Form Auto-Fill Engine class
 * Provides AI-powered automation for filling job application forms
 */
export class FormAutoFillEngine {
  private config: FormFillConfig;
  private fieldMapper: FieldMappingService;
  private adapters: Map<string, IPlatformAdapter>;
  private logger: FormFillLogger;
  private browser: Browser | null = null;

  constructor(config: Partial<FormFillConfig> = {}, logger?: FormFillLogger) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = logger || console;
    this.fieldMapper = new FieldMappingService(this.config.llmServiceUrl, this.logger);
    this.adapters = new Map();

    // Register default adapters
    this.registerAdapter(new LinkedInAdapter(this.fieldMapper, this.logger));
    this.registerAdapter(new GlassdoorAdapter(this.fieldMapper, this.logger));
  }

  /**
   * Register a platform adapter
   */
  registerAdapter(adapter: IPlatformAdapter): void {
    this.adapters.set(adapter.platformName, adapter);
    this.logger.info(`Registered adapter: ${adapter.platformName}`);
  }

  /**
   * Get an adapter by platform name
   */
  getAdapter(platform: string): IPlatformAdapter | undefined {
    return this.adapters.get(platform.toLowerCase());
  }

  /**
   * Initialize the browser
   */
  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
        ],
      });
      this.logger.info('Browser initialized');
    }
  }

  /**
   * Close the browser and cleanup
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.info('Browser closed');
    }
  }

  /**
   * Create a new browser context with proper settings
   */
  private async createContext(): Promise<BrowserContext> {
    if (!this.browser) {
      await this.initialize();
    }
    
    return this.browser!.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'en-US',
    });
  }

  /**
   * Main method to auto-fill a job application
   */
  async autoFill(
    job: ScrapedJob,
    userProfile: UserProfile,
    options: { dryRun?: boolean; credentials?: { email: string; password: string } } = {}
  ): Promise<FormFillResult> {
    const startTime = Date.now();
    const fieldResults: FieldFillResult[] = [];
    let context: BrowserContext | null = null;
    let page: Page | null = null;
    let tempResumePath: string | null = null;

    try {
      this.logger.info('Starting form auto-fill', {
        jobId: job.jobId,
        platform: job.platform,
        url: job.url,
      });

      // Get the appropriate adapter
      const adapter = this.getAdapter(job.platform);
      if (!adapter) {
        throw new Error(`No adapter available for platform: ${job.platform}`);
      }

      // Create temporary resume file if needed
      if (userProfile.resumeContent) {
        tempResumePath = await this.createTempResumeFile(job.jobId, userProfile.resumeContent);
      }

      // Initialize browser context and page
      context = await this.createContext();
      page = await context.newPage();
      page.setDefaultTimeout(this.config.timeout);

      // Navigate to job URL
      await page.goto(job.url, { waitUntil: 'networkidle' });
      await adapter.handlePopups(page);

      // Verify we're on the correct platform
      if (!(await adapter.isOnPlatform(page))) {
        throw new Error(`Not on expected platform: ${job.platform}`);
      }

      // Open application form if needed
      if (adapter.platformName === 'linkedin') {
        const linkedInAdapter = adapter as LinkedInAdapter;
        if (!(await linkedInAdapter.openEasyApply(page))) {
          throw new Error('Failed to open Easy Apply modal');
        }
      } else if (adapter.platformName === 'glassdoor') {
        const glassdoorAdapter = adapter as GlassdoorAdapter;
        if (!(await glassdoorAdapter.openApplication(page))) {
          throw new Error('Failed to open Glassdoor application modal');
        }
      }

      // Process each step of the application
      let stepCount = 0;
      const maxSteps = 10; // Safety limit

      while (stepCount < maxSteps) {
        stepCount++;
        this.logger.info(`Processing application step ${stepCount}`);

        // Detect fields on current page
        const fields = await adapter.detectFields(page);
        this.logger.info(`Detected ${fields.length} fields in step ${stepCount}`);

        // Fill each detected field
        for (const field of fields) {
          const result = await this.fillField(page, adapter, field, userProfile, job, tempResumePath);
          fieldResults.push(result);
        }

        // Wait for any dynamic content to load
        await page.waitForTimeout(1000);

        // Check if we can submit
        if (await adapter.isApplicationComplete(page)) {
          this.logger.info('Application appears complete');
          break;
        }

        // Try to navigate to next step
        const hasNextStep = await adapter.navigateToNextStep(page);
        if (!hasNextStep) {
          // Check if we can submit
          if (options.dryRun) {
            this.logger.info('Dry run - skipping submission');
            break;
          }

          const submitted = await adapter.submitApplication(page);
          if (submitted) {
            this.logger.info('Application submitted');
          }
          break;
        }
      }

      // Calculate reliability score
      const reliability = this.calculateReliability(fieldResults);

      return {
        jobId: job.jobId,
        platform: job.platform,
        success: true,
        reliability,
        fieldResults,
        formSubmitted: !options.dryRun,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Form auto-fill failed', {
        jobId: job.jobId,
        error: errorMessage,
      });

      // Take screenshot on error if enabled
      if (this.config.screenshotOnError && page) {
        await this.takeErrorScreenshot(page, job.jobId);
      }

      const reliability = this.calculateReliability(fieldResults);

      return {
        jobId: job.jobId,
        platform: job.platform,
        success: false,
        reliability,
        fieldResults,
        formSubmitted: false,
        error: errorMessage,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } finally {
      // Cleanup
      if (tempResumePath) {
        await this.cleanupTempFile(tempResumePath);
      }
      if (context) {
        await context.close();
      }
    }
  }

  /**
   * Fill a single field
   */
  private async fillField(
    page: Page,
    adapter: IPlatformAdapter,
    field: DetectedField,
    userProfile: UserProfile,
    job: ScrapedJob,
    resumePath: string | null
  ): Promise<FieldFillResult> {
    try {
      // Handle file upload separately
      if (field.inputType === 'file' && field.fieldType === 'resume' && resumePath) {
        const success = await adapter.uploadResume(page, resumePath);
        return {
          field,
          success,
          valueFilled: success ? 'Resume uploaded' : undefined,
          fallbackUsed: false,
        };
      }

      // Get value from field mapper
      const mappingResponse = await this.fieldMapper.mapFieldWithLLM({
        detectedField: {
          label: field.label,
          placeholder: field.placeholder,
          name: field.name,
          id: field.id,
          ariaLabel: field.ariaLabel,
          inputType: field.inputType,
          options: field.options,
        },
        userProfile,
        jobContext: {
          title: job.title,
          company: job.company,
          description: job.description,
        },
      });

      // Skip if no value and field is not required
      if (!mappingResponse.suggestedValue && !field.required) {
        return {
          field,
          success: true,
          valueFilled: undefined,
          fallbackUsed: false,
        };
      }

      // Use fallback for required fields with no value
      const fallbackValue = this.getFallbackValue(field);
      const valueToFill = mappingResponse.suggestedValue || fallbackValue;

      if (!valueToFill) {
        return {
          field,
          success: false,
          error: 'No value available for required field',
          fallbackUsed: false,
        };
      }

      // Fill the field
      const success = await adapter.fillField(page, field, valueToFill);

      return {
        field,
        success,
        valueFilled: success ? valueToFill : undefined,
        fallbackUsed: !mappingResponse.suggestedValue && !!fallbackValue,
        error: success ? undefined : 'Failed to fill field',
      };
    } catch (error) {
      return {
        field,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        fallbackUsed: false,
      };
    }
  }

  /**
   * Get fallback value for unknown fields
   */
  private getFallbackValue(field: DetectedField): string | undefined {
    // For select fields, try to select a reasonable default
    if (field.inputType === 'select' && field.options && field.options.length > 0) {
      // Try to find common positive answers
      const positiveOptions = field.options.filter((opt) =>
        /^(yes|agree|accept|true)/i.test(opt.trim())
      );
      if (positiveOptions.length > 0) {
        return positiveOptions[0];
      }
      // Return first non-empty option
      return field.options.find((opt) => opt.trim().length > 0);
    }

    // For radio/checkbox with yes/no pattern
    if (field.inputType === 'radio' || field.inputType === 'checkbox') {
      const boolResult = this.fieldMapper.detectBooleanFieldValue(field.label, field.placeholder);
      if (boolResult.value) {
        return boolResult.value;
      }
    }

    // For text fields, provide generic fallback
    if (field.fieldType === 'additionalInfo' || field.fieldType === 'unknown') {
      return 'N/A';
    }

    return undefined;
  }

  /**
   * Calculate reliability score from field results
   */
  private calculateReliability(fieldResults: FieldFillResult[]): ReliabilityScore {
    const totalFields = fieldResults.length;
    const successfulFills = fieldResults.filter((r) => r.success).length;
    const failedFills = fieldResults.filter((r) => !r.success).length;
    const warnings: string[] = [];

    // Calculate average confidence
    const confidenceSum = fieldResults.reduce(
      (sum, r) => sum + r.field.confidenceScore,
      0
    );
    const confidenceAverage = totalFields > 0 ? confidenceSum / totalFields : 0;

    // Calculate overall score
    let overall = 0;
    if (totalFields > 0) {
      const successRate = successfulFills / totalFields;
      overall = Math.round(successRate * 100 * confidenceAverage);
    }

    // Add warnings
    const fallbackCount = fieldResults.filter((r) => r.fallbackUsed).length;
    if (fallbackCount > 0) {
      warnings.push(`${fallbackCount} field(s) used fallback values`);
    }

    const lowConfidenceFields = fieldResults.filter(
      (r) => r.field.confidenceScore < 0.6
    );
    if (lowConfidenceFields.length > 0) {
      warnings.push(`${lowConfidenceFields.length} field(s) have low confidence mapping`);
    }

    if (failedFills > 0) {
      warnings.push(`${failedFills} field(s) failed to fill`);
    }

    return {
      overall,
      fieldsDetected: totalFields,
      fieldsFilled: successfulFills,
      fieldsFailed: failedFills,
      confidenceAverage: Math.round(confidenceAverage * 100) / 100,
      warnings,
    };
  }

  /**
   * Create a temporary resume file
   */
  private async createTempResumeFile(jobId: string, content: string): Promise<string> {
    const filename = `resume_${jobId}_${Date.now()}.txt`;
    const filepath = path.join(tmpdir(), filename);
    await fs.writeFile(filepath, content, 'utf-8');
    return filepath;
  }

  /**
   * Clean up temporary file
   */
  private async cleanupTempFile(filepath: string): Promise<void> {
    try {
      await fs.unlink(filepath);
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Take screenshot on error
   */
  private async takeErrorScreenshot(page: Page, jobId: string): Promise<void> {
    try {
      const screenshotDir = this.config.screenshotPath || tmpdir();
      const filename = `error_${jobId}_${Date.now()}.png`;
      const filepath = path.join(screenshotDir, filename);
      await page.screenshot({ path: filepath, fullPage: true });
      this.logger.info(`Error screenshot saved: ${filepath}`);
    } catch (error) {
      this.logger.warn('Failed to take error screenshot', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Batch process multiple job applications
   */
  async autoFillBatch(
    jobs: ScrapedJob[],
    userProfile: UserProfile,
    options: { dryRun?: boolean; delayBetweenJobs?: number } = {}
  ): Promise<FormFillResult[]> {
    const results: FormFillResult[] = [];
    const delayMs = options.delayBetweenJobs || 5000;

    await this.initialize();

    try {
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        this.logger.info(`Processing job ${i + 1}/${jobs.length}: ${job.title} at ${job.company}`);

        const result = await this.autoFill(job, userProfile, options);
        results.push(result);

        // Log result
        if (result.success) {
          this.logger.info(`Successfully processed job ${job.jobId}`, {
            reliability: result.reliability.overall,
          });
        } else {
          this.logger.warn(`Failed to process job ${job.jobId}`, {
            error: result.error,
          });
        }

        // Delay between jobs to avoid rate limiting
        if (i < jobs.length - 1) {
          this.logger.info(`Waiting ${delayMs}ms before next job...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    } finally {
      await this.close();
    }

    return results;
  }

  /**
   * Get supported platforms
   */
  getSupportedPlatforms(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check if a platform is supported
   */
  isPlatformSupported(platform: string): boolean {
    return this.adapters.has(platform.toLowerCase());
  }
}
