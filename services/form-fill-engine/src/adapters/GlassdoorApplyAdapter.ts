/**
 * Glassdoor Apply Adapter
 * Handles Glassdoor job application flow
 */

import { Page } from 'playwright';
import { FormField, AdapterCapabilities, FieldType } from '../types';
import { BaseFormAdapter } from './BaseFormAdapter';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('glassdoor-adapter');

export class GlassdoorApplyAdapter extends BaseFormAdapter {
  readonly platform = 'glassdoor';

  readonly capabilities: AdapterCapabilities = {
    supportsMultiStep: true,
    supportsFileUpload: true,
    supportsScreenshot: true,
    requiresLogin: true,
    platformName: 'Glassdoor',
    platformUrl: 'https://www.glassdoor.com'
  };

  // Glassdoor-specific selectors
  private readonly selectors = {
    applyButton: '#PrimaryApplyButton',
    applyButtonAlt: '[data-test="apply-button"]',
    modal: '[data-test="application-modal"]',
    modalAlt: '.modal-content',
    formContainer: '.application-form',
    nextButton: '[data-test="next-button"]',
    submitButton: '[data-test="submit-application"]',
    submitButtonAlt: 'button:has-text("Submit")',
    fileInput: 'input[type="file"]',
    resumeUpload: '#resume-upload',
    errorMessage: '.field-error',
    successMessage: '.application-success'
  };

  /**
   * Check if URL is a Glassdoor job page
   */
  isApplyPage(url: string): boolean {
    return url.includes('glassdoor.com/job-listing/') ||
           url.includes('glassdoor.com/Jobs/');
  }

  /**
   * Detect form fields in the Glassdoor application modal
   */
  async detectForm(page: Page): Promise<FormField[]> {
    logger.info('Detecting Glassdoor application form fields');

    const fields: FormField[] = [];

    // Wait for modal or form to be visible
    try {
      await page.waitForSelector(`${this.selectors.modal}, ${this.selectors.modalAlt}, ${this.selectors.formContainer}`, {
        timeout: 10000
      });
    } catch {
      logger.warn('Application form not found');
      return fields;
    }

    const formContainer = await this.getFormContainer(page);
    if (!formContainer) {
      return fields;
    }

    // Detect text inputs
    const textInputs = await page.locator(`${formContainer} input[type="text"]`).all();
    for (let i = 0; i < textInputs.length; i++) {
      const input = textInputs[i];
      const field = await this.extractGlassdoorField(input, 'text', i, formContainer);
      if (field) fields.push(field);
    }

    // Detect email inputs
    const emailInputs = await page.locator(`${formContainer} input[type="email"]`).all();
    for (let i = 0; i < emailInputs.length; i++) {
      const input = emailInputs[i];
      const field = await this.extractGlassdoorField(input, 'email', i, formContainer);
      if (field) fields.push(field);
    }

    // Detect phone inputs
    const phoneInputs = await page.locator(`${formContainer} input[type="tel"]`).all();
    for (let i = 0; i < phoneInputs.length; i++) {
      const input = phoneInputs[i];
      const field = await this.extractGlassdoorField(input, 'tel', i, formContainer);
      if (field) fields.push(field);
    }

    // Detect textareas
    const textareas = await page.locator(`${formContainer} textarea`).all();
    for (let i = 0; i < textareas.length; i++) {
      const textarea = textareas[i];
      const field = await this.extractGlassdoorField(textarea, 'textarea', i, formContainer);
      if (field) fields.push(field);
    }

    // Detect select dropdowns
    const selects = await page.locator(`${formContainer} select`).all();
    for (let i = 0; i < selects.length; i++) {
      const select = selects[i];
      const field = await this.extractGlassdoorField(select, 'select', i, formContainer);
      if (field) {
        const options = await select.locator('option').allTextContents();
        field.options = options.filter(opt => opt.trim() !== '');
        fields.push(field);
      }
    }

    // Detect file inputs
    const fileInputs = await page.locator(`${formContainer} input[type="file"]`).all();
    for (let i = 0; i < fileInputs.length; i++) {
      fields.push({
        id: `glassdoor_file_${i}`,
        name: 'resume',
        type: 'file',
        label: 'Resume/CV',
        required: true,
        selector: `${formContainer} input[type="file"]:nth-of-type(${i + 1})`
      });
    }

    // Detect checkboxes
    const checkboxes = await page.locator(`${formContainer} input[type="checkbox"]`).all();
    for (let i = 0; i < checkboxes.length; i++) {
      const checkbox = checkboxes[i];
      const field = await this.extractGlassdoorField(checkbox, 'checkbox', i, formContainer);
      if (field) fields.push(field);
    }

    logger.info('Field detection complete', { fieldCount: fields.length });
    return fields;
  }

