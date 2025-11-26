/**
 * Form Auto-Fill Engine
 * Core engine class for automating job application form filling
 */

import { Page } from 'playwright';
import {
  FormFillConfig,
  UserProfile,
  ApplicationResult,
  BatchApplicationResult,
  Job,
  FieldMapping,
  FormField,
  AdapterNotFoundError,
  DEFAULT_CONFIG
} from './types';
import { BaseFormAdapter } from './adapters/BaseFormAdapter';
import { FieldMapper } from './services/FieldMapper';
import { LLMFieldMatcher } from './services/LLMFieldMatcher';
import { FormSubmitter } from './services/FormSubmitter';
import { launchBrowser, closeBrowser, takeScreenshot, navigateTo, BrowserInstance } from './utils/browser';
import { withRetry } from './utils/retry';
import { createComponentLogger } from './utils/logger';

const logger = createComponentLogger('form-auto-fill-engine');

export class FormAutoFillEngine {
  private config: FormFillConfig;
  private adapters: Map<string, BaseFormAdapter> = new Map();
  private history: ApplicationResult[] = [];
  private fieldMapper: FieldMapper;
  private llmMatcher: LLMFieldMatcher;

  constructor(config: Partial<FormFillConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.fieldMapper = new FieldMapper();
    this.llmMatcher = new LLMFieldMatcher(this.config.llmServiceUrl, this.config.timeout);

    logger.info('FormAutoFillEngine initialized', {
      headless: this.config.headless,
      dryRun: this.config.dryRun,
      llmServiceUrl: this.config.llmServiceUrl
    });
  }

  /**
   * Register a platform-specific adapter
   */
  registerAdapter(platform: string, adapter: BaseFormAdapter): void {
    this.adapters.set(platform.toLowerCase(), adapter);
    logger.info('Adapter registered', { platform });
  }

  /**
   * Get a registered adapter by platform name
   */
  getAdapter(platform: string): BaseFormAdapter | undefined {
    return this.adapters.get(platform.toLowerCase());
  }

  /**
   * Detect which platform a URL belongs to
   */
  detectPlatform(url: string): string | null {
    for (const [platform, adapter] of this.adapters) {
      if (adapter.isApplyPage(url)) {
        return platform;
      }
    }
    return null;
  }

