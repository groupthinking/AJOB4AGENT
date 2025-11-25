import { Page, Locator } from 'playwright';
import { UserProfile } from './user-profile.interface';
import { FormFieldDetector, DetectedField, FormFieldType } from './field-detector';

/**
 * Result of a form fill operation
 */
export interface FormFillResult {
  success: boolean;
  filledFields: FilledFieldResult[];
  skippedFields: SkippedFieldResult[];
  errors: FormFillError[];
  reliabilityScore: number; // 0-1 score indicating fill reliability
  timestamp: Date;
}

export interface FilledFieldResult {
  fieldType: FormFieldType;
  fieldName: string;
  value: string;
  confidence: number;
}

export interface SkippedFieldResult {
  fieldType: FormFieldType;
  fieldName: string;
  reason: string;
}

export interface FormFillError {
  fieldType: FormFieldType;
  fieldName: string;
  error: string;
}

/**
 * Options for form filling
 */
export interface FormFillOptions {
  containerSelector?: string;
  fillHiddenFields?: boolean;
  simulateTyping?: boolean;
  typingDelay?: number;
  skipUnknownFields?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
}

const DEFAULT_OPTIONS: FormFillOptions = {
  fillHiddenFields: false,
  simulateTyping: false,
  typingDelay: 50,
  skipUnknownFields: true,
  retryOnError: true,
  maxRetries: 3,
};

/**
 * FormAutoFill class - Automatically fills form fields based on user profile
 */
export class FormAutoFill {
  private page: Page;
  private fieldDetector: FormFieldDetector;
  private userProfile: UserProfile;
  
  constructor(page: Page, userProfile: UserProfile) {
    this.page = page;
    this.userProfile = userProfile;
    this.fieldDetector = new FormFieldDetector(page);
  }
  
  /**
   * Fill all detected form fields
   */
  async fillForm(options: FormFillOptions = {}): Promise<FormFillResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    const result: FormFillResult = {
      success: true,
      filledFields: [],
      skippedFields: [],
      errors: [],
      reliabilityScore: 0,
      timestamp: new Date(),
    };
    
    try {
      // Detect all form fields
      const detectedFields = await this.fieldDetector.detectFields(opts.containerSelector);
      
      // Filter fields based on options
      const fieldsToFill = detectedFields.filter(f => {
        if (!opts.fillHiddenFields && !f.isVisible) {
          result.skippedFields.push({
            fieldType: f.fieldType,
            fieldName: f.name || f.id,
            reason: 'Field is hidden',
          });
          return false;
        }
        if (opts.skipUnknownFields && f.fieldType === 'unknown') {
          result.skippedFields.push({
            fieldType: f.fieldType,
            fieldName: f.name || f.id,
            reason: 'Unknown field type',
          });
          return false;
        }
        return true;
      });
      
      // Fill each field
      for (const field of fieldsToFill) {
        const fillResult = await this.fillField(field, opts);
        
        if (fillResult.success) {
          result.filledFields.push({
            fieldType: field.fieldType,
            fieldName: field.name || field.id,
            value: fillResult.value || '',
            confidence: field.confidence,
          });
        } else if (fillResult.skipped) {
          result.skippedFields.push({
            fieldType: field.fieldType,
            fieldName: field.name || field.id,
            reason: fillResult.reason || 'No value available',
          });
        } else {
          result.errors.push({
            fieldType: field.fieldType,
            fieldName: field.name || field.id,
            error: fillResult.error || 'Unknown error',
          });
        }
      }
      
      // Calculate reliability score
      result.reliabilityScore = this.calculateReliabilityScore(result, detectedFields);
      result.success = result.errors.length === 0;
      
    } catch (error) {
      result.success = false;
      result.errors.push({
        fieldType: 'unknown',
        fieldName: 'form',
        error: error instanceof Error ? error.message : String(error),
      });
    }
    
