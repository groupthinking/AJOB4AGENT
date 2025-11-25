/**
 * Browser utility for Form Fill Engine
 * Playwright browser setup and management
 */

import { chromium, Browser, BrowserContext, Page, LaunchOptions } from 'playwright';
import { FormFillConfig, DEFAULT_CONFIG } from '../types';
import { createComponentLogger } from './logger';

const logger = createComponentLogger('browser');

export interface BrowserInstance {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

/**
 * Launch a new browser instance with the given configuration
 */
export async function launchBrowser(config: Partial<FormFillConfig> = {}): Promise<BrowserInstance> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  logger.info('Launching browser', {
    headless: mergedConfig.headless,
    viewport: mergedConfig.viewport
  });

  const launchOptions: LaunchOptions = {
    headless: mergedConfig.headless,
    slowMo: mergedConfig.slowMo
  };

  const browser = await chromium.launch(launchOptions);

  const contextOptions = {
    viewport: mergedConfig.viewport,
    userAgent: mergedConfig.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York'
  };

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  // Set default timeout
  page.setDefaultTimeout(mergedConfig.timeout);

  logger.info('Browser launched successfully');

  return { browser, context, page };
}

/**
 * Close browser instance safely
 */
export async function closeBrowser(instance: BrowserInstance): Promise<void> {
  logger.info('Closing browser');

  try {
    if (instance.page && !instance.page.isClosed()) {
      await instance.page.close();
    }
  } catch (error) {
    logger.warn('Error closing page', { error: error instanceof Error ? error.message : String(error) });
  }

  try {
    if (instance.context) {
      await instance.context.close();
    }
  } catch (error) {
    logger.warn('Error closing context', { error: error instanceof Error ? error.message : String(error) });
  }

  try {
    if (instance.browser) {
      await instance.browser.close();
    }
  } catch (error) {
    logger.warn('Error closing browser', { error: error instanceof Error ? error.message : String(error) });
  }

  logger.info('Browser closed');
}

/**
 * Take a screenshot of the current page
 */
export async function takeScreenshot(page: Page, fullPage: boolean = false): Promise<string> {
  logger.debug('Taking screenshot', { fullPage });

  const buffer = await page.screenshot({
    fullPage,
    type: 'png'
  });

  return buffer.toString('base64');
}

/**
 * Wait for page to be in a stable state
 */
export async function waitForStableState(page: Page, timeout: number = 5000): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    // If networkidle times out, try domcontentloaded
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: timeout / 2 });
    } catch {
      // Ignore if already loaded
    }
  }
}

/**
 * Navigate to a URL with retry logic
 */
export async function navigateTo(
  page: Page,
  url: string,
  options: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' } = {}
): Promise<void> {
  const { timeout = 30000, waitUntil = 'domcontentloaded' } = options;

  logger.info('Navigating to URL', { url });

  await page.goto(url, {
    timeout,
    waitUntil
  });

  await waitForStableState(page);

  logger.info('Navigation complete', { url: page.url() });
}

/**
 * Check if an element is visible on the page
 */
export async function isElementVisible(page: Page, selector: string): Promise<boolean> {
  try {
    const element = page.locator(selector).first();
    return await element.isVisible();
  } catch {
    return false;
  }
}

/**
 * Wait for an element to be visible
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout: number = 10000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector).first();
  await element.scrollIntoViewIfNeeded();
}

/**
 * Get browser manager for handling multiple pages
 */
export class BrowserManager {
  private instance: BrowserInstance | null = null;
  private config: FormFillConfig;

  constructor(config: Partial<FormFillConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    if (!this.instance) {
      this.instance = await launchBrowser(this.config);
    }
  }

  async getPage(): Promise<Page> {
    if (!this.instance) {
      await this.initialize();
    }
    return this.instance!.page;
  }

  async newPage(): Promise<Page> {
    if (!this.instance) {
      await this.initialize();
    }
    return await this.instance!.context.newPage();
  }

  async close(): Promise<void> {
    if (this.instance) {
      await closeBrowser(this.instance);
      this.instance = null;
    }
  }

  isInitialized(): boolean {
    return this.instance !== null;
  }
}

export default {
  launchBrowser,
  closeBrowser,
  takeScreenshot,
  waitForStableState,
  navigateTo,
  isElementVisible,
  waitForElement,
  scrollIntoView,
  BrowserManager
};
