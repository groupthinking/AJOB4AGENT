import { Page } from 'playwright';
import { BasePlatformAdapter } from './BasePlatformAdapter';
import { DetectedField, FormFillLogger } from '../types';
import { FieldMappingService } from '../field-mapping/FieldMappingService';

/**
 * LinkedIn Easy Apply platform adapter
 */
export class LinkedInAdapter extends BasePlatformAdapter {
  readonly platformName = 'linkedin';
  
  // LinkedIn-specific selectors
  private static readonly SELECTORS = {
    easyApplyButton: 'button:has-text("Easy Apply")',
    easyApplyModal: '.jobs-easy-apply-modal',
    nextButton: 'button[aria-label="Continue to next step"]',
    reviewButton: 'button[aria-label="Review your application"]',
    submitButton: 'button[aria-label="Submit application"]',
    dismissButton: 'button[aria-label="Dismiss"]',
    closeModal: 'button[aria-label="Dismiss"]',
    resumeUpload: 'input[type="file"][name="file"]',
    coverLetterField: 'textarea[aria-label*="cover letter"]',
    phoneInput: 'input[aria-label*="Phone"]',
    followCompanyCheckbox: 'input[type="checkbox"][id*="follow-company"]',
    successMessage: 'h2:has-text("Your application was sent")',
    formError: '.artdeco-inline-feedback--error',
    questionLabel: '.jobs-easy-apply-form-section__grouping label',
    questionInput: '.jobs-easy-apply-form-section__grouping input',
    questionSelect: '.jobs-easy-apply-form-section__grouping select',
    questionTextarea: '.jobs-easy-apply-form-section__grouping textarea',
  };

  constructor(fieldMapper: FieldMappingService, logger?: FormFillLogger) {
    super(fieldMapper, logger);
  }

  /**
   * Check if currently on LinkedIn
   */
  async isOnPlatform(page: Page): Promise<boolean> {
    const url = page.url();
    return url.includes('linkedin.com');
  }

  /**
   * Detect if an Easy Apply form is present
   */
  async detectApplicationForm(page: Page): Promise<boolean> {
    try {
      const modal = page.locator(LinkedInAdapter.SELECTORS.easyApplyModal);
      return await modal.isVisible({ timeout: 5000 });
    } catch {
      return false;
    }
  }

