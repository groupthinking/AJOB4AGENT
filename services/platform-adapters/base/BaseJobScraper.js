"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseJobScraper = void 0;
const playwright_1 = require("playwright");
const fs = __importStar(require("fs"));
/**
 * Abstract base class for all job scraper implementations.
 * Provides common functionality for browser automation, rate limiting,
 * pagination, and data export.
 */
class BaseJobScraper {
    constructor(config = {}) {
        this.browser = null;
        this.context = null;
        this.lastRequestTime = 0;
        this.config = {
            headless: true,
            throttleMs: 2000,
            maxResults: 50,
            timeout: 30000,
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ...config
        };
    }
    /**
     * Initialize the browser instance for scraping
     */
    async initialize() {
        if (this.browser) {
            return;
        }
        this.browser = await playwright_1.chromium.launch({
            headless: this.config.headless
        });
        this.context = await this.browser.newContext({
            userAgent: this.config.userAgent,
            viewport: { width: 1920, height: 1080 }
        });
    }
    /**
     * Close the browser and clean up resources
     */
    async close() {
        if (this.context) {
            await this.context.close();
            this.context = null;
        }
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
    /**
     * Create a new page with the browser context
     */
    async newPage() {
        if (!this.context) {
            await this.initialize();
        }
        return this.context.newPage();
    }
    /**
     * Apply rate limiting between requests
     */
    async throttle() {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;
        const throttleMs = this.config.throttleMs || 2000;
        if (elapsed < throttleMs) {
            const delay = throttleMs - elapsed;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        this.lastRequestTime = Date.now();
    }
    /**
     * Search for jobs with the given filters
     */
    async search(filters) {
        await this.initialize();
        const page = await this.newPage();
        const allJobs = [];
        try {
            const searchUrl = this.buildSearchUrl(filters);
            await this.throttle();
            await page.goto(searchUrl, {
                waitUntil: 'networkidle',
                timeout: this.config.timeout
            });
            let pageNum = 1;
            const maxResults = this.config.maxResults || 50;
            while (allJobs.length < maxResults) {
                const jobs = await this.parseJobList(page);
                allJobs.push(...jobs);
                if (allJobs.length >= maxResults) {
                    break;
                }
                const hasMore = await this.hasNextPage(page);
                if (!hasMore) {
                    break;
                }
                await this.throttle();
                await this.goToNextPage(page);
                pageNum++;
            }
            return allJobs.slice(0, maxResults);
        }
        finally {
            await page.close();
        }
    }
    /**
     * Export jobs to a JSON file
     */
    async exportToJson(jobs, filepath) {
        const output = {
            platform: this.platform,
            exportedAt: new Date().toISOString(),
            totalJobs: jobs.length,
            jobs
        };
        fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
    }
}
exports.BaseJobScraper = BaseJobScraper;
//# sourceMappingURL=BaseJobScraper.js.map