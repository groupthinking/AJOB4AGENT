/**
 * Configuration module for Form Fill Engine
 * Loads configuration from environment variables
 */

import dotenv from 'dotenv';
import { FormFillConfig, DEFAULT_CONFIG } from './types';

// Load environment variables
dotenv.config();

/**
 * Load configuration from environment variables
 */
export function loadConfig(overrides: Partial<FormFillConfig> = {}): FormFillConfig {
  const envConfig: Partial<FormFillConfig> = {
    headless: process.env.BROWSER_HEADLESS !== 'false',
    timeout: parseInt(process.env.BROWSER_TIMEOUT || '30000', 10),
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.RETRY_DELAY || '1000', 10),
    screenshotOnComplete: process.env.SCREENSHOT_ON_COMPLETE !== 'false',
    screenshotOnError: process.env.SCREENSHOT_ON_ERROR !== 'false',
    dryRun: process.env.DRY_RUN === 'true',
    llmServiceUrl: process.env.LLM_SERVICE_URL || 'http://localhost:8002',
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT || '1', 10),
    debug: process.env.DEBUG === 'true'
  };

  // Parse viewport if provided
  if (process.env.VIEWPORT_WIDTH && process.env.VIEWPORT_HEIGHT) {
    envConfig.viewport = {
      width: parseInt(process.env.VIEWPORT_WIDTH, 10),
      height: parseInt(process.env.VIEWPORT_HEIGHT, 10)
    };
  }

  // Parse user agent if provided
  if (process.env.USER_AGENT) {
    envConfig.userAgent = process.env.USER_AGENT;
  }

  // Parse slowMo if provided
  if (process.env.SLOW_MO) {
    envConfig.slowMo = parseInt(process.env.SLOW_MO, 10);
  }

  return { ...DEFAULT_CONFIG, ...envConfig, ...overrides };
}

/**
 * Validate configuration
 */
export function validateConfig(config: FormFillConfig): string[] {
  const errors: string[] = [];

  if (config.timeout <= 0) {
    errors.push('timeout must be a positive number');
  }

  if (config.retryAttempts < 0) {
    errors.push('retryAttempts must be non-negative');
  }

  if (config.retryDelay < 0) {
    errors.push('retryDelay must be non-negative');
  }

  if (config.maxConcurrent < 1) {
    errors.push('maxConcurrent must be at least 1');
  }

  if (!config.llmServiceUrl) {
    errors.push('llmServiceUrl is required');
  }

  if (config.viewport) {
    if (config.viewport.width <= 0 || config.viewport.height <= 0) {
      errors.push('viewport dimensions must be positive');
    }
  }

  return errors;
}

/**
 * Get the default configuration
 */
export function getDefaultConfig(): FormFillConfig {
  return { ...DEFAULT_CONFIG };
}

export default loadConfig;
