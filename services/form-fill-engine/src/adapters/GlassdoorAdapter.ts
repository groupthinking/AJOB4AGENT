import { Page } from 'playwright';
import { BasePlatformAdapter } from './BasePlatformAdapter';
import { DetectedField, FormFillLogger } from '../types';
import { FieldMappingService } from '../field-mapping/FieldMappingService';

/**
 * Glassdoor platform adapter for job applications
 */
export class GlassdoorAdapter extends BasePlatformAdapter {
  readonly platformName = 'glassdoor';

  // Glassdoor-specific selectors
  private static readonly SELECTORS = {
    applyButton: '#applyButton, [data-test="applyButton"], button:has-text("Apply Now"), button:has-text("Easy Apply")',
    applicationModal: '[data-test="application-modal"], .applicationModal, [role="dialog"]',
    submitButton: '[data-test="submit-application"], button:has-text("Submit"), button:has-text("Submit Application")',
    nextButton: 'button:has-text("Next"), button:has-text("Continue")',
    resumeUpload: 'input[type="file"][name*="resume"], input[type="file"][accept*=".pdf"]',
    coverLetterField: 'textarea[name*="cover"], textarea[aria-label*="cover letter"]',
    formField: '.applicationFormQuestion, .formQuestion, [data-test="form-field"]',
    successMessage: '[data-test="application-success"], .applicationSuccess, :has-text("Application submitted")',
    errorMessage: '.error, .errorMessage, [data-test="error"]',
    closeModal: '[data-test="close-modal"], button[aria-label="Close"], .modal-close',
    externalRedirect: '.externalApply, [data-test="external-apply"]',
  };

  constructor(fieldMapper: FieldMappingService, logger?: FormFillLogger) {
    super(fieldMapper, logger);
  }

  /**
   * Check if currently on Glassdoor
   */
  async isOnPlatform(page: Page): Promise<boolean> {
    const url = page.url();
    return url.includes('glassdoor.com');
  }

  /**
   * Detect if a Glassdoor application form is present
   */
  async detectApplicationForm(page: Page): Promise<boolean> {
    try {
      // Check for internal application modal
      const modal = page.locator(GlassdoorAdapter.SELECTORS.applicationModal);
      if (await modal.isVisible({ timeout: 5000 })) {
        return true;
      }

      // Check for apply button (modal might not be open yet)
      const applyButton = page.locator(GlassdoorAdapter.SELECTORS.applyButton).first();
      return await applyButton.isVisible({ timeout: 3000 });
    } catch {
      return false;
    }
  }

  /**
   * Check if this is an external ATS redirect
   */
  async isExternalRedirect(page: Page): Promise<boolean> {
    try {
      const external = page.locator(GlassdoorAdapter.SELECTORS.externalRedirect);
      return await external.isVisible({ timeout: 2000 });
    } catch {
      return false;
    }
  }