  /**
   * Click the Easy Apply button to open the application modal
   */
  async openEasyApply(page: Page): Promise<boolean> {
    try {
      const easyApplyBtn = page.locator(LinkedInAdapter.SELECTORS.easyApplyButton).first();
      await easyApplyBtn.waitFor({ state: 'visible', timeout: 10000 });
      await easyApplyBtn.click();
      
      // Wait for modal to appear
      await page.locator(LinkedInAdapter.SELECTORS.easyApplyModal).waitFor({ 
        state: 'visible', 
        timeout: 10000 
      });
      
      return true;
    } catch (error) {
      this.logger.error('Failed to open Easy Apply modal', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Detect fields in the current Easy Apply step
   */
  async detectFields(page: Page): Promise<DetectedField[]> {
    const fields: DetectedField[] = [];
    const modal = page.locator(LinkedInAdapter.SELECTORS.easyApplyModal);

    // Detect form questions
    const formSections = modal.locator('.jobs-easy-apply-form-section__grouping');
    const sectionCount = await formSections.count();

    for (let i = 0; i < sectionCount; i++) {
      const section = formSections.nth(i);
      
      // Get label
      const labelElement = section.locator('label').first();
      const label = (await labelElement.textContent()) || '';

      // Check for different input types
      const input = section.locator('input:not([type="hidden"]):not([type="file"])').first();
      const textarea = section.locator('textarea').first();
      const select = section.locator('select').first();
      const fileInput = section.locator('input[type="file"]').first();

      if (await input.count() > 0) {
        const field = await this.extractFieldInfo(input, page);
        if (field) {
          field.label = label.trim();
          fields.push(field);
        }
      }

      if (await textarea.count() > 0) {
        const field = await this.extractFieldInfo(textarea, page);
        if (field) {
          field.label = label.trim();
          field.inputType = 'textarea';
          fields.push(field);
        }
      }

      if (await select.count() > 0) {
        const field = await this.extractFieldInfo(select, page);
        if (field) {
          field.label = label.trim();
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

      if (await fileInput.count() > 0) {
        const field = await this.extractFieldInfo(fileInput, page);
        if (field) {
          field.label = label.trim();
          field.inputType = 'file';
          field.fieldType = 'resume';
          fields.push(field);
        }
      }
    }

    // Also detect radio button groups
    const radioGroups = modal.locator('fieldset');
    const radioGroupCount = await radioGroups.count();

    for (let i = 0; i < radioGroupCount; i++) {
      const group = radioGroups.nth(i);
      const legend = group.locator('legend');
      const label = (await legend.textContent()) || '';
      
      const radios = group.locator('input[type="radio"]');
      if (await radios.count() > 0) {
        const firstRadio = radios.first();
        const field = await this.extractFieldInfo(firstRadio, page);
        if (field) {
          field.label = label.trim();
          field.inputType = 'radio';
          // Get all radio options
          field.options = [];
          const radioCount = await radios.count();
          for (let j = 0; j < radioCount; j++) {
            const radioLabel = group.locator(`label[for="${await radios.nth(j).getAttribute('id')}"]`);
            const text = await radioLabel.textContent();
            if (text) {
              field.options.push(text.trim());
            }
          }
          fields.push(field);
        }
      }
    }

    return fields;
  }

  /**
   * Navigate to the next step in the Easy Apply flow
   */
  async navigateToNextStep(page: Page): Promise<boolean> {
    try {
      const modal = page.locator(LinkedInAdapter.SELECTORS.easyApplyModal);
      
      // Check if there's a Review button (means we're at the last step before submission)
      const reviewButton = modal.locator(LinkedInAdapter.SELECTORS.reviewButton);
      if (await reviewButton.isVisible({ timeout: 1000 })) {
        await reviewButton.click();
        await page.waitForTimeout(1500);
        return true;
      }

      // Otherwise, look for Next button
      const nextButton = modal.locator(LinkedInAdapter.SELECTORS.nextButton);
      if (await nextButton.isVisible({ timeout: 1000 })) {
        await nextButton.click();
        await page.waitForTimeout(1500);
        return true;
      }

      // Also try button with text "Next"
      const nextTextButton = modal.locator('button:has-text("Next")').first();
      if (await nextTextButton.isVisible({ timeout: 1000 })) {
        await nextTextButton.click();
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
      const modal = page.locator(LinkedInAdapter.SELECTORS.easyApplyModal);
      
      // Uncheck the follow company checkbox if present
      try {
        const followCheckbox = modal.locator(LinkedInAdapter.SELECTORS.followCompanyCheckbox);
        if (await followCheckbox.isChecked()) {
          await followCheckbox.uncheck();
        }
      } catch {
        // Ignore - checkbox might not exist
      }

      // Click submit button
      const submitButton = modal.locator(LinkedInAdapter.SELECTORS.submitButton);
      if (await submitButton.isVisible({ timeout: 5000 })) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        return true;
      }

      // Try with text content
      const submitTextButton = modal.locator('button:has-text("Submit application")').first();
      if (await submitTextButton.isVisible({ timeout: 2000 })) {
        await submitTextButton.click();
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
      const successMessage = page.locator(LinkedInAdapter.SELECTORS.successMessage);
      return await successMessage.isVisible({ timeout: 5000 });
    } catch {
      return false;
    }
  }

  /**
   * Handle LinkedIn-specific popups
   */
  async handlePopups(page: Page): Promise<void> {
    await super.handlePopups(page);
    
    // Handle "Save and exit" dialog if it appears
    try {
      const discardButton = page.locator('button:has-text("Discard")');
      if (await discardButton.isVisible({ timeout: 1000 })) {
        await discardButton.click();
      }
    } catch {
      // Ignore
    }

    // Handle cookie consent
    try {
      const cookieAccept = page.locator('button:has-text("Accept cookies")');
      if (await cookieAccept.isVisible({ timeout: 1000 })) {
        await cookieAccept.click();
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Upload resume in LinkedIn Easy Apply
   */
  async uploadResume(page: Page, resumePath: string): Promise<boolean> {
    try {
      const modal = page.locator(LinkedInAdapter.SELECTORS.easyApplyModal);
      const fileInput = modal.locator(LinkedInAdapter.SELECTORS.resumeUpload).first();
      
      await fileInput.setInputFiles(resumePath);
      await page.waitForTimeout(2000); // Wait for upload to process
      
      return true;
    } catch (error) {
      this.logger.error('Failed to upload resume on LinkedIn', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Close the Easy Apply modal
   */
  async closeModal(page: Page): Promise<void> {
    try {
      const closeButton = page.locator(LinkedInAdapter.SELECTORS.closeModal).first();
      if (await closeButton.isVisible({ timeout: 2000 })) {
        await closeButton.click();
        
        // Handle "Discard" confirmation if it appears
        const discardButton = page.locator('button:has-text("Discard")');
        if (await discardButton.isVisible({ timeout: 2000 })) {
          await discardButton.click();
        }
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
      const errorElements = page.locator(LinkedInAdapter.SELECTORS.formError);
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
