import { Page } from 'playwright';
import {
  ApplicationAutomation,
  ApplicationConfig,
  ApplicationResult,
  SubmissionResult,
} from '../form-autofill';
import { FormFillResult } from '../form-autofill/form-autofill';

/**
 * LinkedIn-specific application automation
 * Handles LinkedIn Easy Apply forms
 */
export class LinkedInApplicationAutomation extends ApplicationAutomation {
  // LinkedIn-specific selectors
  private static readonly SELECTORS = {
    easyApplyButton: 'button:has-text("Easy Apply")',
    modalContainer: '.jobs-easy-apply-modal',
    nextButton: 'button:has-text("Next")',
    reviewButton: 'button:has-text("Review")',
    submitButton: 'button:has-text("Submit application")',
    closeButton: 'button[aria-label="Dismiss"]',
    fileInput: 'input[type="file"]',
    resumeUpload: 'input[type="file"][id*="resume"], input[type="file"][name*="resume"]',
    coverLetterTextarea: 'textarea[aria-label="Cover letter"], textarea[name*="cover"]',
    successMessage: '.artdeco-inline-feedback--success',
    errorMessage: '.artdeco-inline-feedback--error',
    formStep: '.jobs-easy-apply-content',
    requiredMarker: '.fb-dash-form-element__error-text',
    // Additional field selectors
    phoneInput: 'input[id*="phone"], input[name*="phone"]',
    experienceFields: 'select[id*="experience"], select[name*="experience"]',
    questionFields: 'input[type="text"], input[type="number"], textarea, select',
  };
  
  private readonly MAX_FORM_STEPS = 10;
  
  constructor(page: Page, config: ApplicationConfig) {
    super(page, config);
  }
  
  /**
   * Get the form container selector
   */
  protected getFormContainerSelector(): string {
    return LinkedInApplicationAutomation.SELECTORS.modalContainer;
  }
  
