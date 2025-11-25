import { Page, Locator } from 'playwright';
import {
  IPlatformAdapter,
  DetectedField,
  InputType,
  FormFillLogger,
} from '../types';
import { FieldMappingService } from '../field-mapping/FieldMappingService';
import { createDefaultLogger } from '../utils/DefaultLogger';

/**
 * Base implementation for platform adapters with common functionality
 */
export abstract class BasePlatformAdapter implements IPlatformAdapter {
  abstract readonly platformName: string;
  protected fieldMapper: FieldMappingService;
  protected logger: FormFillLogger;

  constructor(fieldMapper: FieldMappingService, logger?: FormFillLogger) {
    this.fieldMapper = fieldMapper;
    this.logger = logger || createDefaultLogger('BasePlatformAdapter');
  }

  abstract isOnPlatform(page: Page): Promise<boolean>;
  abstract detectApplicationForm(page: Page): Promise<boolean>;
  abstract navigateToNextStep(page: Page): Promise<boolean>;
  abstract submitApplication(page: Page): Promise<boolean>;
  abstract isApplicationComplete(page: Page): Promise<boolean>;

  /**
   * Common field detection logic
   */
  async detectFields(page: Page): Promise<DetectedField[]> {
    const fields: DetectedField[] = [];

    // Detect text inputs
    const textInputs = await this.detectTextInputs(page);
    fields.push(...textInputs);

    // Detect textareas
    const textareas = await this.detectTextareas(page);
    fields.push(...textareas);

    // Detect select dropdowns
    const selects = await this.detectSelects(page);
    fields.push(...selects);

    // Detect file inputs
    const fileInputs = await this.detectFileInputs(page);
    fields.push(...fileInputs);

    // Detect checkboxes and radio buttons
    const checkboxRadios = await this.detectCheckboxRadio(page);
    fields.push(...checkboxRadios);

    return fields;
  }

  /**
   * Detect text input fields
   */
  protected async detectTextInputs(page: Page): Promise<DetectedField[]> {
    const fields: DetectedField[] = [];
    const inputs = page.locator('input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input[type="number"]:not([hidden])');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      if (await input.isVisible()) {
        const field = await this.extractFieldInfo(input, page);
        if (field) {
          fields.push(field);
        }
      }
    }

