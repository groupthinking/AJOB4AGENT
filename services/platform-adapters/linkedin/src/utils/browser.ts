import { Browser, BrowserContext, Page, chromium } from 'playwright';

/**
 * Browser configuration options
 */
export interface BrowserOptions {
  headless?: boolean;
  userAgent?: string;
  timeout?: number;
}

/**
 * Default browser configuration with stealth settings
 */
const DEFAULT_OPTIONS: BrowserOptions = {
  headless: true,
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  timeout: 30000,
};

/**
 * Create and configure a Playwright browser instance with stealth settings
 */
export async function createBrowser(
  options: BrowserOptions = {}
): Promise<Browser> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const browser = await chromium.launch({
    headless: opts.headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
    ],
  });

  return browser;
}

/**
 * Create a browser context with stealth configuration
 */
export async function createStealthContext(
  browser: Browser,
  options: BrowserOptions = {}
): Promise<BrowserContext> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const context = await browser.newContext({
    userAgent: opts.userAgent,
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
    geolocation: { longitude: -122.4194, latitude: 37.7749 },
    permissions: ['geolocation'],
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'sec-ch-ua':
        '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
    },
  });

  // Add scripts to evade detection
  await context.addInitScript(() => {
    // Override the webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });

    // Override the plugins property
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    // Override the languages property
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });

    // Add chrome property
    (window as Window & { chrome?: object }).chrome = {
      runtime: {},
    };
  });

  return context;
}

/**
 * Create a new page with stealth settings
 */
export async function createStealthPage(
  context: BrowserContext,
  options: BrowserOptions = {}
): Promise<Page> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const page = await context.newPage();

  // Set default timeout
  page.setDefaultTimeout(opts.timeout ?? 30000);

  return page;
}

/**
 * Safe navigation with retry logic
 */
export async function safeNavigate(
  page: Page,
  url: string,
  maxRetries = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      return true;
    } catch (error) {
      console.warn(`Navigation attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) {
        return false;
      }
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
  return false;
}

/**
 * Wait for element with timeout
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout = 10000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Simulate human-like mouse movement
 */
export async function humanMouseMove(
  page: Page,
  x: number,
  y: number
): Promise<void> {
  const steps = Math.floor(Math.random() * 5) + 5;
  await page.mouse.move(x, y, { steps });
}

/**
 * Simulate human-like scrolling
 */
export async function humanScroll(
  page: Page,
  scrollAmount = 300
): Promise<void> {
  const randomAmount = scrollAmount + Math.floor(Math.random() * 100);
  await page.mouse.wheel(0, randomAmount);
  await new Promise((resolve) =>
    setTimeout(resolve, 200 + Math.random() * 300)
  );
}
