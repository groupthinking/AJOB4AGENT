/**
 * LinkedIn Easy Apply Adapter
 * Handles LinkedIn Easy Apply job application flow
 */

import { Page } from 'playwright';
import { FormField, AdapterCapabilities, FieldType } from '../types';
import { BaseFormAdapter } from './BaseFormAdapter';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('linkedin-adapter');

export class LinkedInEasyApplyAdapter extends BaseFormAdapter {
  readonly platform = 'linkedin';

  readonly capabilities: AdapterCapabilities = {
    supportsMultiStep: true,
    supportsFileUpload: true,
    supportsScreenshot: true,
    requiresLogin: true,
    platformName: 'LinkedIn',
    platformUrl: 'https://www.linkedin.com'
  };

  // LinkedIn-specific selectors
  private readonly selectors = {
    easyApplyButton: 'button.jobs-apply-button',
    easyApplyButtonAlt: '[data-control-name="jobdetails_topcard_inapply"]',
    modal: '.jobs-easy-apply-modal',
    modalContent: '.jobs-easy-apply-content',
    nextButton: 'button[aria-label="Continue to next step"]',
    reviewButton: 'button[aria-label="Review your application"]',
    submitButton: 'button[aria-label="Submit application"]',
    closeButton: 'button[aria-label="Dismiss"]',
    fileInput: 'input[type="file"]',
    formFields: '.jobs-easy-apply-form-section',
    errorMessage: '.artdeco-inline-feedback--error',
    successMessage: '.artdeco-modal__header h2'
  };