    return fields;
  }

  /**
   * Detect textarea fields
   */
  protected async detectTextareas(page: Page): Promise<DetectedField[]> {
    const fields: DetectedField[] = [];
    const textareas = page.locator('textarea:not([hidden])');
    const count = await textareas.count();

    for (let i = 0; i < count; i++) {
      const textarea = textareas.nth(i);
      if (await textarea.isVisible()) {
        const field = await this.extractFieldInfo(textarea, page);
        if (field) {
          field.inputType = 'textarea';
          fields.push(field);
        }
      }
    }

    return fields;
  }

  /**
   * Detect select dropdown fields
   */
  protected async detectSelects(page: Page): Promise<DetectedField[]> {
    const fields: DetectedField[] = [];
    const selects = page.locator('select:not([hidden])');
    const count = await selects.count();

    for (let i = 0; i < count; i++) {
      const select = selects.nth(i);
      if (await select.isVisible()) {
        const field = await this.extractFieldInfo(select, page);
        if (field) {
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

    return fields;
  }

  /**
   * Detect file upload inputs
   */
  protected async detectFileInputs(page: Page): Promise<DetectedField[]> {
    const fields: DetectedField[] = [];
    const fileInputs = page.locator('input[type="file"]');
    const count = await fileInputs.count();

    for (let i = 0; i < count; i++) {
      const input = fileInputs.nth(i);
      // File inputs are often hidden, check parent for visibility
      const field = await this.extractFieldInfo(input, page);
      if (field) {
        field.inputType = 'file';
        field.fieldType = 'resume'; // Assume file uploads are for resume
        fields.push(field);
      }
    }

    return fields;
  }

  /**
   * Detect checkbox and radio button fields
   */
  protected async detectCheckboxRadio(page: Page): Promise<DetectedField[]> {
    const fields: DetectedField[] = [];
    const inputs = page.locator('input[type="checkbox"], input[type="radio"]');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      if (await input.isVisible()) {
        const type = await input.getAttribute('type');
        const field = await this.extractFieldInfo(input, page);
        if (field) {
          field.inputType = type === 'checkbox' ? 'checkbox' : 'radio';
          fields.push(field);
        }
      }
    }

    return fields;
  }

  /**
   * Extract field information from a DOM element
   */
  protected async extractFieldInfo(element: Locator, page: Page): Promise<DetectedField | null> {
    try {
      const id = await element.getAttribute('id');
      const name = await element.getAttribute('name');
      const placeholder = await element.getAttribute('placeholder');
      const ariaLabel = await element.getAttribute('aria-label');
      const type = await element.getAttribute('type');
      const required = await element.getAttribute('required') !== null;

      // Try to find associated label
      let label = '';
      if (id) {
        const labelElement = page.locator(`label[for="${id}"]`);
        if (await labelElement.count() > 0) {
          label = (await labelElement.first().textContent()) || '';
        }
      }

      // If no label found, look for parent or sibling label
      if (!label) {
        const parentLabel = element.locator('xpath=ancestor::label');
        if (await parentLabel.count() > 0) {
          label = (await parentLabel.first().textContent()) || '';
        }
      }

      // If still no label, use placeholder or aria-label
      if (!label) {
        label = ariaLabel || placeholder || name || id || '';
      }

      // Determine input type
      const inputType = this.mapInputType(type || 'text');

      // Detect field type using field mapper
      const { fieldType, confidence } = this.fieldMapper.detectFieldTypeLocal(
        label,
        placeholder || undefined,
        name || undefined,
        id || undefined,
        ariaLabel || undefined,
        inputType
      );

      return {
        element,
        fieldType,
        inputType,
        label: label.trim(),
        placeholder: placeholder || undefined,
        name: name || undefined,
        id: id || undefined,
        required,
        ariaLabel: ariaLabel || undefined,
        confidenceScore: confidence,
      };
    } catch (error) {
      this.logger.warn('Failed to extract field info', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }

  /**
   * Map HTML input type to our InputType
   */
  protected mapInputType(type: string): InputType {
    const typeMap: Record<string, InputType> = {
      text: 'text',
      email: 'email',
      tel: 'tel',
      url: 'url',
      number: 'number',
      file: 'file',
      date: 'date',
      checkbox: 'checkbox',
      radio: 'radio',
    };
    return typeMap[type] || 'text';
  }

  /**
   * Fill a field with value
   */
  async fillField(page: Page, field: DetectedField, value: string): Promise<boolean> {
    try {
      const { element, inputType } = field;

      switch (inputType) {
        case 'text':
        case 'email':
        case 'tel':
        case 'url':
        case 'number':
        case 'textarea':
          await element.fill(value);
          return true;

        case 'select':
          await element.selectOption({ label: value });
          return true;

        case 'checkbox':
          if (value === 'true' || value === 'yes') {
            await element.check();
          } else {
            await element.uncheck();
          }
          return true;

        case 'radio':
          await element.check();
          return true;

        case 'date':
          await element.fill(value);
          return true;

        default:
          this.logger.warn(`Unknown input type: ${inputType}`);
          return false;
      }
    } catch (error) {
      this.logger.error('Failed to fill field', {
        fieldType: field.fieldType,
        label: field.label,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Upload resume file
   */
  async uploadResume(page: Page, resumePath: string): Promise<boolean> {
    try {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(resumePath);
      return true;
    } catch (error) {
      this.logger.error('Failed to upload resume', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Handle common popups (cookie consent, etc.)
   */
  async handlePopups(page: Page): Promise<void> {
    // Try to close common popup patterns
    const popupSelectors = [
      'button:has-text("Accept")',
      'button:has-text("Accept all")',
      'button:has-text("Close")',
      '[aria-label="Close"]',
      '.modal-close',
      '[data-dismiss="modal"]',
    ];

    for (const selector of popupSelectors) {
      try {
        const popup = page.locator(selector).first();
        if (await popup.isVisible({ timeout: 1000 })) {
          await popup.click();
          await page.waitForTimeout(500);
        }
      } catch {
        // Ignore - popup not present
      }
    }
  }

  /**
   * Simulate human-like typing delay
   */
  protected async simulateTypingDelay(minMs: number = 50, maxMs: number = 150): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Type text with human-like delays
   */
  protected async typeWithDelay(
    element: Locator,
    text: string,
    minDelay: number = 30,
    maxDelay: number = 100
  ): Promise<void> {
    for (const char of text) {
      await element.type(char, { delay: Math.random() * (maxDelay - minDelay) + minDelay });
    }
  }
}
