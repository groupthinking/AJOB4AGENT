import { IApplyAgent, TailoredOutput } from './agent.interface';
import { Channel } from 'amqplib';
import { chromium, Browser, Page } from 'playwright';

export class WellfoundApplyAgent implements IApplyAgent {
    payload: TailoredOutput;

    constructor(payload: TailoredOutput) {
        if (!process.env.WELLFOUND_EMAIL || !process.env.WELLFOUND_PASSWORD) {
            throw new Error("Wellfound credentials are not set in environment variables.");
        }
        this.payload = payload;
    }

    async apply(channel: Channel): Promise<void> {
        let browser: Browser | null = null;
        console.log(`[WellfoundAgent] Starting application for ${this.payload.job_url}`);
        try {
            browser = await chromium.launch({ headless: true }); // headless: true for production
            const context = await browser.newContext();
            const page = await context.newPage();
            
            await this.login(page);
            await this.navigateToJob(page);
            await this.fillApplication(page);
            await this.submitApplication(page);

            await this.reportStatus(channel, 'success', 'Application submitted successfully.');
        } catch (error) {
            console.error(`[WellfoundAgent] FAILED to apply for ${this.payload.job_id}:`, error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.reportStatus(channel, 'failure', errorMessage);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    async login(page: Page): Promise<void> {
        console.log('[WellfoundAgent] Navigating to login page...');
        await page.goto('https://wellfound.com/login');

        console.log('[WellfoundAgent] Entering credentials...');
        await page.fill('input[name="user[email]"]', process.env.WELLFOUND_EMAIL!);
        await page.fill('input[name="user[password]"]', process.env.WELLFOUND_PASSWORD!);
        await page.click('input[type="submit"][value="Log in"]');

        console.log('[WellfoundAgent] Waiting for successful login...');
        // Wait for the user's profile avatar to appear in the header as confirmation
        await page.waitForSelector('img[alt="user avatar"]', { timeout: 60000 });
        console.log('[WellfoundAgent] Login successful.');
    }

    async navigateToJob(page: Page): Promise<void> {
        console.log(`[WellfoundAgent] Navigating to job: ${this.payload.job_url}`);
        await page.goto(this.payload.job_url);
        
        console.log('[WellfoundAgent] Waiting for Apply button...');
        // Using a data-test selector is more robust than class names or text
        const applyButton = page.locator('[data-test="JobDetailApplyButton"]');
        await applyButton.waitFor({ state: 'visible', timeout: 30000 });
        await applyButton.click();
        console.log('[WellfoundAgent] Apply flow initiated.');
    }

    async fillApplication(page: Page): Promise<void> {
        console.log('[WellfoundAgent] Filling application form...');
        
        // Wellfound uses a modal for applications
        const modal = page.locator('[data-test="JobApplicationModal"]');
        await modal.waitFor({ state: 'visible', timeout: 20000 });

        // The key part is the note to the hiring manager.
        // We will use our pre-generated outreach message or cover letter.
        const noteTextarea = modal.locator('textarea[name="note"]');
        if (await noteTextarea.isVisible()) {
            console.log('[WellfoundAgent] Found note field. Pasting content...');
            await noteTextarea.fill(this.payload.outreach_message);
        } else {
            console.log('[WellfoundAgent] Note field not found, proceeding without it.');
        }
    }

    async submitApplication(page: Page): Promise<void> {
        console.log('[WellfoundAgent] Locating final submit button...');
        const modal = page.locator('[data-test="JobApplicationModal"]');
        const submitButton = modal.locator('button:has-text("Send application")');

        if (await submitButton.isEnabled()) {
            console.log('[WellfoundAgent] Submitting application...');
            // await submitButton.click(); // UNCOMMENT FOR LIVE SUBMISSION
            console.log('[WellfoundAgent] (SIMULATED) Application Submitted.');
            await page.waitForTimeout(5000); // Wait for confirmation
        } else {
            throw new Error("Could not find or interact with the final submit button on Wellfound.");
        }
    }

    async reportStatus(channel: Channel, status: 'success' | 'failure', details: string): Promise<void> {
        console.log(`[WellfoundAgent] STATUS: ${status} | JOB: ${this.payload.job_id} | DETAILS: ${details}`);
        // TODO: Publish message to channel for real implementation
    }
}