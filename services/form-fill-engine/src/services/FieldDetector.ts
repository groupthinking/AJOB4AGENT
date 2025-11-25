/**
 * Field Detector Service
 * Detects form fields on a web page using Playwright
 */

import { Page } from 'playwright';
import { FormField, DetectedForm, FieldType } from '../types';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('field-detector');

/**
 * Common field patterns for matching labels to field types
 */
const FIELD_PATTERNS: Record<string, RegExp[]> = {
  email: [/email/i, /e-mail/i, /correo/i],
  phone: [/phone/i, /tel(?:ephone)?/i, /mobile/i, /cell/i, /número/i],
  firstName: [/first\s*name/i, /given\s*name/i, /nombre/i, /^name$/i],
  lastName: [/last\s*name/i, /surname/i, /family\s*name/i, /apellido/i],
  fullName: [/full\s*name/i, /your\s*name/i, /name/i],
  location: [/location/i, /city/i, /address/i, /zip/i, /postal/i],
  linkedin: [/linkedin/i, /linked\s*in/i],
  github: [/github/i, /git\s*hub/i],
  portfolio: [/portfolio/i, /website/i, /personal\s*site/i],
  resume: [/resume/i, /cv/i, /curriculum/i],
  coverLetter: [/cover\s*letter/i, /letter/i, /motivation/i],
  salary: [/salary/i, /compensation/i, /pay/i, /wage/i],
  startDate: [/start\s*date/i, /availability/i, /when.*start/i, /available/i],
  experience: [/experience/i, /years/i, /work\s*history/i],
  education: [/education/i, /degree/i, /university/i, /school/i],
  skills: [/skills/i, /technologies/i, /expertise/i],
  authorization: [/authorization/i, /authorized/i, /visa/i, /work\s*permit/i],
  sponsorship: [/sponsorship/i, /sponsor/i, /visa\s*support/i],
  relocate: [/relocate/i, /relocation/i, /willing.*move/i]
};

export class FieldDetector {
  private platform: string;

  constructor(platform: string = 'generic') {
    this.platform = platform;
  }

  /**
   * Detect all form fields on a page
   */
  async detectFields(page: Page): Promise<FormField[]> {
    logger.info('Detecting form fields', { platform: this.platform });

    const fields: FormField[] = [];

    // Detect text inputs
    const textInputs = await this.detectTextInputs(page);
    fields.push(...textInputs);

    // Detect email inputs
    const emailInputs = await this.detectEmailInputs(page);
    fields.push(...emailInputs);

    // Detect phone inputs
    const phoneInputs = await this.detectPhoneInputs(page);
    fields.push(...phoneInputs);

    // Detect select elements
    const selects = await this.detectSelectElements(page);
    fields.push(...selects);

    // Detect textareas
    const textareas = await this.detectTextareas(page);
    fields.push(...textareas);

    // Detect checkboxes
    const checkboxes = await this.detectCheckboxes(page);
    fields.push(...checkboxes);

    // Detect radio buttons
    const radios = await this.detectRadioButtons(page);
    fields.push(...radios);

    // Detect file inputs
    const fileInputs = await this.detectFileInputs(page);
    fields.push(...fileInputs);

    logger.info('Field detection complete', {
      totalFields: fields.length,
      byType: this.countFieldsByType(fields)
    });

    return fields;
  }

  /**
   * Detect full form structure including submission elements
   */
  async detectForm(page: Page): Promise<DetectedForm> {
    const fields = await this.detectFields(page);
    const formSelector = await this.findFormContainer(page);
    const submitSelector = await this.findSubmitButton(page);
    const { isMultiStep, currentStep, totalSteps } = await this.detectMultiStepInfo(page);

    return {
      fields,
      formSelector,
      submitSelector,
      platform: this.platform,
      url: page.url(),
      isMultiStep,
      currentStep,
      totalSteps
    };
  }

