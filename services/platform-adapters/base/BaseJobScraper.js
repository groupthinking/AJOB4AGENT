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
/**
 * Abstract base class for all job scraper adapters
 * Provides a common interface for different job platform scrapers
 */
class BaseJobScraper {
    constructor(config = {}) {
        this.isInitialized = false;
        this.config = {
            headless: true,
            throttleMs: 3000,
            maxResults: 50,
            timeout: 30000,
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ...config,
        };
    }
    /**
     * Export jobs to JSON file
     */
    async exportToJson(jobs, filePath) {
        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        // Ensure directory exists
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        // Write jobs to file
        const output = {
            jobs,
            metadata: {
                exportedAt: new Date().toISOString(),
                totalCount: jobs.length,
                source: this.getSourceName(),
            },
        };
        await fs.writeFile(filePath, JSON.stringify(output, null, 2), 'utf-8');
    }
    /**
     * Check if the scraper is initialized
     */
    isReady() {
        return this.isInitialized;
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Apply throttling between requests
     */
    async throttle() {
        const delay = this.config.throttleMs ?? 3000;
        // Add some randomness to appear more human-like
        const randomDelay = delay + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, randomDelay));
    }
}
exports.BaseJobScraper = BaseJobScraper;
//# sourceMappingURL=BaseJobScraper.js.map