  /**
   * Fill a field in the Glassdoor application form
   */
  async fillField(page: Page, field: FormField, value: string): Promise<boolean> {
    logger.debug('Filling Glassdoor field', { fieldId: field.id, type: field.type });

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
          const matchedOption = this.findBestOption(field.options || [], value);
          if (matchedOption) {
            await element.selectOption({ label: matchedOption });
          } else {
            await element.selectOption(value);
          }
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

      await page.waitForTimeout(200);
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
   * Submit the Glassdoor application form
   */
  async submitForm(page: Page): Promise<boolean> {
    logger.info('Submitting Glassdoor application form');

    try {
      // Try primary submit button
      let submitButton = page.locator(this.selectors.submitButton);
      
      if (!(await submitButton.isVisible())) {
        submitButton = page.locator(this.selectors.submitButtonAlt);
      }

      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        
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
    logger.info('Handling Glassdoor multi-step form');

    const maxSteps = 10;
    let currentStep = 0;

    while (currentStep < maxSteps) {
      currentStep++;

      // Check for validation errors
      const hasErrors = await page.locator(this.selectors.errorMessage).count() > 0;
      if (hasErrors) {
        logger.warn('Validation errors detected');
        return false;
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

      break;
    }

    return true;
  }

  /**
   * Login to Glassdoor
   */
  async login(page: Page, credentials: { email: string; password: string }): Promise<boolean> {
    logger.info('Logging into Glassdoor');

    try {
      await page.goto('https://www.glassdoor.com/profile/login_input.htm');
      
      // Wait for login form
      await page.waitForSelector('input[name="username"], input[type="email"]', { timeout: 10000 });

      // Fill credentials
      const emailInput = page.locator('input[name="username"], input[type="email"]').first();
      await emailInput.fill(credentials.email);

      const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
      await passwordInput.fill(credentials.password);

      // Click submit
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Wait for successful login
      await page.waitForTimeout(3000);

      // Check if login was successful
      const isLoggedIn = await page.locator('.account-menu, [data-test="account-menu"]').isVisible();
      
      if (isLoggedIn) {
        logger.info('Glassdoor login successful');
        return true;
      }

      logger.warn('Login may have failed - no account menu found');
      return false;
    } catch (error) {
      logger.error('Glassdoor login failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Start the application process
   */
  async startApplication(page: Page): Promise<boolean> {
    logger.info('Starting Glassdoor application');

    try {
      // Try primary apply button
      let applyButton = page.locator(this.selectors.applyButton);
      
      if (!(await applyButton.isVisible())) {
        applyButton = page.locator(this.selectors.applyButtonAlt);
      }

      if (await applyButton.isVisible()) {
        await applyButton.click();
        
        // Wait for modal or redirect
        await page.waitForTimeout(2000);
        
        // Check if modal appeared
        const modalVisible = await page.locator(`${this.selectors.modal}, ${this.selectors.modalAlt}`).isVisible();
        
        return modalVisible;
      }

      logger.warn('Apply button not found');
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
      const successIndicators = [
        this.selectors.successMessage,
        'text="Application submitted"',
        'text="Thank you for applying"',
        'text="Application sent"'
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
   * Check if this is an external application (redirects to company ATS)
   */
  async isExternalApplication(page: Page): Promise<boolean> {
    // Check if clicking apply redirects to an external site
    const currentUrl = page.url();
    return !currentUrl.includes('glassdoor.com');
  }

  /**
   * Get the form container selector
   */
  private async getFormContainer(page: Page): Promise<string | null> {
    const containers = [
      this.selectors.modal,
      this.selectors.modalAlt,
      this.selectors.formContainer
    ];

    for (const container of containers) {
      if (await page.locator(container).isVisible()) {
        return container;
      }
    }

    return null;
  }

  /**
   * Extract field information from a Glassdoor form element
   */
  private async extractGlassdoorField(
    element: ReturnType<Page['locator']>,
    type: FieldType,
    index: number,
    formContainer: string
  ): Promise<FormField | null> {
    try {
      const id = await element.getAttribute('id') || `glassdoor_${type}_${index}`;
      const name = await element.getAttribute('name') || id;
      const ariaLabel = await element.getAttribute('aria-label') || '';
      const placeholder = await element.getAttribute('placeholder') || '';
      const required = await element.getAttribute('required') !== null;

      // Try to find label
      let label = '';
      const labelElement = element.page().locator(`label[for="${id}"]`);
      if (await labelElement.count() > 0) {
        label = await labelElement.first().textContent() || '';
      }

      if (!label) {
        label = ariaLabel || placeholder || name;
      }

      // Build selector
      let selector = '';
      if (id && id !== `glassdoor_${type}_${index}`) {
        selector = `#${id}`;
      } else if (name) {
        selector = `${formContainer} [name="${name}"]`;
      } else {
        const tagName = type === 'textarea' ? 'textarea' : 'input';
        selector = `${formContainer} ${tagName}[type="${type}"]:nth-of-type(${index + 1})`;
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
  private findBestOption(options: string[], value: string): string | null {
    if (options.length === 0) return null;

    const normalizedValue = value.toLowerCase().trim();

    // Exact match
    const exact = options.find(opt => 
      opt.toLowerCase().trim() === normalizedValue
    );
    if (exact) return exact;

    // Partial match
    const partial = options.find(opt => 
      opt.toLowerCase().includes(normalizedValue) ||
      normalizedValue.includes(opt.toLowerCase())
    );
    if (partial) return partial;

    return null;
  }

  /**
   * Get Glassdoor-specific field labels
   */
  getFieldLabels(): Record<string, string[]> {
    return {
      ...super.getFieldLabels(),
      currentCompany: ['Current Company', 'Current Employer'],
      currentTitle: ['Current Title', 'Current Position'],
      yearsExperience: ['Years of Experience', 'Total Experience'],
      salaryExpectation: ['Expected Salary', 'Salary Expectation', 'Desired Salary']
    };
  }
}

export default GlassdoorApplyAdapter;