  /**
   * Apply to a job using the appropriate adapter
   */
  async applyToJob(jobUrl: string, profile: UserProfile): Promise<ApplicationResult> {
    const startTime = Date.now();
    const jobId = this.extractJobId(jobUrl);

    logger.info('Starting job application', { jobId, jobUrl });

    let browserInstance: BrowserInstance | null = null;
    let result: ApplicationResult = {
      jobId,
      jobUrl,
      status: 'pending',
      fieldsCompleted: 0,
      fieldsFailed: 0,
      fieldMappings: [],
      submittedAt: new Date().toISOString(),
      duration: 0,
      platform: 'unknown',
      attempts: 0
    };

    try {
      // Detect platform
      const platform = this.detectPlatform(jobUrl);
      if (!platform) {
        throw new AdapterNotFoundError('unknown');
      }

      result.platform = platform;
      const adapter = this.adapters.get(platform)!;

      // Launch browser
      browserInstance = await launchBrowser(this.config);
      const page = browserInstance.page;

      // Navigate to job page
      await navigateTo(page, jobUrl, { timeout: this.config.timeout });

      // Apply with retry logic
      result = await withRetry(
        async () => this.executeApplication(page, adapter, profile, jobId, jobUrl),
        {
          maxAttempts: this.config.retryAttempts,
          initialDelay: this.config.retryDelay,
          onRetry: (attempt, error) => {
            logger.warn(`Application attempt ${attempt} failed, retrying...`, {
              jobId,
              error: error.message
            });
            result.attempts = attempt;
          }
        }
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Application failed', { jobId, error: errorMessage });

      result.status = 'failed';
      result.errorMessage = errorMessage;
      result.errorStack = error instanceof Error ? error.stack : undefined;

      // Take error screenshot if enabled
      if (this.config.screenshotOnError && browserInstance) {
        try {
          result.screenshot = await takeScreenshot(browserInstance.page);
        } catch {
          // Ignore screenshot errors
        }
      }
    } finally {
      // Close browser
      if (browserInstance) {
        await closeBrowser(browserInstance);
      }

      // Calculate duration
      result.duration = Date.now() - startTime;
      result.attempts = result.attempts || 1;

      // Add to history
      this.history.push(result);

      logger.info('Application complete', {
        jobId,
        status: result.status,
        duration: result.duration,
        fieldsCompleted: result.fieldsCompleted,
        fieldsFailed: result.fieldsFailed
      });
    }

    return result;
  }

  /**
   * Execute the application process
   */
  private async executeApplication(
    page: Page,
    adapter: BaseFormAdapter,
    profile: UserProfile,
    jobId: string,
    jobUrl: string
  ): Promise<ApplicationResult> {
    const result: ApplicationResult = {
      jobId,
      jobUrl,
      status: 'pending',
      fieldsCompleted: 0,
      fieldsFailed: 0,
      fieldMappings: [],
      submittedAt: new Date().toISOString(),
      duration: 0,
      platform: adapter.platform,
      attempts: 1
    };

    // Wait for form to be ready
    await adapter.waitForFormReady(page, this.config.timeout);

    // Handle multi-step form if needed
    const maxSteps = 10;
    for (let step = 0; step < maxSteps; step++) {
      // Detect fields on current step
      const fields = await adapter.detectForm(page);

      if (fields.length === 0) {
        logger.debug('No fields detected on current step', { step });
      } else {
        // Map fields to profile data
        const mappings = await this.mapFieldsWithLLM(fields, profile);
        result.fieldMappings.push(...mappings);

        // Fill each field
        for (const mapping of mappings) {
          if (mapping.value) {
            const success = await adapter.fillField(page, mapping.field, mapping.value);
            if (success) {
              result.fieldsCompleted++;
            } else {
              result.fieldsFailed++;
            }
          }
        }
      }

      // Check if we're done (submit button visible)
      const formSubmitter = new FormSubmitter(page, {
        dryRun: this.config.dryRun,
        slowMo: this.config.slowMo
      });

      if (await formSubmitter.hasSubmitButton()) {
        // Take screenshot before submission
        if (this.config.screenshotOnComplete) {
          result.screenshot = await takeScreenshot(page);
        }

        // Submit form (or skip if dry run)
        if (this.config.dryRun) {
          logger.info('Dry run mode - skipping submission');
          result.status = 'dry_run';
        } else {
          const submitted = await adapter.submitForm(page);
          if (submitted) {
            const verified = await adapter.verifySubmission(page);
            result.status = verified ? 'success' : 'partial';
            
            // Take final screenshot
            if (this.config.screenshotOnComplete) {
              result.screenshot = await takeScreenshot(page);
            }
          } else {
            result.status = 'failed';
            result.errorMessage = 'Failed to submit form';
          }
        }
        break;
      }

      // Try to go to next step
      if (await formSubmitter.hasNextButton()) {
        await formSubmitter.clickNext();
        await page.waitForTimeout(1000);
      } else {
        break;
      }
    }

    result.submittedAt = new Date().toISOString();
    return result;
  }

  /**
   * Map fields using both exact matching and LLM
   */
  private async mapFieldsWithLLM(
    fields: FormField[],
    profile: UserProfile
  ): Promise<FieldMapping[]> {
    // First, try exact mapping
    const exactResult = this.fieldMapper.mapFields(fields, profile);

    // For unmapped fields, try LLM
    if (exactResult.unmappedFields.length > 0) {
      logger.debug('Using LLM for unmapped fields', {
        count: exactResult.unmappedFields.length
      });

      try {
        const llmMappings = await this.llmMatcher.matchFields(
          exactResult.unmappedFields,
          profile
        );

        // Merge LLM mappings
        for (const llmMapping of llmMappings) {
          const existingIndex = exactResult.mappings.findIndex(
            m => m.field.id === llmMapping.field.id
          );
          if (existingIndex >= 0 && llmMapping.confidence > exactResult.mappings[existingIndex].confidence) {
            exactResult.mappings[existingIndex] = llmMapping;
          }
        }
      } catch (error) {
        logger.warn('LLM mapping failed, using exact mappings only', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return exactResult.mappings;
  }

  /**
   * Apply to multiple jobs in batch
   */
  async batchApply(jobs: Job[], profile: UserProfile): Promise<BatchApplicationResult> {
    const startTime = new Date();
    const results: ApplicationResult[] = [];

    logger.info('Starting batch application', { totalJobs: jobs.length });

    // Process jobs sequentially (could be made concurrent with maxConcurrent)
    for (const job of jobs) {
      try {
        const result = await this.applyToJob(job.url, profile);
        results.push(result);
      } catch (error) {
        logger.error('Batch job failed', {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error)
        });
        results.push({
          jobId: job.id,
          jobUrl: job.url,
          status: 'failed',
          fieldsCompleted: 0,
          fieldsFailed: 0,
          fieldMappings: [],
          errorMessage: error instanceof Error ? error.message : String(error),
          submittedAt: new Date().toISOString(),
          duration: 0,
          platform: job.platform,
          attempts: 1
        });
      }
    }

    const endTime = new Date();
    const batchResult: BatchApplicationResult = {
      results,
      totalJobs: jobs.length,
      successCount: results.filter(r => r.status === 'success').length,
      partialCount: results.filter(r => r.status === 'partial').length,
      failedCount: results.filter(r => r.status === 'failed').length,
      startedAt: startTime.toISOString(),
      completedAt: endTime.toISOString(),
      totalDuration: endTime.getTime() - startTime.getTime()
    };

    logger.info('Batch application complete', {
      total: batchResult.totalJobs,
      success: batchResult.successCount,
      partial: batchResult.partialCount,
      failed: batchResult.failedCount,
      duration: batchResult.totalDuration
    });

    return batchResult;
  }

  /**
   * Get application history
   */
  getHistory(): ApplicationResult[] {
    return [...this.history];
  }

  /**
   * Clear application history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Export results to JSON or CSV format
   */
  exportResults(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(this.history, null, 2);
    }

    // CSV format
    const headers = [
      'jobId',
      'jobUrl',
      'platform',
      'status',
      'fieldsCompleted',
      'fieldsFailed',
      'duration',
      'submittedAt',
      'errorMessage'
    ];

    const rows = this.history.map(result => [
      result.jobId,
      result.jobUrl,
      result.platform,
      result.status,
      result.fieldsCompleted.toString(),
      result.fieldsFailed.toString(),
      result.duration.toString(),
      result.submittedAt,
      result.errorMessage || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Calculate reliability score based on history
   */
  getReliabilityScore(): number {
    if (this.history.length === 0) return 0;

    const successWeight = 1.0;
    const partialWeight = 0.5;

    const totalScore = this.history.reduce((score, result) => {
      if (result.status === 'success') return score + successWeight;
      if (result.status === 'partial') return score + partialWeight;
      return score;
    }, 0);

    return Math.round((totalScore / this.history.length) * 100) / 100;
  }

  /**
   * Get statistics about field mapping performance
   */
  getFieldMappingStats(): {
    totalFields: number;
    exactMatches: number;
    llmMatches: number;
    fallbackMatches: number;
    averageConfidence: number;
  } {
    let totalFields = 0;
    let exactMatches = 0;
    let llmMatches = 0;
    let fallbackMatches = 0;
    let totalConfidence = 0;

    for (const result of this.history) {
      for (const mapping of result.fieldMappings) {
        totalFields++;
        totalConfidence += mapping.confidence;

        switch (mapping.source) {
          case 'exact':
            exactMatches++;
            break;
          case 'llm':
            llmMatches++;
            break;
          case 'fallback':
            fallbackMatches++;
            break;
        }
      }
    }

    return {
      totalFields,
      exactMatches,
      llmMatches,
      fallbackMatches,
      averageConfidence: totalFields > 0 ? Math.round((totalConfidence / totalFields) * 100) / 100 : 0
    };
  }

  /**
   * Extract job ID from URL
   */
  private extractJobId(url: string): string {
    // Try to extract job ID from various URL patterns
    const patterns = [
      /\/jobs\/view\/(\d+)/,  // LinkedIn
      /\/job-listing\/.*?\.htm\?jl=(\d+)/,  // Glassdoor
      /jobId=(\d+)/,
      /job\/(\d+)/,
      /\/(\d{6,})/  // Generic long number
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Generate a hash from URL if no ID found
    return `job_${Buffer.from(url).toString('base64').substring(0, 12)}`;
  }

  /**
   * Set fallback values for fields that can't be mapped
   */
  setFallbackValues(fallbacks: Record<string, string>): void {
    this.fieldMapper.setFallbacks(fallbacks);
  }

  /**
   * Enable or disable LLM matching
   */
  setLLMEnabled(enabled: boolean): void {
    this.llmMatcher.setEnabled(enabled);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FormFillConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.llmServiceUrl) {
      this.llmMatcher = new LLMFieldMatcher(this.config.llmServiceUrl, this.config.timeout);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): FormFillConfig {
    return { ...this.config };
  }
}

export default FormAutoFillEngine;
