import { Page } from 'playwright';
import {
  ApplicationAutomation,
  ApplicationConfig,
  ApplicationResult,
  SubmissionResult,
} from '../form-autofill';
import { FormFillResult } from '../form-autofill/form-autofill';

/**
 * Glassdoor-specific application automation
 * Handles Glassdoor's "Easy Apply" and standard application forms
 */
export class GlassdoorApplicationAutomation extends ApplicationAutomation {
  // Glassdoor-specific selectors
  private static readonly SELECTORS = {
    applyButton: '#PrimaryApplyButton, button[data-test="apply-button"], button:has-text("Apply")',
    easyApplyButton: 'button[data-test="easy-apply-button"], button:has-text("Easy Apply")',
    modalContainer: '[data-test="application-modal"], .application-modal, .modal-container',
    formContainer: 'form[data-test="application-form"], .application-form',
    nextButton: 'button[data-test="next"], button:has-text("Next"), button:has-text("Continue")',
    submitButton: 'button[data-test="submit-application"], button:has-text("Submit"), button[type="submit"]',
    closeButton: 'button[data-test="modal-close"], button[aria-label="Close"]',
    fileInput: 'input[type="file"]',
    resumeUpload: 'input[type="file"][data-test*="resume"], input[type="file"][id*="resume"]',
    coverLetterUpload: 'input[type="file"][data-test*="cover"], input[type="file"][id*="cover"]',
    coverLetterTextarea: 'textarea[data-test*="cover"], textarea[id*="cover"], textarea[name*="cover"]',
    successMessage: '.success-message, [data-test="application-success"]',
    errorMessage: '.error-message, [data-test="application-error"]',
    // Form field selectors
    emailInput: 'input[type="email"], input[name*="email"], input[id*="email"]',
    nameInput: 'input[name*="name"], input[id*="name"]',
    phoneInput: 'input[type="tel"], input[name*="phone"], input[id*="phone"]',
    linkedinInput: 'input[name*="linkedin"], input[id*="linkedin"]',
    // External redirect detection
    externalRedirectIndicator: 'a[href*="greenhouse"], a[href*="lever"], a[href*="workday"]',
  };
  
  private readonly MAX_FORM_STEPS = 8;
  
  constructor(page: Page, config: ApplicationConfig) {
    super(page, config);
  }
  
  /**
   * Get the form container selector
   */
  protected getFormContainerSelector(): string {
    return GlassdoorApplicationAutomation.SELECTORS.modalContainer;
  }
  
  /**
   * Execute the Glassdoor application
   */
  protected async executeApplication(jobUrl: string): Promise<{
    success: boolean;
    formFillResult?: FormFillResult;
    submissionResult?: SubmissionResult;
  }> {
    // Navigate to job URL
    await this.page.goto(jobUrl, { waitUntil: 'networkidle' });
    
    // Check if this redirects to an external ATS
    const isExternal = await this.checkExternalRedirect();
    if (isExternal) {
      return {
        success: false,
        submissionResult: {
          submitted: false,
          confirmationMessage: 'Job redirects to external ATS - requires manual application',
        },
      };
    }
    
    // Click Apply button (Easy Apply or regular)
    const applyClicked = await this.clickApplyButton();
    if (!applyClicked) {
      return {
        success: false,
        submissionResult: {
          submitted: false,
          confirmationMessage: 'Could not find or click Apply button',
        },
      };
    }
    
    // Wait for form to appear
    const formFound = await this.waitForForm();
    if (!formFound) {
      return {
        success: false,
        submissionResult: {
          submitted: false,
          confirmationMessage: 'Application form did not appear',
        },
      };
    }
    
    // Process form
    const formResult = await this.processForm();
    
    // Submit if not in simulated mode
    let submitted = false;
    let confirmationMessage = '';
    
    if (!this.config.simulatedMode) {
      const submitResult = await this.submitApplication();
      submitted = submitResult.submitted;
      confirmationMessage = submitResult.message;
    } else {
      confirmationMessage = 'Application form filled (simulated mode - not submitted)';
    }
    
    return {
      success: submitted || this.config.simulatedMode === true,
      formFillResult: formResult,
      submissionResult: {
        submitted,
        confirmationMessage,
      },
    };
  }
  
  /**
   * Check if the job redirects to an external ATS
   */
  private async checkExternalRedirect(): Promise<boolean> {
    try {
      const externalLink = this.page.locator(
        GlassdoorApplicationAutomation.SELECTORS.externalRedirectIndicator
      );
      return await externalLink.count() > 0;
    } catch {
      return false;
    }
  }
  
