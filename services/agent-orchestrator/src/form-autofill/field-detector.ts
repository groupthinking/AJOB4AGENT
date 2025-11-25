import { Page, Locator } from 'playwright';

/**
 * Represents a detected form field with metadata
 */
export interface DetectedField {
  element: Locator;
  fieldType: FormFieldType;
  inputType: string; // HTML input type
  name: string;
  id: string;
  label: string;
  placeholder: string;
  required: boolean;
  isVisible: boolean;
  confidence: number; // 0-1 confidence score for field type detection
  autocomplete?: string; // HTML autocomplete attribute
  ariaLabel?: string;
}

/**
 * Common form field types we support
 */
export type FormFieldType = 
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'fullName'
  | 'phone'
  | 'address'
  | 'city'
  | 'state'
  | 'zipCode'
  | 'country'
  | 'linkedin'
  | 'github'
  | 'portfolio'
  | 'website'
  | 'resume'
  | 'coverLetter'
  | 'experience'
  | 'education'
  | 'skills'
  | 'salary'
  | 'startDate'
  | 'workAuthorization'
  | 'sponsorship'
  | 'veteranStatus'
  | 'disabilityStatus'
  | 'gender'
  | 'ethnicity'
  | 'message'
  | 'unknown';

/**
 * Field detection patterns - maps field types to regex patterns
 */
const FIELD_PATTERNS: Record<FormFieldType, RegExp[]> = {
  email: [
    /email/i,
    /e-mail/i,
    /emailaddress/i,
  ],
  firstName: [
    /first[_\-\s]?name/i,
    /fname/i,
    /given[_\-\s]?name/i,
  ],
  lastName: [
    /last[_\-\s]?name/i,
    /lname/i,
    /surname/i,
    /family[_\-\s]?name/i,
  ],
  fullName: [
    /full[_\-\s]?name/i,
    /^name$/i,
    /your[_\-\s]?name/i,
  ],
  phone: [
    /phone/i,
    /mobile/i,
    /telephone/i,
    /tel/i,
    /cell/i,
  ],
  address: [
    /address/i,
    /street/i,
  ],
  city: [
    /city/i,
    /town/i,
  ],
  state: [
    /state/i,
    /province/i,
    /region/i,
  ],
  zipCode: [
    /zip/i,
    /postal/i,
    /postcode/i,
  ],
  country: [
    /country/i,
    /nation/i,
  ],
  linkedin: [
    /linkedin/i,
  ],
  github: [
    /github/i,
  ],
  portfolio: [
    /portfolio/i,
    /work[_\-\s]?samples/i,
  ],
  website: [
    /website/i,
    /url/i,
    /personal[_\-\s]?site/i,
  ],
  resume: [
    /resume/i,
    /cv/i,
    /curriculum/i,
  ],
  coverLetter: [
    /cover[_\-\s]?letter/i,
  ],
  experience: [
    /experience/i,
    /years/i,
    /work[_\-\s]?history/i,
  ],
  education: [
    /education/i,
    /degree/i,
    /university/i,
    /school/i,
  ],
  skills: [
    /skills/i,
    /technologies/i,
    /expertise/i,
  ],
  salary: [
    /salary/i,
    /compensation/i,
    /pay/i,
    /wage/i,
  ],
  startDate: [
    /start[_\-\s]?date/i,
    /available/i,
    /availability/i,
    /when[_\-\s]?can[_\-\s]?you/i,
  ],
  workAuthorization: [
    /work[_\-\s]?auth/i,
    /legally[_\-\s]?authorized/i,
    /authorized[_\-\s]?to[_\-\s]?work/i,
  ],
  sponsorship: [
    /sponsor/i,
    /visa/i,
  ],
  veteranStatus: [
    /veteran/i,
    /military/i,
  ],
  disabilityStatus: [
    /disability/i,
    /disabled/i,
  ],
  gender: [
    /gender/i,
    /sex/i,
  ],
  ethnicity: [
    /ethnicity/i,
    /race/i,
  ],
  message: [
    /message/i,
    /note/i,
    /comment/i,
    /additional[_\-\s]?info/i,
  ],
  unknown: [],
};

/**
 * Autocomplete attribute mappings to field types
 */
const AUTOCOMPLETE_MAPPINGS: Record<string, FormFieldType> = {
  'email': 'email',
  'given-name': 'firstName',
  'family-name': 'lastName',
  'name': 'fullName',
  'tel': 'phone',
  'tel-national': 'phone',
  'street-address': 'address',
  'address-line1': 'address',
  'address-level2': 'city',
  'address-level1': 'state',
  'postal-code': 'zipCode',
  'country': 'country',
  'country-name': 'country',
  'url': 'website',
};

/**
 * FormFieldDetector class for detecting and classifying form fields
 */
export class FormFieldDetector {
  private page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * Detect all form fields within a container or the entire page
   */
  async detectFields(containerSelector?: string): Promise<DetectedField[]> {
    const container = containerSelector 
      ? this.page.locator(containerSelector) 
      : this.page.locator('body');
    
    const detectedFields: DetectedField[] = [];
    
    // Find all input, textarea, and select elements
    const inputSelectors = [
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
      'textarea',
      'select',
    ];
    
    for (const selector of inputSelectors) {
      const elements = container.locator(selector);
      const count = await elements.count();
      
      for (let i = 0; i < count; i++) {
        const element = elements.nth(i);
        const field = await this.analyzeField(element);
        if (field) {
          detectedFields.push(field);
        }
      }
    }
    
    return detectedFields;
  }
  
