/**
 * Form Fill Engine
 * Main entry point for the form auto-fill service
 */

// Core engine
export { FormAutoFillEngine } from './FormAutoFillEngine';

// Types
export * from './types';

// Adapters
export { BaseFormAdapter } from './adapters/BaseFormAdapter';
export { LinkedInEasyApplyAdapter } from './adapters/LinkedInEasyApplyAdapter';
export { GlassdoorApplyAdapter } from './adapters/GlassdoorApplyAdapter';

// Services
export { FieldDetector } from './services/FieldDetector';
export { FieldMapper } from './services/FieldMapper';
export { LLMFieldMatcher } from './services/LLMFieldMatcher';
export { FormSubmitter } from './services/FormSubmitter';

// Utilities
export { createLogger, createComponentLogger, logger } from './utils/logger';
export { withRetry, sleep, createRetryWrapper } from './utils/retry';
export {
  launchBrowser,
  closeBrowser,
  takeScreenshot,
  navigateTo,
  waitForElement,
  isElementVisible,
  BrowserManager
} from './utils/browser';

// Configuration
export { loadConfig, validateConfig, getDefaultConfig } from './config';