  /**
   * Click the Apply button
   */
  private async clickApplyButton(): Promise<boolean> {
    try {
      // First try Easy Apply
      const easyApplyButton = this.page.locator(
        GlassdoorApplicationAutomation.SELECTORS.easyApplyButton
      ).first();
      
      if (await easyApplyButton.isVisible()) {
        await easyApplyButton.click();
        await this.page.waitForTimeout(1000);
        return true;
      }
      
      // Fallback to regular Apply button
      const applyButton = this.page.locator(
        GlassdoorApplicationAutomation.SELECTORS.applyButton
      ).first();
      
      await applyButton.waitFor({ state: 'visible', timeout: 10000 });
      await applyButton.click();
      await this.page.waitForTimeout(1000);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Wait for application form
   */
  private async waitForForm(): Promise<boolean> {
    // Try modal container first
    const modalFound = await this.waitForElement(
      GlassdoorApplicationAutomation.SELECTORS.modalContainer,
      5000
    );
    if (modalFound) return true;
    
    // Try form container
    const formFound = await this.waitForElement(
      GlassdoorApplicationAutomation.SELECTORS.formContainer,
      5000
    );
    return formFound;
  }
  
  /**
   * Process the application form
   */
  private async processForm(): Promise<FormFillResult> {
    let allFilledFields: FormFillResult['filledFields'] = [];
    let allSkippedFields: FormFillResult['skippedFields'] = [];
    let allErrors: FormFillResult['errors'] = [];
    
    for (let step = 0; step < this.MAX_FORM_STEPS; step++) {
      // Handle file uploads first
      await this.handleFileUploads();
      
      // Fill form fields
      const containerSelector = await this.getActiveContainerSelector();
      const stepResult = await this.formAutoFill.fillForm({
        containerSelector,
        skipUnknownFields: false,
        simulateTyping: true,
        typingDelay: 25,
      });
      
      allFilledFields = [...allFilledFields, ...stepResult.filledFields];
      allSkippedFields = [...allSkippedFields, ...stepResult.skippedFields];
      allErrors = [...allErrors, ...stepResult.errors];
      
      // Check for navigation buttons
      const submitButton = this.page.locator(GlassdoorApplicationAutomation.SELECTORS.submitButton);
      const nextButton = this.page.locator(GlassdoorApplicationAutomation.SELECTORS.nextButton);
      
      // If submit button is visible, we're at the final step
      if (await submitButton.isVisible()) {
        break;
      }
      
      // If next button is visible, click it to proceed
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await this.page.waitForTimeout(1000);
      } else {
        // No more navigation buttons
        break;
      }
    }
    
    // Calculate reliability score
    const totalFields = allFilledFields.length + allSkippedFields.length + allErrors.length;
    const reliabilityScore = totalFields > 0
      ? allFilledFields.length / totalFields
      : 0;
    
    return {
      success: allErrors.length === 0,
      filledFields: allFilledFields,
      skippedFields: allSkippedFields,
      errors: allErrors,
      reliabilityScore,
      timestamp: new Date(),
    };
  }
  
  /**
   * Get the active form container selector
   */
  private async getActiveContainerSelector(): Promise<string | undefined> {
    const modalSelector = GlassdoorApplicationAutomation.SELECTORS.modalContainer;
    const formSelector = GlassdoorApplicationAutomation.SELECTORS.formContainer;
    
    if (await this.isModalPresent(modalSelector)) {
      return modalSelector;
    }
    
    const form = this.page.locator(formSelector);
    if (await form.isVisible()) {
      return formSelector;
    }
    
    return undefined;
  }
  
  /**
   * Handle file uploads (resume, cover letter)
   */
  private async handleFileUploads(): Promise<void> {
    // Upload resume
    if (this.config.tailoredResumePath) {
      await this.uploadFile(
        GlassdoorApplicationAutomation.SELECTORS.resumeUpload,
        this.config.tailoredResumePath
      );
      
      // Also try generic file input
      await this.uploadFile(
        GlassdoorApplicationAutomation.SELECTORS.fileInput,
        this.config.tailoredResumePath
      );
    }
    
    // Handle cover letter textarea if present
    if (this.config.tailoredCoverLetter) {
      await this.fillCoverLetter();
    }
  }
  
  /**
   * Upload a file to a file input
   */
  private async uploadFile(selector: string, filePath: string): Promise<boolean> {
    try {
      const fileInput = this.page.locator(selector).first();
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles(filePath);
        await this.page.waitForTimeout(500);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
  
  /**
   * Fill cover letter textarea
   */
  private async fillCoverLetter(): Promise<void> {
    try {
      const coverLetterField = this.page.locator(
        GlassdoorApplicationAutomation.SELECTORS.coverLetterTextarea
      ).first();
      
      if (await coverLetterField.isVisible()) {
        await coverLetterField.fill(this.config.tailoredCoverLetter || '');
      }
    } catch {
      // Cover letter fill failed
    }
  }
  
  /**
   * Submit the application
   */
  private async submitApplication(): Promise<{ submitted: boolean; message: string }> {
    try {
      const submitButton = this.page.locator(
        GlassdoorApplicationAutomation.SELECTORS.submitButton
      ).first();
      
      if (await submitButton.isVisible() && await submitButton.isEnabled()) {
        await submitButton.click();
        await this.page.waitForTimeout(3000);
        
        // Check for success
        const successMessage = this.page.locator(
          GlassdoorApplicationAutomation.SELECTORS.successMessage
        );
        if (await successMessage.isVisible()) {
          return {
            submitted: true,
            message: 'Application submitted successfully',
          };
        }
        
        // Check for error
        const errorMessage = this.page.locator(
          GlassdoorApplicationAutomation.SELECTORS.errorMessage
        );
        if (await errorMessage.isVisible()) {
          const errorText = await errorMessage.textContent();
          return {
            submitted: false,
            message: `Submission error: ${errorText}`,
          };
        }
        
        return {
          submitted: true,
          message: 'Application submitted (confirmation pending)',
        };
      }
      
      return {
        submitted: false,
        message: 'Submit button not available',
      };
    } catch (error) {
      return {
        submitted: false,
        message: error instanceof Error ? error.message : 'Unknown submission error',
      };
    }
  }
}

/**
 * Apply to a Glassdoor job using the automation
 */
export async function applyToGlassdoorJob(
  page: Page,
  config: ApplicationConfig,
  jobId: string,
  jobUrl: string
): Promise<ApplicationResult> {
  const automation = new GlassdoorApplicationAutomation(page, config);
  return automation.applyWithRetries(jobId, jobUrl, 'glassdoor');
}