  /**
   * Analyze a single form field element
   */
  async analyzeField(element: Locator): Promise<DetectedField | null> {
    try {
      const isVisible = await element.isVisible();
      
      // Get element attributes
      const attributes = await element.evaluate((el) => ({
        tagName: el.tagName.toLowerCase(),
        type: (el as HTMLInputElement).type || '',
        name: el.getAttribute('name') || '',
        id: el.getAttribute('id') || '',
        placeholder: el.getAttribute('placeholder') || '',
        required: el.hasAttribute('required'),
        autocomplete: el.getAttribute('autocomplete') || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        ariaLabelledBy: el.getAttribute('aria-labelledby') || '',
      }));
      
      // Get associated label text
      const labelText = await this.getFieldLabel(element, attributes.id);
      
      // Determine field type
      const { fieldType, confidence } = this.classifyField(
        attributes.name,
        attributes.id,
        labelText,
        attributes.placeholder,
        attributes.autocomplete,
        attributes.ariaLabel,
        attributes.type
      );
      
      return {
        element,
        fieldType,
        inputType: attributes.type || attributes.tagName,
        name: attributes.name,
        id: attributes.id,
        label: labelText,
        placeholder: attributes.placeholder,
        required: attributes.required,
        isVisible,
        confidence,
        autocomplete: attributes.autocomplete || undefined,
        ariaLabel: attributes.ariaLabel || undefined,
      };
    } catch {
      return null;
    }
  }
  
  /**
   * Get the label text for a field
   */
  private async getFieldLabel(element: Locator, fieldId: string): Promise<string> {
    try {
      // Try to find label by for attribute
      if (fieldId) {
        const label = this.page.locator(`label[for="${fieldId}"]`);
        if (await label.count() > 0) {
          return await label.first().innerText();
        }
      }
      
      // Try to find parent label
      const parentLabel = element.locator('xpath=ancestor::label');
      if (await parentLabel.count() > 0) {
        return await parentLabel.first().innerText();
      }
      
      // Try to find preceding label
      const precedingLabel = element.locator('xpath=preceding-sibling::label[1]');
      if (await precedingLabel.count() > 0) {
        return await precedingLabel.first().innerText();
      }
      
      return '';
    } catch {
      return '';
    }
  }
  
  /**
   * Classify a field based on its attributes
   */
  classifyField(
    name: string,
    id: string,
    label: string,
    placeholder: string,
    autocomplete: string,
    ariaLabel: string,
    inputType: string
  ): { fieldType: FormFieldType; confidence: number } {
    // Check autocomplete attribute first (highest reliability)
    if (autocomplete && AUTOCOMPLETE_MAPPINGS[autocomplete]) {
      return {
        fieldType: AUTOCOMPLETE_MAPPINGS[autocomplete],
        confidence: 1.0,
      };
    }
    
    // Check input type for file uploads
    if (inputType === 'file') {
      // Check if it's specifically for resume or cover letter
      const combinedText = `${name} ${id} ${label} ${placeholder} ${ariaLabel}`.toLowerCase();
      if (/resume|cv|curriculum/i.test(combinedText)) {
        return { fieldType: 'resume', confidence: 0.9 };
      }
      if (/cover/i.test(combinedText)) {
        return { fieldType: 'coverLetter', confidence: 0.9 };
      }
    }
    
    // Check input type for email
    if (inputType === 'email') {
      return { fieldType: 'email', confidence: 0.95 };
    }
    
    // Check input type for phone
    if (inputType === 'tel') {
      return { fieldType: 'phone', confidence: 0.95 };
    }
    
    // Combine all text sources for pattern matching
    const textSources = [
      { text: name, weight: 0.8 },
      { text: id, weight: 0.7 },
      { text: label, weight: 0.9 },
      { text: placeholder, weight: 0.6 },
      { text: ariaLabel, weight: 0.8 },
    ];
    
    let bestMatch: { fieldType: FormFieldType; confidence: number } = {
      fieldType: 'unknown',
      confidence: 0,
    };
    
    // Check each field type pattern
    for (const [fieldType, patterns] of Object.entries(FIELD_PATTERNS) as [FormFieldType, RegExp[]][]) {
      if (fieldType === 'unknown') continue;
      
      for (const source of textSources) {
        if (!source.text) continue;
        
        for (const pattern of patterns) {
          if (pattern.test(source.text)) {
            const confidence = source.weight;
            if (confidence > bestMatch.confidence) {
              bestMatch = { fieldType, confidence };
            }
          }
        }
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Detect file upload fields
   */
  async detectFileUploads(containerSelector?: string): Promise<DetectedField[]> {
    const allFields = await this.detectFields(containerSelector);
    return allFields.filter(f => f.inputType === 'file');
  }
  
  /**
   * Get a summary of detected fields
   */
  async getFieldSummary(containerSelector?: string): Promise<Record<FormFieldType, number>> {
    const fields = await this.detectFields(containerSelector);
    const summary: Record<string, number> = {};
    
    for (const field of fields) {
      summary[field.fieldType] = (summary[field.fieldType] || 0) + 1;
    }
    
    return summary as Record<FormFieldType, number>;
  }
}
