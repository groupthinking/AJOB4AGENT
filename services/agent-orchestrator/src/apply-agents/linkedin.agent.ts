import { IApplyAgent, TailoredOutput } from './agent.interface';
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';
import { Channel } from 'amqplib';

export class LinkedInApplyAgent implements IApplyAgent {
    payload: TailoredOutput;
    private tempResumePath: string;

    constructor(payload: TailoredOutput) {
        if (!process.env.LINKEDIN_EMAIL || !process.env.LINKEDIN_PASSWORD) {
            throw new Error("LinkedIn credentials are not set in environment variables.");
        }
        this.payload = payload;
        // Define a path for the temporary resume file
        this.tempResumePath = path.join(tmpdir(), `resume_${this.payload.job_id}.txt`);
    }

    private async createTempResumeFile(): Promise<void> {
        await fs.writeFile(this.tempResumePath, this.payload.tailored_resume);
    }

    private async cleanupTempResumeFile(): Promise<void> {
        try {
            await fs.unlink(this.tempResumePath);
        } catch (error) {
            // Ignore errors if file doesn't exist
            if (error && typeof error === 'object' && 'code' in error && (error as any).code !== 'ENOENT') {
                console.error(`[LinkedInAgent] Failed to clean up temp file: ${this.tempResumePath}`, error);
            }
        }
    }

    async apply(channel: Channel): Promise<void> {
        let browser: Browser | null = null;
        console.log(`[LinkedInAgent] Starting application for ${this.payload.job_url}`);
        try {
            await this.createTempResumeFile();
            browser = await chromium.launch({ headless: true }); // headless: true for production
            const context = await browser.newContext();
            const page = await context.newPage();
            
            await this.login(page);
            await this.navigateToJob(page);
            await this.fillApplication(page);
            await this.submitApplication(page);

            await this.reportStatus(channel, 'success', 'Application submitted successfully via Easy Apply.');
        } catch (error) {
            console.error(`[LinkedInAgent] FAILED to apply for ${this.payload.job_id}:`, error);
            await this.reportStatus(channel, 'failure', error instanceof Error ? error.message : String(error));
        } finally {
            if (browser) {
                await browser.close();
            }
            await this.cleanupTempResumeFile();
        }
    }

    async login(page: Page): Promise<void> {
        // ... (implementation from previous step)
        console.log('[LinkedInAgent] Navigating to login page...');
        await page.goto('https://www.linkedin.com/login');
        console.log('[LinkedInAgent] Entering credentials...');
        await page.fill('#username', process.env.LINKEDIN_EMAIL!);
        await page.fill('#password', process.env.LINKEDIN_PASSWORD!);
        await page.click('button[type="submit"]');
        console.log('[LinkedInAgent] Waiting for successful login...');
        await page.waitForSelector('div.feed-identity-module', { timeout: 60000 });
        console.log('[LinkedInAgent] Login successful.');
    }

    async navigateToJob(page: Page): Promise<void> {
        // ... (implementation from previous step)
        console.log(`[LinkedInAgent] Navigating to job: ${this.payload.job_url}`);
        await page.goto(this.payload.job_url);
        console.log('[LinkedInAgent] Waiting for Easy Apply button...');
        const easyApplyButton = page.locator('button:has-text("Easy Apply")').first();
        await easyApplyButton.waitFor({ state: 'visible', timeout: 30000 });
        await easyApplyButton.click();
        console.log('[LinkedInAgent] Easy Apply flow initiated.');
    }

    async fillApplication(page: Page): Promise<void> {
        console.log('[LinkedInAgent] Starting to fill multi-step application...');
        
        // The Easy Apply modal is often within a specific container
        const modal = page.locator('.jobs-easy-apply-modal');

        // Loop through the application steps until we see the "Review" or "Submit" button
        for (let i = 0; i < 10; i++) { // Max 10 steps to prevent infinite loops
            const nextButton = modal.locator('button:has-text("Next")');
            const reviewButton = modal.locator('button:has-text("Review")');
            const submitButton = modal.locator('button:has-text("Submit application")');

            // Handle Resume Upload
            const uploadInput = modal.locator('input[type="file"]');
            if (await uploadInput.isVisible()) {
                console.log('[LinkedInAgent] Found resume upload input. Uploading tailored resume...');
                await uploadInput.setInputFiles(this.tempResumePath);
                await page.waitForTimeout(2000); // Wait for upload to process
            }

            // Handle Cover Letter
            const coverLetterTextarea = modal.locator('textarea[aria-label="Cover letter"]');
            if (await coverLetterTextarea.isVisible()) {
                console.log('[LinkedInAgent] Found cover letter field. Pasting content...');
                await coverLetterTextarea.fill(this.payload.cover_letter);
            }

            // Decide whether to continue or break
            if (await submitButton.isVisible()) {
                console.log('[LinkedInAgent] Reached final submission step.');
                break;
            }
            if (await reviewButton.isVisible()) {
                console.log('[LinkedInAgent] Reached review step. Clicking to proceed to final submission.');
                await reviewButton.click();
                await page.waitForTimeout(2000); // Wait for final page to load
                break;
            }
            if (await nextButton.isVisible()) {
                console.log(`[LinkedInAgent] Proceeding to next step... (Step ${i + 1})`);
                await nextButton.click();
                await page.waitForTimeout(2000); // Wait for next step to load
            } else {
                console.log('[LinkedInAgent] No more "Next" or "Review" buttons found. Assuming end of form.');
                break;
            }
        }
    }

    async submitApplication(page: Page): Promise<void> {
        console.log('[LinkedInAgent] Locating final submit button...');
        const modal = page.locator('.jobs-easy-apply-modal');
        const submitButton = modal.locator('button:has-text("Submit application")');

        if (await submitButton.isEnabled()) {
            console.log('[LinkedInAgent] Submitting application...');
            // await submitButton.click(); // UNCOMMENT FOR LIVE SUBMISSION
            console.log('[LinkedInAgent] (SIMULATED) Application Submitted.');
            await page.waitForTimeout(5000); // Wait for confirmation dialog
        } else {
            throw new Error("Could not find or interact with the final submit button.");
        }
    }

    async reportStatus(channel: Channel, status: 'success' | 'failure', details: string): Promise<void> {
        // ... (implementation from previous step)
        console.log(`[LinkedInAgent] STATUS: ${status} | JOB: ${this.payload.job_id} | DETAILS: ${details}`);
    }
}