  /**
   * Open the application modal
   */
  async openApplication(page: Page): Promise<boolean> {
    try {
      const applyButton = page.locator(GlassdoorAdapter.SELECTORS.applyButton).first();
      await applyButton.waitFor({ state: 'visible', timeout: 10000 });
      await applyButton.click();

      // Check if it's an external redirect
      if (await this.isExternalRedirect(page)) {
        this.logger.warn('External ATS redirect detected - cannot auto-fill');
        return false;
      }

      // Wait for modal
      await page.locator(GlassdoorAdapter.SELECTORS.applicationModal)
        .waitFor({ state: 'visible', timeout: 10000 });
      
      return true;
    } catch (error) {
      this.logger.error('Failed to open application modal', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Detect fields in the current application step
   */
  async detectFields(page: Page): Promise<DetectedField[]> {
    const fields: DetectedField[] = [];

    try {
      // First use the base class detection for common fields
      const baseFields = await super.detectFields(page);
      fields.push(...baseFields);

      // Then detect Glassdoor-specific form questions
      const formQuestions = page.locator(GlassdoorAdapter.SELECTORS.formField);
      const questionCount = await formQuestions.count();

      for (let i = 0; i < questionCount; i++) {
        const question = formQuestions.nth(i);
        
        // Get label text
        const labelElement = question.locator('label, .label, .questionLabel').first();
        const label = (await labelElement.textContent()) || '';

        // Look for input elements
        const input = question.locator('input:not([type="hidden"]):not([type="file"])').first();
        const textarea = question.locator('textarea').first();
        const select = question.locator('select').first();

        if (await input.count() > 0 && await input.isVisible()) {
          const field = await this.extractFieldInfo(input, page);
          if (field && !this.isDuplicateField(fields, field)) {
            field.label = label.trim() || field.label;
            fields.push(field);
          }
        }

        if (await textarea.count() > 0 && await textarea.isVisible()) {
          const field = await this.extractFieldInfo(textarea, page);
          if (field && !this.isDuplicateField(fields, field)) {
            field.label = label.trim() || field.label;
            field.inputType = 'textarea';
            fields.push(field);
          }
        }

        if (await select.count() > 0 && await select.isVisible()) {
          const field = await this.extractFieldInfo(select, page);
          if (field && !this.isDuplicateField(fields, field)) {
            field.label = label.trim() || field.label;
            field.inputType = 'select';
            // Get options
            const options = select.locator('option');
            const optionCount = await options.count();
            field.options = [];
            for (let j = 0; j < optionCount; j++) {
              const text = await options.nth(j).textContent();
              if (text) {
                field.options.push(text.trim());
              }
            }
            fields.push(field);
          }
        }
      }
    } catch (error) {
      this.logger.warn('Error detecting Glassdoor form fields', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return fields;
  }

  /**
   * Check if a field is already in the list (to avoid duplicates)
   */
  private isDuplicateField(fields: DetectedField[], newField: DetectedField): boolean {
    return fields.some(
      (f) =>
        (f.id && f.id === newField.id) ||
        (f.name && f.name === newField.name) ||
        (f.label && f.label === newField.label && f.inputType === newField.inputType)
    );
  }

  /**
   * Navigate to the next step in the application
   */
  async navigateToNextStep(page: Page): Promise<boolean> {
    try {
      const nextButton = page.locator(GlassdoorAdapter.SELECTORS.nextButton).first();
      
      if (await nextButton.isVisible({ timeout: 2000 })) {
        await nextButton.click();
        await page.waitForTimeout(1500);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.warn('Failed to navigate to next step', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Submit the application
   */
  async submitApplication(page: Page): Promise<boolean> {
    try {
      const submitButton = page.locator(GlassdoorAdapter.SELECTORS.submitButton).first();
      
      if (await submitButton.isVisible({ timeout: 5000 })) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to submit application', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Check if application was successfully submitted
   */
  async isApplicationComplete(page: Page): Promise<boolean> {
    try {
      const successMessage = page.locator(GlassdoorAdapter.SELECTORS.successMessage);
      return await successMessage.isVisible({ timeout: 5000 });
    } catch {
      return false;
    }
  }

  /**
   * Handle Glassdoor-specific popups
   */
  async handlePopups(page: Page): Promise<void> {
    await super.handlePopups(page);

    // Handle sign-in prompts
    try {
      const signInLater = page.locator('button:has-text("Not now"), button:has-text("Skip")');
      if (await signInLater.isVisible({ timeout: 1000 })) {
        await signInLater.click();
      }
    } catch {
      // Ignore
    }

    // Handle email subscription prompts
    try {
      const noThanks = page.locator('button:has-text("No thanks"), button:has-text("Maybe later")');
      if (await noThanks.isVisible({ timeout: 1000 })) {
        await noThanks.click();
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Upload resume on Glassdoor
   */
  async uploadResume(page: Page, resumePath: string): Promise<boolean> {
    try {
      const fileInput = page.locator(GlassdoorAdapter.SELECTORS.resumeUpload).first();
      await fileInput.setInputFiles(resumePath);
      await page.waitForTimeout(2000);
      return true;
    } catch (error) {
      this.logger.error('Failed to upload resume on Glassdoor', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Close the application modal
   */
  async closeModal(page: Page): Promise<void> {
    try {
      const closeButton = page.locator(GlassdoorAdapter.SELECTORS.closeModal).first();
      if (await closeButton.isVisible({ timeout: 2000 })) {
        await closeButton.click();
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Check for form errors
   */
  async hasErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];
    try {
      const errorElements = page.locator(GlassdoorAdapter.SELECTORS.errorMessage);
      const count = await errorElements.count();

      for (let i = 0; i < count; i++) {
        const text = await errorElements.nth(i).textContent();
        if (text) {
          errors.push(text.trim());
        }
      }
    } catch {
      // Ignore
    }
    return errors;
  }
}
