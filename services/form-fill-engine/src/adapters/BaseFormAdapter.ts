/**
 * Base Form Adapter
 * Abstract base class for platform-specific form adapters
 */

import { Page } from 'playwright';
import { FormField, AdapterCapabilities } from '../types';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('base-adapter');

export abstract class BaseFormAdapter {
  /**
   * Platform identifier (e.g., 'linkedin', 'glassdoor')
   */
  abstract readonly platform: string;

  /**
   * Platform capabilities
   */
  abstract readonly capabilities: AdapterCapabilities;

  /**
   * Check if a URL belongs to this platform's apply flow
   */
  abstract isApplyPage(url: string): boolean;

  /**
   * Detect form fields on the current page
   */
  abstract detectForm(page: Page): Promise<FormField[]>;

  /**
   * Fill a single form field
   */
  abstract fillField(page: Page, field: FormField, value: string): Promise<boolean>;

  /**
   * Submit the application form
   */
  abstract submitForm(page: Page): Promise<boolean>;

  /**
   * Handle multi-step form navigation (optional override)
   */
  async handleMultiStep(_page: Page): Promise<boolean> {
    logger.debug('Default multi-step handler - no action taken');
    return true;
  }

  /**
   * Login to the platform (optional override)
   */
  async login(_page: Page, _credentials: { email: string; password: string }): Promise<boolean> {
    logger.debug('Default login handler - no action taken');
    return true;
  }

  /**
   * Navigate to a job's application page
   */
  async navigateToJob(page: Page, jobUrl: string): Promise<boolean> {
    logger.info('Navigating to job', { url: jobUrl });
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded' });
    return true;
  }

  /**
   * Check if the application was successfully submitted
   */
  async verifySubmission(page: Page): Promise<boolean> {
    // Default implementation - look for common success indicators
    const successSelectors = [
      '.success-message',
      '.application-submitted',
      '[data-test="application-success"]',
      ':has-text("Application submitted")',
      ':has-text("Thank you for applying")'
    ];

    for (const selector of successSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 5000 })) {
          return true;
        }
      } catch {
        // Continue checking other selectors
      }
    }

    return false;
  }

  /**
   * Take a screenshot of the current state
   */
  async captureScreenshot(page: Page): Promise<string> {
    const buffer = await page.screenshot({ type: 'png' });
    return buffer.toString('base64');
  }

  /**
   * Handle file upload for resume
   */
  async uploadResume(page: Page, fileSelector: string, filePath: string): Promise<boolean> {
    try {
      const fileInput = page.locator(fileSelector).first();
      await fileInput.setInputFiles(filePath);
      return true;
    } catch (error) {
      logger.error('Failed to upload resume', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Wait for form to be ready for interaction
   */
  async waitForFormReady(page: Page, timeout: number = 10000): Promise<boolean> {
    try {
      // Wait for page to be stable
      await page.waitForLoadState('domcontentloaded', { timeout });
      
      // Wait for any loading indicators to disappear
      const loadingSelectors = [
        '.loading',
        '.spinner',
        '[aria-busy="true"]',
        '.skeleton'
      ];

      for (const selector of loadingSelectors) {
        try {
          await page.waitForSelector(selector, { state: 'hidden', timeout: 3000 });
        } catch {
          // Selector not found, which is fine
        }
      }

      return true;
    } catch (error) {
      logger.warn('Form ready timeout', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Get platform-specific field labels for common fields
   */
  getFieldLabels(): Record<string, string[]> {
    // Default field labels - can be overridden by specific adapters
    return {
      email: ['Email', 'E-mail', 'Email Address'],
      phone: ['Phone', 'Phone Number', 'Mobile', 'Cell'],
      firstName: ['First Name', 'Given Name', 'First'],
      lastName: ['Last Name', 'Surname', 'Family Name'],
      resume: ['Resume', 'CV', 'Resume/CV'],
      coverLetter: ['Cover Letter', 'Letter of Interest'],
      linkedin: ['LinkedIn', 'LinkedIn URL', 'LinkedIn Profile'],
      portfolio: ['Portfolio', 'Website', 'Personal Website']
    };
  }
}

export default BaseFormAdapter;