    return result;
  }
  
  /**
   * Fill a single field
   */
  private async fillField(
    field: DetectedField,
    options: FormFillOptions
  ): Promise<{ success: boolean; value?: string; skipped?: boolean; reason?: string; error?: string }> {
    const value = this.getValueForField(field.fieldType);
    
    if (value === undefined || value === null) {
      return { success: false, skipped: true, reason: 'No value in user profile' };
    }
    
    // Handle file uploads differently
    if (field.inputType === 'file') {
      return this.handleFileUpload(field, value);
    }
    
    let retries = 0;
    const maxRetries = options.retryOnError ? (options.maxRetries || 3) : 1;
    
    while (retries < maxRetries) {
      try {
        if (options.simulateTyping && field.inputType !== 'select') {
          await field.element.click();
          await field.element.clear();
          await field.element.type(value, { delay: options.typingDelay });
        } else {
          await field.element.fill(value);
        }
        
        return { success: true, value };
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
        // Wait before retry
        await this.page.waitForTimeout(500);
      }
    }
    
    return { success: false, error: 'Max retries exceeded' };
  }
  
  /**
   * Handle file upload fields
   */
  private async handleFileUpload(
    field: DetectedField,
    filePath: string
  ): Promise<{ success: boolean; value?: string; error?: string }> {
    try {
      await field.element.setInputFiles(filePath);
      return { success: true, value: filePath };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  /**
   * Get the value for a field type from the user profile
   */
  getValueForField(fieldType: FormFieldType): string | undefined {
    const profile = this.userProfile;
    
    switch (fieldType) {
      case 'email':
        return profile.email;
      case 'firstName':
        return profile.firstName;
      case 'lastName':
        return profile.lastName;
      case 'fullName':
        return `${profile.firstName} ${profile.lastName}`.trim();
      case 'phone':
        return profile.phone;
      case 'address':
        return profile.address?.street;
      case 'city':
        return profile.address?.city;
      case 'state':
        return profile.address?.state;
      case 'zipCode':
        return profile.address?.zipCode;
      case 'country':
        return profile.address?.country;
      case 'linkedin':
        return profile.links?.find(l => l.type === 'linkedin')?.url;
      case 'github':
        return profile.links?.find(l => l.type === 'github')?.url;
      case 'portfolio':
        return profile.links?.find(l => l.type === 'portfolio')?.url;
      case 'website':
        return profile.links?.find(l => l.type === 'other')?.url;
      case 'resume':
        return profile.resumePath;
      case 'coverLetter':
        return profile.coverLetterTemplate;
      case 'experience':
        return profile.yearsOfExperience?.toString();
      case 'education':
        if (profile.education && profile.education.length > 0) {
          const edu = profile.education[0];
          return `${edu.degree}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''} - ${edu.institution}`;
        }
        return undefined;
      case 'skills':
        return profile.skills?.join(', ');
      case 'salary':
        return profile.desiredSalary;
      case 'startDate':
        return 'Immediately'; // Default value
      case 'workAuthorization':
        return profile.workAuthorization;
      case 'veteranStatus':
        return profile.veteranStatus;
      case 'disabilityStatus':
        return profile.disabilityStatus;
      case 'message':
        return profile.summary;
      default:
        return undefined;
    }
  }
  
  /**
   * Calculate a reliability score for the form fill
   */
  private calculateReliabilityScore(
    result: FormFillResult,
    allFields: DetectedField[]
  ): number {
    if (allFields.length === 0) return 0;
    
    const totalFields = allFields.length;
    const filledFields = result.filledFields.length;
    const errorFields = result.errors.length;
    
    // Base score from fill rate
    const fillRate = filledFields / totalFields;
    
    // Penalty for errors
    const errorPenalty = errorFields / totalFields * 0.5;
    
    // Bonus for high-confidence fills
    const avgConfidence = result.filledFields.length > 0
      ? result.filledFields.reduce((sum, f) => sum + f.confidence, 0) / result.filledFields.length
      : 0;
    
    // Required field coverage - check if critical fields were filled
    const requiredFields = allFields.filter(f => f.required);
    const filledRequired = requiredFields.filter(rf => 
      result.filledFields.some(ff => 
        ff.fieldName === rf.name || ff.fieldName === rf.id
      )
    );
    const requiredCoverage = requiredFields.length > 0
      ? filledRequired.length / requiredFields.length
      : 1;
    
    // Weighted score
    const score = (
      fillRate * 0.4 +
      avgConfidence * 0.2 +
      requiredCoverage * 0.3 -
      errorPenalty
    ) * (1 - errorPenalty);
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Fill specific fields by type
   */
  async fillFieldsByType(
    fieldTypes: FormFieldType[],
    options: FormFillOptions = {}
  ): Promise<FormFillResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const detectedFields = await this.fieldDetector.detectFields(opts.containerSelector);
    
    const filteredFields = detectedFields.filter(f => 
      fieldTypes.includes(f.fieldType)
    );
    
    const result: FormFillResult = {
      success: true,
      filledFields: [],
      skippedFields: [],
      errors: [],
      reliabilityScore: 0,
      timestamp: new Date(),
    };
    
    for (const field of filteredFields) {
      const fillResult = await this.fillField(field, opts);
      
      if (fillResult.success) {
        result.filledFields.push({
          fieldType: field.fieldType,
          fieldName: field.name || field.id,
          value: fillResult.value || '',
          confidence: field.confidence,
        });
      } else if (fillResult.skipped) {
        result.skippedFields.push({
          fieldType: field.fieldType,
          fieldName: field.name || field.id,
          reason: fillResult.reason || 'No value available',
        });
      } else {
        result.errors.push({
          fieldType: field.fieldType,
          fieldName: field.name || field.id,
          error: fillResult.error || 'Unknown error',
        });
      }
    }
    
    result.reliabilityScore = this.calculateReliabilityScore(result, filteredFields);
    result.success = result.errors.length === 0;
    
    return result;
  }
  
  /**
   * Upload multiple files to file input fields
   */
  async uploadFiles(
    fileMapping: Array<{ fieldType: FormFieldType; filePath: string }>,
    containerSelector?: string
  ): Promise<{ success: boolean; results: Array<{ fieldType: FormFieldType; success: boolean; error?: string }> }> {
    const fileFields = await this.fieldDetector.detectFileUploads(containerSelector);
    const results: Array<{ fieldType: FormFieldType; success: boolean; error?: string }> = [];
    
    for (const mapping of fileMapping) {
      const matchingField = fileFields.find(f => f.fieldType === mapping.fieldType);
      
      if (!matchingField) {
        results.push({
          fieldType: mapping.fieldType,
          success: false,
          error: `No file upload field found for type: ${mapping.fieldType}`,
        });
        continue;
      }
      
      const uploadResult = await this.handleFileUpload(matchingField, mapping.filePath);
      results.push({
        fieldType: mapping.fieldType,
        success: uploadResult.success,
        error: uploadResult.error,
      });
    }
    
    return {
      success: results.every(r => r.success),
      results,
    };
  }
}
