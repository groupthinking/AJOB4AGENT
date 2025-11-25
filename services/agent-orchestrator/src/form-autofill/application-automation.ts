import { Page } from 'playwright';
import { UserProfile } from './user-profile.interface';
import { FormAutoFill, FormFillResult } from './form-autofill';
import { FormFieldType } from './field-detector';

/**
 * Application result for reporting
 */
export interface ApplicationResult {
  jobId: string;
  platform: string;
  jobUrl: string;
  status: 'success' | 'partial' | 'failed';
  formFillResult?: FormFillResult;
  submissionResult?: SubmissionResult;
  retryCount: number;
  startTime: Date;
  endTime: Date;
  errors: string[];
  warnings: string[];
}

export interface SubmissionResult {
  submitted: boolean;
  confirmationMessage?: string;
  confirmationId?: string;
  screenshotPath?: string;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Application automation configuration
 */
export interface ApplicationConfig {
  userProfile: UserProfile;
  tailoredResumePath?: string;
  tailoredCoverLetter?: string;
  retryConfig?: RetryConfig;
  simulatedMode?: boolean; // Don't actually submit
  screenshotOnError?: boolean;
  screenshotDir?: string;
}

/**
 * Base class for platform-specific application automation
 */
export abstract class ApplicationAutomation {
  protected page: Page;
  protected config: ApplicationConfig;
  protected formAutoFill: FormAutoFill;
  protected retryConfig: RetryConfig;
  
  constructor(page: Page, config: ApplicationConfig) {
    this.page = page;
    this.config = config;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retryConfig };
    
    // Merge tailored content into user profile
    const enrichedProfile = { ...config.userProfile };
    if (config.tailoredResumePath) {
      enrichedProfile.resumePath = config.tailoredResumePath;
    }
    if (config.tailoredCoverLetter) {
      enrichedProfile.coverLetterTemplate = config.tailoredCoverLetter;
    }
    
    this.formAutoFill = new FormAutoFill(page, enrichedProfile);
  }
  
  /**
   * Execute application with retries
   */
  async applyWithRetries(jobId: string, jobUrl: string, platform: string): Promise<ApplicationResult> {
    const result: ApplicationResult = {
      jobId,
      platform,
      jobUrl,
      status: 'failed',
      retryCount: 0,
      startTime: new Date(),
      endTime: new Date(),
      errors: [],
      warnings: [],
    };
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      result.retryCount = attempt;
      
      try {
        const applyResult = await this.executeApplication(jobUrl);
        result.formFillResult = applyResult.formFillResult;
        result.submissionResult = applyResult.submissionResult;
        
        if (applyResult.success) {
          result.status = 'success';
          result.endTime = new Date();
          return result;
        }
        
        // Check if it was a partial success
        if (applyResult.formFillResult && applyResult.formFillResult.reliabilityScore > 0.5) {
          result.status = 'partial';
          result.warnings.push('Form was partially filled but submission may have failed');
        }
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        result.errors.push(`Attempt ${attempt + 1}: ${lastError.message}`);
        
        // Take screenshot on error if configured
        if (this.config.screenshotOnError && this.config.screenshotDir) {
          try {
            const screenshotPath = `${this.config.screenshotDir}/error-${jobId}-${attempt}.png`;
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            result.warnings.push(`Error screenshot saved: ${screenshotPath}`);
          } catch {
            // Ignore screenshot errors
          }
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt),
          this.retryConfig.maxDelay
        );
        
        if (attempt < this.retryConfig.maxRetries - 1) {
          await this.page.waitForTimeout(delay);
        }
      }
    }
    
    result.endTime = new Date();
    if (lastError) {
      result.errors.push(`Final error: ${lastError.message}`);
    }
    
    return result;
  }
  
  /**
   * Execute the application process (to be implemented by platform-specific classes)
   */
  protected abstract executeApplication(jobUrl: string): Promise<{
    success: boolean;
    formFillResult?: FormFillResult;
    submissionResult?: SubmissionResult;
  }>;
  
  /**
   * Utility method to wait for element with timeout
   */
  protected async waitForElement(selector: string, timeout: number = 10000): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Utility method to click and wait
   */
  protected async clickAndWait(
    selector: string,
    waitForNavigation: boolean = false,
    timeout: number = 5000
  ): Promise<boolean> {
    try {
      const element = this.page.locator(selector).first();
      await element.click();
      
      if (waitForNavigation) {
        await this.page.waitForLoadState('networkidle', { timeout });
      } else {
        await this.page.waitForTimeout(500);
      }
      
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Check if a modal is present
   */
  protected async isModalPresent(modalSelector: string): Promise<boolean> {
    try {
      const modal = this.page.locator(modalSelector);
      return await modal.isVisible();
    } catch {
      return false;
    }
  }
  
  /**
   * Get common form selectors for platform
   */
  protected abstract getFormContainerSelector(): string;
  
  /**
   * Get platform-specific field priority
   */
  protected getFieldPriority(): FormFieldType[] {
    return [
      'email',
      'firstName',
      'lastName',
      'phone',
      'resume',
      'coverLetter',
      'linkedin',
      'github',
      'experience',
      'education',
    ];
  }
}

/**
 * Generate application report
 */
export function generateApplicationReport(results: ApplicationResult[]): {
  summary: {
    total: number;
    successful: number;
    partial: number;
    failed: number;
    averageReliabilityScore: number;
    totalRetries: number;
  };
  details: ApplicationResult[];
} {
  const successful = results.filter(r => r.status === 'success').length;
  const partial = results.filter(r => r.status === 'partial').length;
  const failed = results.filter(r => r.status === 'failed').length;
  
  const reliabilityScores = results
    .filter(r => r.formFillResult)
    .map(r => r.formFillResult!.reliabilityScore);
  
  const averageReliabilityScore = reliabilityScores.length > 0
    ? reliabilityScores.reduce((a, b) => a + b, 0) / reliabilityScores.length
    : 0;
  
  const totalRetries = results.reduce((sum, r) => sum + r.retryCount, 0);
  
  return {
    summary: {
      total: results.length,
      successful,
      partial,
      failed,
      averageReliabilityScore,
      totalRetries,
    },
    details: results,
  };
}
