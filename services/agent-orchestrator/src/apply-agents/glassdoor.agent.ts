import { IApplyAgent, TailoredOutput } from './agent.interface';
import { Page } from 'playwright';

export class GlassdoorApplyAgent implements IApplyAgent {
    payload: TailoredOutput;

    constructor(payload: TailoredOutput) {
        this.payload = payload;
    }

    async apply(): Promise<void> {
        console.log(`[GlassdoorAgent] Starting application for ${this.payload.job_url}`);
        // Full browser lifecycle management will be implemented here
    }

    async login(page: Page): Promise<void> {
        console.log('[GlassdoorAgent] Logging in...');
        // Key Selector Differences:
        // - Glassdoor uses a login modal.
        // - Selectors are likely `input[name="username"]` and `input[name="password"]`.
        // - The submit button might be `button[data-test="login-submit"]`.
        // - Must handle potential CAPTCHAs or social login prompts.
    }

    async navigateToJob(page: Page): Promise<void> {
        console.log(`[GlassdoorAgent] Navigating to job: ${this.payload.job_url}`);
        await page.goto(this.payload.job_url);
        // Key Selector/Flow Differences:
        // - The button is often labeled "Easy Apply" but can be just "Apply".
        // - CRITICAL: We must detect if clicking the button opens a Glassdoor modal
        //   OR redirects to an external Applicant Tracking System (ATS) like Greenhouse or Lever.
        // - An `isExternalRedirect` check is necessary. If external, this agent might
        //   have to terminate and hand off to a different type of agent.
        const applyButton = page.locator('#PrimaryApplyButton');
        await applyButton.click();
    }

    async fillApplication(page: Page): Promise<void> {
        console.log('[GlassdoorAgent] Filling application form...');
        // Key Selector Differences:
        // - The modal container will have a unique selector, e.g., `div[data-test="application-modal"]`.
        // - Form fields will have different IDs/names (`#resume-upload`, `textarea[name="coverLetter"]`).
        // - The multi-step process, if it exists, will have different "Next" buttons.
        // - The logic must be robust enough to handle single-page and multi-page forms.
    }

    async submitApplication(page: Page): Promise<void> {
        console.log('[GlassdoorAgent] Submitting application...');
        // Key Selector Differences:
        // - Final submit button will have a selector like `button[data-test="submit-application"]`.
    }

    async reportStatus(status: 'success' | 'failure', details: string): Promise<void> {
        console.log(`[GlassdoorAgent] STATUS: ${status} | JOB: ${this.payload.job_id} | DETAILS: ${details}`);
    }
}