  /**
   * Detect text input fields
   */
  private async detectTextInputs(page: Page): Promise<FormField[]> {
    const fields: FormField[] = [];
    const inputs = await page.locator('input[type="text"], input:not([type])').all();

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      try {
        const isVisible = await input.isVisible();
        if (!isVisible) continue;

        const field = await this.extractFieldInfo(input, 'text', i);
        if (field) fields.push(field);
      } catch (error) {
        logger.debug('Error processing text input', { index: i, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return fields;
  }

  /**
   * Detect email input fields
   */
  private async detectEmailInputs(page: Page): Promise<FormField[]> {
    const fields: FormField[] = [];
    const inputs = await page.locator('input[type="email"]').all();

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      try {
        const isVisible = await input.isVisible();
        if (!isVisible) continue;

        const field = await this.extractFieldInfo(input, 'email', i);
        if (field) fields.push(field);
      } catch (error) {
        logger.debug('Error processing email input', { index: i, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return fields;
  }

  /**
   * Detect phone input fields
   */
  private async detectPhoneInputs(page: Page): Promise<FormField[]> {
    const fields: FormField[] = [];
    const inputs = await page.locator('input[type="tel"]').all();

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      try {
        const isVisible = await input.isVisible();
        if (!isVisible) continue;

        const field = await this.extractFieldInfo(input, 'tel', i);
        if (field) fields.push(field);
      } catch (error) {
        logger.debug('Error processing tel input', { index: i, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return fields;
  }

  /**
   * Detect select elements
   */
  private async detectSelectElements(page: Page): Promise<FormField[]> {
    const fields: FormField[] = [];
    const selects = await page.locator('select').all();

    for (let i = 0; i < selects.length; i++) {
      const select = selects[i];
      try {
        const isVisible = await select.isVisible();
        if (!isVisible) continue;

        const field = await this.extractFieldInfo(select, 'select', i);
        if (field) {
          // Extract options
          const options = await select.locator('option').allTextContents();
          field.options = options.filter(opt => opt.trim() !== '');
          fields.push(field);
        }
      } catch (error) {
        logger.debug('Error processing select', { index: i, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return fields;
  }

  /**
   * Detect textarea elements
   */
  private async detectTextareas(page: Page): Promise<FormField[]> {
    const fields: FormField[] = [];
    const textareas = await page.locator('textarea').all();

    for (let i = 0; i < textareas.length; i++) {
      const textarea = textareas[i];
      try {
        const isVisible = await textarea.isVisible();
        if (!isVisible) continue;

        const field = await this.extractFieldInfo(textarea, 'textarea', i);
        if (field) fields.push(field);
      } catch (error) {
        logger.debug('Error processing textarea', { index: i, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return fields;
  }

  /**
   * Detect checkbox elements
   */
  private async detectCheckboxes(page: Page): Promise<FormField[]> {
    const fields: FormField[] = [];
    const checkboxes = await page.locator('input[type="checkbox"]').all();

    for (let i = 0; i < checkboxes.length; i++) {
      const checkbox = checkboxes[i];
      try {
        const isVisible = await checkbox.isVisible();
        if (!isVisible) continue;

        const field = await this.extractFieldInfo(checkbox, 'checkbox', i);
        if (field) fields.push(field);
      } catch (error) {
        logger.debug('Error processing checkbox', { index: i, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return fields;
  }

  /**
   * Detect radio button elements
   */
  private async detectRadioButtons(page: Page): Promise<FormField[]> {
    const fields: FormField[] = [];
    const radios = await page.locator('input[type="radio"]').all();
    const processedNames = new Set<string>();

    for (let i = 0; i < radios.length; i++) {
      const radio = radios[i];
      try {
        const isVisible = await radio.isVisible();
        if (!isVisible) continue;

        const name = await radio.getAttribute('name');
        if (name && processedNames.has(name)) continue;
        if (name) processedNames.add(name);

        const field = await this.extractFieldInfo(radio, 'radio', i);
        if (field) {
          // Get all options for this radio group
          if (name) {
            const groupRadios = await page.locator(`input[type="radio"][name="${name}"]`).all();
            const options: string[] = [];
            for (const r of groupRadios) {
              const value = await r.getAttribute('value');
              if (value) options.push(value);
            }
            field.options = options;
          }
          fields.push(field);
        }
      } catch (error) {
        logger.debug('Error processing radio', { index: i, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return fields;
  }

  /**
   * Detect file input elements
   */
  private async detectFileInputs(page: Page): Promise<FormField[]> {
    const fields: FormField[] = [];
    const fileInputs = await page.locator('input[type="file"]').all();

    for (let i = 0; i < fileInputs.length; i++) {
      const fileInput = fileInputs[i];
      try {
        // File inputs are often hidden, so we check if they exist in the DOM
        const field = await this.extractFieldInfo(fileInput, 'file', i);
        if (field) fields.push(field);
      } catch (error) {
        logger.debug('Error processing file input', { index: i, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return fields;
  }

  /**
   * Extract field information from an element
   */
  private async extractFieldInfo(
    element: ReturnType<Page['locator']>,
    type: FieldType,
    index: number
  ): Promise<FormField | null> {
    try {
      const id = await element.getAttribute('id') || `field_${type}_${index}`;
      const name = await element.getAttribute('name') || id;
      const placeholder = await element.getAttribute('placeholder') || '';
      const ariaLabel = await element.getAttribute('aria-label') || '';
      const required = await element.getAttribute('required') !== null ||
                       await element.getAttribute('aria-required') === 'true';

      // Try to find associated label
      let label = '';
      if (id) {
        const labelElement = element.page().locator(`label[for="${id}"]`);
        if (await labelElement.count() > 0) {
          label = await labelElement.first().textContent() || '';
        }
      }

      // Fall back to aria-label or placeholder
      if (!label) {
        label = ariaLabel || placeholder || name;
      }

      // Build a CSS selector for the field
      let selector = '';
      const elementId = await element.getAttribute('id');
      const elementName = await element.getAttribute('name');
      
      if (elementId) {
        selector = `#${elementId}`;
      } else if (elementName) {
        selector = `[name="${elementName}"]`;
      } else {
        selector = `${type === 'textarea' ? 'textarea' : 'input'}[type="${type}"]:nth-of-type(${index + 1})`;
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
    } catch (error) {
      logger.debug('Error extracting field info', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Find the main form container on the page
   */
  private async findFormContainer(page: Page): Promise<string> {
    // Try common form selectors
    const formSelectors = [
      'form[action*="apply"]',
      'form.application-form',
      'form.job-application',
      '.jobs-easy-apply-modal',
      '.application-modal',
      'form[method="post"]',
      'form'
    ];

    for (const selector of formSelectors) {
      const form = page.locator(selector).first();
      if (await form.count() > 0) {
        return selector;
      }
    }

    return 'body';
  }

  /**
   * Find the submit button on the page
   */
  private async findSubmitButton(page: Page): Promise<string | undefined> {
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Apply")',
      'button:has-text("Send")',
      'input[type="submit"]',
      'button[aria-label*="submit" i]',
      'button[aria-label*="apply" i]'
    ];

    for (const selector of submitSelectors) {
      const button = page.locator(selector).first();
      if (await button.count() > 0 && await button.isVisible()) {
        return selector;
      }
    }

    return undefined;
  }

  /**
   * Detect if form is multi-step and current progress
   */
  private async detectMultiStepInfo(page: Page): Promise<{
    isMultiStep: boolean;
    currentStep?: number;
    totalSteps?: number;
  }> {
    // Look for step indicators
    const stepIndicators = await page.locator('.step-indicator, .progress-step, [data-step], .wizard-step').all();
    
    if (stepIndicators.length > 1) {
      // Try to find active step
      const activeStep = await page.locator('.step-indicator.active, .progress-step.current, [data-step].active').count();
      return {
        isMultiStep: true,
        currentStep: activeStep > 0 ? activeStep : 1,
        totalSteps: stepIndicators.length
      };
    }

    // Check for "Next" button which indicates multi-step
    const nextButton = await page.locator('button:has-text("Next"), button:has-text("Continue")').count();
    if (nextButton > 0) {
      return { isMultiStep: true };
    }

    return { isMultiStep: false };
  }

  /**
   * Identify the semantic meaning of a field based on its label
   */
  identifyFieldSemantics(label: string): string | null {
    const normalizedLabel = label.toLowerCase().trim();

    for (const [semanticType, patterns] of Object.entries(FIELD_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(normalizedLabel)) {
          return semanticType;
        }
      }
    }

    return null;
  }

  /**
   * Count fields by type
   */
  private countFieldsByType(fields: FormField[]): Record<string, number> {
    return fields.reduce((acc, field) => {
      acc[field.type] = (acc[field.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

export default FieldDetector;
