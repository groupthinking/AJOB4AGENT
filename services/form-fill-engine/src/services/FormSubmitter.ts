/**
 * Form Submitter Service
 * Handles form field filling and submission
 */

import { Page } from 'playwright';
import { FormField, FieldMapping, FormFillError } from '../types';
import { createComponentLogger } from '../utils/logger';
import { withRetry } from '../utils/retry';
import { scrollIntoView, waitForElement } from '../utils/browser';

const logger = createComponentLogger('form-submitter');

export interface FillResult {
  field: FormField;
  success: boolean;
  error?: string;
}

export interface SubmitResult {
  success: boolean;
  fillResults: FillResult[];
  errorMessage?: string;
  screenshotBase64?: string;
}

export class FormSubmitter {
  private page: Page;
  private dryRun: boolean;
  private slowMo: number;

  constructor(page: Page, options: { dryRun?: boolean; slowMo?: number } = {}) {
    this.page = page;
    this.dryRun = options.dryRun || false;
    this.slowMo = options.slowMo || 0;
  }

  /**
   * Fill a single form field
   */
  async fillField(mapping: FieldMapping): Promise<FillResult> {
    const { field, value } = mapping;

    if (!value) {
      logger.debug('Skipping field with no value', { fieldId: field.id });
      return {
        field,
        success: true,
        error: 'No value to fill'
      };
    }

    logger.debug('Filling field', { fieldId: field.id, type: field.type, label: field.label });

    try {
      // Wait for element to be visible
      await waitForElement(this.page, field.selector, 5000);

      // Scroll into view
      await scrollIntoView(this.page, field.selector);

      // Small delay for visual effect if slowMo is set
      if (this.slowMo > 0) {
        await this.page.waitForTimeout(this.slowMo);
      }

      // Fill based on field type
      switch (field.type) {
        case 'text':
        case 'email':
        case 'tel':
        case 'number':
        case 'url':
        case 'date':
          await this.fillTextInput(field.selector, value);
          break;

        case 'textarea':
          await this.fillTextarea(field.selector, value);
          break;

        case 'select':
          await this.fillSelect(field, value);
          break;

        case 'checkbox':
          await this.fillCheckbox(field.selector, value);
          break;

        case 'radio':
          await this.fillRadio(field, value);
          break;

        case 'file':
          await this.fillFileInput(field.selector, value);
          break;

        default:
          logger.warn('Unknown field type', { type: field.type, fieldId: field.id });
      }

      logger.debug('Field filled successfully', { fieldId: field.id });

      return {
        field,
        success: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('Failed to fill field', {
        fieldId: field.id,
        type: field.type,
        error: errorMessage
      });

      return {
        field,
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Fill multiple form fields
   */
  async fillFields(mappings: FieldMapping[]): Promise<FillResult[]> {
    logger.info('Filling form fields', { count: mappings.length });

    const results: FillResult[] = [];

    for (const mapping of mappings) {
      const result = await this.fillField(mapping);
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    logger.info('Form filling complete', {
      total: mappings.length,
      success: successCount,
      failed: failCount
    });

    return results;
  }

  /**
   * Submit the form
   */
  async submitForm(submitSelector: string): Promise<boolean> {
    if (this.dryRun) {
      logger.info('Dry run mode - skipping form submission');
      return true;
    }

    logger.info('Submitting form', { selector: submitSelector });

    try {
      // Wait for submit button
      await waitForElement(this.page, submitSelector, 10000);
      await scrollIntoView(this.page, submitSelector);

      // Check if button is enabled
      const button = this.page.locator(submitSelector).first();
      const isDisabled = await button.isDisabled();

      if (isDisabled) {
        throw new FormFillError('Submit button is disabled', 'SUBMIT_DISABLED');
      }

      // Click the submit button
      await withRetry(
        async () => {
          await button.click();
        },
        {
          maxAttempts: 3,
          initialDelay: 500
        }
      );

      // Wait for navigation or confirmation
      await this.page.waitForTimeout(2000);

      logger.info('Form submitted successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Form submission failed', { error: errorMessage });
      throw new FormFillError(`Form submission failed: ${errorMessage}`, 'SUBMIT_FAILED');
    }
  }

  /**
   * Check if form has validation errors
   */
  async hasValidationErrors(): Promise<boolean> {
    const errorSelectors = [
      '.error',
      '.field-error',
      '.validation-error',
      '[role="alert"]',
      '.form-error',
      '.input-error'
    ];

    for (const selector of errorSelectors) {
      const errorCount = await this.page.locator(selector).count();
      if (errorCount > 0) {
        logger.warn('Validation errors detected', { selector });
        return true;
      }
    }

    return false;
  }

  /**
   * Get validation error messages
   */
  async getValidationErrors(): Promise<string[]> {
    const errors: string[] = [];
    const errorSelectors = [
      '.error',
      '.field-error',
      '.validation-error',
      '[role="alert"]',
      '.form-error'
    ];

    for (const selector of errorSelectors) {
      const elements = await this.page.locator(selector).all();
      for (const element of elements) {
        const text = await element.textContent();
        if (text && text.trim()) {
          errors.push(text.trim());
        }
      }
    }

    return errors;
  }

  /**
   * Fill a text input field
   */
  private async fillTextInput(selector: string, value: string): Promise<void> {
    const input = this.page.locator(selector).first();
    await input.clear();
    await input.fill(value);
  }

  /**
   * Fill a textarea field
   */
  private async fillTextarea(selector: string, value: string): Promise<void> {
    const textarea = this.page.locator(selector).first();
    await textarea.clear();
    await textarea.fill(value);
  }

  /**
   * Fill a select dropdown
   */
  private async fillSelect(field: FormField, value: string): Promise<void> {
    const select = this.page.locator(field.selector).first();

    // Try to find the best matching option
    if (field.options && field.options.length > 0) {
      // Try exact match first
      const exactMatch = field.options.find(
        opt => opt.toLowerCase() === value.toLowerCase()
      );

      if (exactMatch) {
        await select.selectOption({ label: exactMatch });
        return;
      }

      // Try partial match
      const partialMatch = field.options.find(
        opt => opt.toLowerCase().includes(value.toLowerCase()) ||
               value.toLowerCase().includes(opt.toLowerCase())
      );

      if (partialMatch) {
        await select.selectOption({ label: partialMatch });
        return;
      }
    }

    // Fall back to selecting by value
    try {
      await select.selectOption(value);
    } catch {
      // Try by label as last resort
      await select.selectOption({ label: value });
    }
  }

  /**
   * Fill a checkbox field
   */
  private async fillCheckbox(selector: string, value: string): Promise<void> {
    const checkbox = this.page.locator(selector).first();
    const shouldCheck = value.toLowerCase() === 'true' ||
                        value.toLowerCase() === 'yes' ||
                        value === '1';

    const isChecked = await checkbox.isChecked();

    if (shouldCheck && !isChecked) {
      await checkbox.check();
    } else if (!shouldCheck && isChecked) {
      await checkbox.uncheck();
    }
  }

  /**
   * Fill a radio button group
   */
  private async fillRadio(field: FormField, value: string): Promise<void> {
    // Try to find the radio option that matches the value
    if (field.options && field.options.length > 0) {
      const matchingOption = field.options.find(
        opt => opt.toLowerCase() === value.toLowerCase() ||
               opt.toLowerCase().includes(value.toLowerCase())
      );

      if (matchingOption) {
        const radio = this.page.locator(`input[type="radio"][value="${matchingOption}"]`).first();
        if (await radio.count() > 0) {
          await radio.check();
          return;
        }
      }
    }

    // Try by value directly
    const name = field.name;
    if (name) {
      const radio = this.page.locator(`input[type="radio"][name="${name}"][value="${value}"]`).first();
      if (await radio.count() > 0) {
        await radio.check();
      }
    }
  }

  /**
   * Fill a file input field
   */
  private async fillFileInput(selector: string, filePath: string): Promise<void> {
    const fileInput = this.page.locator(selector).first();
    await fileInput.setInputFiles(filePath);
  }

  /**
   * Click "Next" button for multi-step forms
   */
  async clickNext(): Promise<boolean> {
    const nextSelectors = [
      'button:has-text("Next")',
      'button:has-text("Continue")',
      'button[aria-label*="next" i]',
      'button[aria-label*="continue" i]',
      '.btn-next',
      '#next-button'
    ];

    for (const selector of nextSelectors) {
      const button = this.page.locator(selector).first();
      if (await button.isVisible() && await button.isEnabled()) {
        await button.click();
        await this.page.waitForTimeout(1000);
        return true;
      }
    }

    return false;
  }

  /**
   * Check if there's a "Next" button visible
   */
  async hasNextButton(): Promise<boolean> {
    const nextSelectors = [
      'button:has-text("Next")',
      'button:has-text("Continue")',
      'button[aria-label*="next" i]'
    ];

    for (const selector of nextSelectors) {
      const button = this.page.locator(selector).first();
      if (await button.isVisible()) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if there's a "Submit" button visible
   */
  async hasSubmitButton(): Promise<boolean> {
    const submitSelectors = [
      'button:has-text("Submit")',
      'button:has-text("Apply")',
      'button[type="submit"]',
      'button[aria-label*="submit" i]'
    ];

    for (const selector of submitSelectors) {
      const button = this.page.locator(selector).first();
      if (await button.isVisible()) {
        return true;
      }
    }

    return false;
  }
}

export default FormSubmitter;