  /**
   * Execute the LinkedIn Easy Apply application
   */
  protected async executeApplication(jobUrl: string): Promise<{
    success: boolean;
    formFillResult?: FormFillResult;
    submissionResult?: SubmissionResult;
  }> {
    // Navigate to job URL
    await this.page.goto(jobUrl, { waitUntil: 'networkidle' });
    
    // Click Easy Apply button
    const easyApplyClicked = await this.clickEasyApply();
    if (!easyApplyClicked) {
      return {
        success: false,
        submissionResult: {
          submitted: false,
          confirmationMessage: 'Could not find or click Easy Apply button',
        },
      };
    }
    
    // Wait for modal to appear
    const modalFound = await this.waitForElement(
      LinkedInApplicationAutomation.SELECTORS.modalContainer,
      10000
    );
    if (!modalFound) {
      return {
        success: false,
        submissionResult: {
          submitted: false,
          confirmationMessage: 'Easy Apply modal did not appear',
        },
      };
    }
    
    // Process form steps
    const formResult = await this.processFormSteps();
    
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
   * Click the Easy Apply button
   */
  private async clickEasyApply(): Promise<boolean> {
    try {
      const easyApplyButton = this.page.locator(
        LinkedInApplicationAutomation.SELECTORS.easyApplyButton
      ).first();
      
      await easyApplyButton.waitFor({ state: 'visible', timeout: 10000 });
      await easyApplyButton.click();
      await this.page.waitForTimeout(1000);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Process multi-step form
   */
  private async processFormSteps(): Promise<FormFillResult> {
    const modal = this.page.locator(LinkedInApplicationAutomation.SELECTORS.modalContainer);
    let allFilledFields: FormFillResult['filledFields'] = [];
    let allSkippedFields: FormFillResult['skippedFields'] = [];
    let allErrors: FormFillResult['errors'] = [];
    
    for (let step = 0; step < this.MAX_FORM_STEPS; step++) {
      // Fill the current step
      const stepResult = await this.fillCurrentStep();
      allFilledFields = [...allFilledFields, ...stepResult.filledFields];
      allSkippedFields = [...allSkippedFields, ...stepResult.skippedFields];
      allErrors = [...allErrors, ...stepResult.errors];
      
      // Check for navigation buttons
      const submitButton = modal.locator(LinkedInApplicationAutomation.SELECTORS.submitButton);
      const reviewButton = modal.locator(LinkedInApplicationAutomation.SELECTORS.reviewButton);
      const nextButton = modal.locator(LinkedInApplicationAutomation.SELECTORS.nextButton);
      
      // If submit button is visible, we're at the final step
      if (await submitButton.isVisible()) {
        break;
      }
      
      // If review button is visible, click it to go to final step
      if (await reviewButton.isVisible()) {
        await reviewButton.click();
        await this.page.waitForTimeout(1000);
        break;
      }
      
      // If next button is visible, click it to proceed
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await this.page.waitForTimeout(1000);
      } else {
        // No more navigation buttons, we're done with form steps
        break;
      }
    }
    
    // Calculate overall reliability score
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
   * Fill the current form step
   */
  private async fillCurrentStep(): Promise<FormFillResult> {
    // First, handle resume upload if present
    await this.handleResumeUpload();
    
    // Handle cover letter if present
    await this.handleCoverLetter();
    
    // Use auto-fill for other fields
    const formResult = await this.formAutoFill.fillForm({
      containerSelector: LinkedInApplicationAutomation.SELECTORS.formStep,
      skipUnknownFields: false, // Try to fill all fields
      simulateTyping: true,
      typingDelay: 30,
    });
    
    return formResult;
  }
  
  /**
   * Handle resume upload
   */
  private async handleResumeUpload(): Promise<void> {
    const modal = this.page.locator(LinkedInApplicationAutomation.SELECTORS.modalContainer);
    const fileInput = modal.locator(LinkedInApplicationAutomation.SELECTORS.fileInput);
    
    try {
      if (await fileInput.count() > 0 && this.config.tailoredResumePath) {
        const firstInput = fileInput.first();
        if (await firstInput.isVisible()) {
          await firstInput.setInputFiles(this.config.tailoredResumePath);
          await this.page.waitForTimeout(1000); // Wait for upload processing
        }
      }
    } catch {
      // Resume upload failed, continue with form
    }
  }
  
  /**
   * Handle cover letter textarea
   */
  private async handleCoverLetter(): Promise<void> {
    const modal = this.page.locator(LinkedInApplicationAutomation.SELECTORS.modalContainer);
    const coverLetterField = modal.locator(LinkedInApplicationAutomation.SELECTORS.coverLetterTextarea);
    
    try {
      if (await coverLetterField.isVisible() && this.config.tailoredCoverLetter) {
        await coverLetterField.fill(this.config.tailoredCoverLetter);
      }
    } catch {
      // Cover letter fill failed, continue with form
    }
  }
  
  /**
   * Submit the application
   */
  private async submitApplication(): Promise<{ submitted: boolean; message: string }> {
    const modal = this.page.locator(LinkedInApplicationAutomation.SELECTORS.modalContainer);
    const submitButton = modal.locator(LinkedInApplicationAutomation.SELECTORS.submitButton);
    
    try {
      if (await submitButton.isVisible() && await submitButton.isEnabled()) {
        await submitButton.click();
        await this.page.waitForTimeout(3000);
        
        // Check for success message
        const successMessage = this.page.locator(LinkedInApplicationAutomation.SELECTORS.successMessage);
        if (await successMessage.isVisible()) {
          return {
            submitted: true,
            message: 'Application submitted successfully',
          };
        }
        
        // Check for error message
        const errorMessage = this.page.locator(LinkedInApplicationAutomation.SELECTORS.errorMessage);
        if (await errorMessage.isVisible()) {
          const errorText = await errorMessage.textContent();
          return {
            submitted: false,
            message: `Submission error: ${errorText}`,
          };
        }
        
        // Assume success if no error visible
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
 * Apply to a LinkedIn job using the automation
 */
export async function applyToLinkedInJob(
  page: Page,
  config: ApplicationConfig,
  jobId: string,
  jobUrl: string
): Promise<ApplicationResult> {
  const automation = new LinkedInApplicationAutomation(page, config);
  return automation.applyWithRetries(jobId, jobUrl, 'linkedin');
}