  /**
   * Check if URL is a LinkedIn job page
   */
  isApplyPage(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();
      const pathname = parsedUrl.pathname.toLowerCase();
      // Check that hostname is linkedin.com or www.linkedin.com
      const isLinkedIn = hostname === 'linkedin.com' || hostname === 'www.linkedin.com';
      // Check that path starts with /jobs/ or /job/
      const isJobPage = pathname.startsWith('/jobs/') || pathname.startsWith('/job/');
      return isLinkedIn && isJobPage;
    } catch {
      return false;
    }
  }

  /**
   * Detect form fields in the LinkedIn Easy Apply modal
   */
  async detectForm(page: Page): Promise<FormField[]> {
    logger.info('Detecting LinkedIn Easy Apply form fields');

    const fields: FormField[] = [];

    // Wait for modal to be visible
    try {
      await page.waitForSelector(this.selectors.modal, { timeout: 10000 });
    } catch {
      logger.warn('Easy Apply modal not found');
      return fields;
    }

    // Detect text inputs
    const textInputs = await page.locator(`${this.selectors.modal} input[type="text"]`).all();
    for (let i = 0; i < textInputs.length; i++) {
      const input = textInputs[i];
      const field = await this.extractLinkedInField(input, 'text', i);
      if (field) fields.push(field);
    }

    // Detect email inputs
    const emailInputs = await page.locator(`${this.selectors.modal} input[type="email"]`).all();
    for (let i = 0; i < emailInputs.length; i++) {
      const input = emailInputs[i];
      const field = await this.extractLinkedInField(input, 'email', i);
      if (field) fields.push(field);
    }

    // Detect phone inputs
    const phoneInputs = await page.locator(`${this.selectors.modal} input[type="tel"]`).all();
    for (let i = 0; i < phoneInputs.length; i++) {
      const input = phoneInputs[i];
      const field = await this.extractLinkedInField(input, 'tel', i);
      if (field) fields.push(field);
    }

    // Detect textareas
    const textareas = await page.locator(`${this.selectors.modal} textarea`).all();
    for (let i = 0; i < textareas.length; i++) {
      const textarea = textareas[i];
      const field = await this.extractLinkedInField(textarea, 'textarea', i);
      if (field) fields.push(field);
    }

    // Detect select dropdowns
    const selects = await page.locator(`${this.selectors.modal} select`).all();
    for (let i = 0; i < selects.length; i++) {
      const select = selects[i];
      const field = await this.extractLinkedInField(select, 'select', i);
      if (field) {
        // Get options
        const options = await select.locator('option').allTextContents();
        field.options = options.filter(opt => opt.trim() !== '');
        fields.push(field);
      }
    }

    // Detect file inputs for resume
    const fileInputs = await page.locator(`${this.selectors.modal} input[type="file"]`).all();
    for (let i = 0; i < fileInputs.length; i++) {
      fields.push({
        id: `file_${i}`,
        name: 'resume',
        type: 'file',
        label: 'Resume',
        required: true,
        selector: `${this.selectors.modal} input[type="file"]:nth-of-type(${i + 1})`
      });
    }

    // Detect radio buttons
    const radioGroups = await page.locator(`${this.selectors.modal} fieldset:has(input[type="radio"])`).all();
    for (let i = 0; i < radioGroups.length; i++) {
      const group = radioGroups[i];
      const legend = await group.locator('legend').textContent();
      const options = await group.locator('input[type="radio"]').all();
      const optionValues: string[] = [];
      
      for (const option of options) {
        const value = await option.getAttribute('value');
        if (value) optionValues.push(value);
      }

      const name = await options[0]?.getAttribute('name');
      if (name) {
        fields.push({
          id: `radio_${i}`,
          name,
          type: 'radio',
          label: legend?.trim() || name,
          required: true,
          options: optionValues,
          selector: `${this.selectors.modal} input[name="${name}"]`
        });
      }
    }

    logger.info('Field detection complete', { fieldCount: fields.length });
    return fields;
  }

  /**
   * Fill a field in the LinkedIn Easy Apply modal
   */
  async fillField(page: Page, field: FormField, value: string): Promise<boolean> {
    logger.debug('Filling LinkedIn field', { fieldId: field.id, type: field.type });

    try {
      const element = page.locator(field.selector).first();

      switch (field.type) {
        case 'text':
        case 'email':
        case 'tel':
        case 'number':
          await element.clear();
          await element.fill(value);
          break;

        case 'textarea':
          await element.clear();
          await element.fill(value);
          break;

        case 'select': {
          // Find best matching option
          const matchedOption = await this.findBestOption(page, field, value);
          if (matchedOption) {
            await element.selectOption({ label: matchedOption });
          } else {
            await element.selectOption(value);
          }
          break;
        }

        case 'radio': {
          // Find the radio with matching value
          const radioSelector = `${this.selectors.modal} input[type="radio"][name="${field.name}"][value="${value}"]`;
          await page.locator(radioSelector).check();
          break;
        }

        case 'checkbox': {
          const shouldCheck = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
          if (shouldCheck) {
            await element.check();
          } else {
            await element.uncheck();
          }
          break;
        }

        case 'file':
          await element.setInputFiles(value);
          break;

        default:
          logger.warn('Unknown field type', { type: field.type });
          return false;
      }

      // Wait a bit for LinkedIn's validation
      await page.waitForTimeout(300);
      return true;
    } catch (error) {
      logger.error('Failed to fill field', {
        fieldId: field.id,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Submit the LinkedIn Easy Apply form
   */
  async submitForm(page: Page): Promise<boolean> {
    logger.info('Submitting LinkedIn Easy Apply form');

    try {
      // Check if we're on the final step
      const submitButton = page.locator(this.selectors.submitButton);
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        // Check for success
        const success = await this.verifySubmission(page);
        return success;
      }

      logger.warn('Submit button not visible');
      return false;
    } catch (error) {
      logger.error('Failed to submit form', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Handle multi-step form navigation
   */
  async handleMultiStep(page: Page): Promise<boolean> {
    logger.info('Handling LinkedIn multi-step form');

    const maxSteps = 10;
    let currentStep = 0;

    while (currentStep < maxSteps) {
      currentStep++;

      // Check for validation errors
      const hasErrors = await page.locator(this.selectors.errorMessage).count() > 0;
      if (hasErrors) {
        logger.warn('Validation errors detected on current step');
        return false;
      }

      // Check if we're at the review step
      const reviewButton = page.locator(this.selectors.reviewButton);
      if (await reviewButton.isVisible()) {
        logger.info('At review step, clicking review button');
        await reviewButton.click();
        await page.waitForTimeout(1000);
        continue;
      }

      // Check if we're at the submit step
      const submitButton = page.locator(this.selectors.submitButton);
      if (await submitButton.isVisible()) {
        logger.info('At submit step');
        return true;
      }

      // Check for next button
      const nextButton = page.locator(this.selectors.nextButton);
      if (await nextButton.isVisible()) {
        logger.info(`Proceeding to next step (${currentStep})`);
        await nextButton.click();
        await page.waitForTimeout(1000);
        continue;
      }

      // No more buttons found
      logger.debug('No more navigation buttons found');
      break;
    }

    return true;
  }

  /**
   * Login to LinkedIn
   */
  async login(page: Page, credentials: { email: string; password: string }): Promise<boolean> {
    logger.info('Logging into LinkedIn');

    try {
      await page.goto('https://www.linkedin.com/login');
      await page.waitForSelector('#username', { timeout: 10000 });

      await page.fill('#username', credentials.email);
      await page.fill('#password', credentials.password);
      await page.click('button[type="submit"]');

      // Wait for successful login
      await page.waitForSelector('.feed-identity-module, .global-nav__me', { timeout: 30000 });

      logger.info('LinkedIn login successful');
      return true;
    } catch (error) {
      logger.error('LinkedIn login failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Click the Easy Apply button to start the application
   */
  async startApplication(page: Page): Promise<boolean> {
    logger.info('Starting LinkedIn Easy Apply application');

    try {
      // Try primary selector
      let easyApplyButton = page.locator(this.selectors.easyApplyButton);
      
      if (!(await easyApplyButton.isVisible())) {
        // Try alternative selector
        easyApplyButton = page.locator(this.selectors.easyApplyButtonAlt);
      }

      if (await easyApplyButton.isVisible()) {
        await easyApplyButton.click();
        await page.waitForSelector(this.selectors.modal, { timeout: 10000 });
        return true;
      }

      logger.warn('Easy Apply button not found');
      return false;
    } catch (error) {
      logger.error('Failed to start application', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Verify successful submission
   */
  async verifySubmission(page: Page): Promise<boolean> {
    try {
      // Check for success indicators
      const successIndicators = [
        'text="Application submitted"',
        'text="Your application was sent"',
        '.artdeco-modal__header h2:has-text("Application sent")'
      ];

      for (const indicator of successIndicators) {
        if (await page.locator(indicator).isVisible({ timeout: 5000 })) {
          logger.info('Application submitted successfully');
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Close the Easy Apply modal
   */
  async closeModal(page: Page): Promise<void> {
    try {
      const closeButton = page.locator(this.selectors.closeButton);
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    } catch {
      // Ignore errors when closing modal
    }
  }

  /**
   * Extract field information from a LinkedIn form element
   */
  private async extractLinkedInField(
    element: ReturnType<Page['locator']>,
    type: FieldType,
    index: number
  ): Promise<FormField | null> {
    try {
      const id = await element.getAttribute('id') || `linkedin_${type}_${index}`;
      const name = await element.getAttribute('name') || id;
      const ariaLabel = await element.getAttribute('aria-label') || '';
      const placeholder = await element.getAttribute('placeholder') || '';
      const required = await element.getAttribute('required') !== null ||
                       await element.getAttribute('aria-required') === 'true';

      // Try to find label
      let label = '';
      const labelElement = element.page().locator(`label[for="${id}"]`);
      if (await labelElement.count() > 0) {
        label = await labelElement.first().textContent() || '';
      }

      // Fall back to aria-label or placeholder
      if (!label) {
        label = ariaLabel || placeholder || name;
      }

      // Build selector
      let selector = '';
      if (id && id !== `linkedin_${type}_${index}`) {
        selector = `#${id}`;
      } else if (name) {
        selector = `${this.selectors.modal} [name="${name}"]`;
      } else {
        selector = `${this.selectors.modal} ${type === 'textarea' ? 'textarea' : 'input'}[type="${type}"]:nth-of-type(${index + 1})`;
      }

      return {
        id,
        name,
        type,
        label: label.trim(),
        required,
        selector,
        placeholder: placeholder || undefined,
        ariaLabel: ariaLabel || undefined
      };
    } catch {
      return null;
    }
  }

  /**
   * Find the best matching option for a select field
   */
  private async findBestOption(page: Page, field: FormField, value: string): Promise<string | null> {
    if (!field.options || field.options.length === 0) {
      return null;
    }

    const normalizedValue = value.toLowerCase().trim();

    // Exact match
    const exact = field.options.find(opt => 
      opt.toLowerCase().trim() === normalizedValue
    );
    if (exact) return exact;

    // Partial match
    const partial = field.options.find(opt => 
      opt.toLowerCase().includes(normalizedValue) ||
      normalizedValue.includes(opt.toLowerCase())
    );
    if (partial) return partial;

    return null;
  }

  /**
   * Get LinkedIn-specific field labels
   */
  getFieldLabels(): Record<string, string[]> {
    return {
      ...super.getFieldLabels(),
      phone: ['Phone', 'Phone number', 'Mobile phone number'],
      yearsExperience: ['Years of experience', 'How many years of experience'],
      sponsorship: ['Do you require sponsorship', 'Visa sponsorship'],
      workAuthorization: ['Are you legally authorized', 'Work authorization']
    };
  }
}

export default LinkedInEasyApplyAdapter;
