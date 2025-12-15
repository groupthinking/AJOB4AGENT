/**
 * Throttle configuration options
 */
export interface ThrottleConfig {
  minDelayMs: number;
  maxDelayMs: number;
  requestsPerWindow: number;
  windowMs: number;
}

/**
 * Default throttle configuration
 */
const DEFAULT_CONFIG: ThrottleConfig = {
  minDelayMs: 2000,
  maxDelayMs: 5000,
  requestsPerWindow: 25,
  windowMs: 60000, // 1 minute
};

/**
 * Throttle manager for rate limiting requests
 */
export class ThrottleManager {
  private config: ThrottleConfig;
  private requestTimestamps: number[] = [];
  private lastRequestTime = 0;

  constructor(config: Partial<ThrottleConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Wait for the appropriate delay before making a request
   */
  async wait(): Promise<void> {
    // Clean up old timestamps
    this.cleanupOldTimestamps();

    // Check if we've hit the rate limit
    if (this.requestTimestamps.length >= this.config.requestsPerWindow) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = oldestTimestamp + this.config.windowMs - Date.now();
      if (waitTime > 0) {
        console.log(
          `⏳ Rate limit reached: waiting ${Math.ceil(waitTime / 1000)}s`
        );
        await this.delay(waitTime);
        this.cleanupOldTimestamps();
      }
    }

    // Apply minimum delay between requests
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.config.minDelayMs) {
      await this.delay(this.config.minDelayMs - timeSinceLastRequest);
    }

    // Add random delay to appear more human-like
    const randomDelay = this.getRandomDelay();
    await this.delay(randomDelay);

    // Record this request
    this.lastRequestTime = Date.now();
    this.requestTimestamps.push(this.lastRequestTime);
  }

  /**
   * Get current rate limit status
   */
  getStatus(): {
    requestsInWindow: number;
    windowResetIn: number;
    canMakeRequest: boolean;
  } {
    this.cleanupOldTimestamps();
    const now = Date.now();

    return {
      requestsInWindow: this.requestTimestamps.length,
      windowResetIn:
        this.requestTimestamps.length > 0
          ? Math.max(
              0,
              this.requestTimestamps[0] + this.config.windowMs - now
            )
          : 0,
      canMakeRequest:
        this.requestTimestamps.length < this.config.requestsPerWindow,
    };
  }

  /**
   * Update throttle configuration
   */
  updateConfig(config: Partial<ThrottleConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): ThrottleConfig {
    return { ...this.config };
  }

  /**
   * Reset the throttle manager
   */
  reset(): void {
    this.requestTimestamps = [];
    this.lastRequestTime = 0;
  }

  /**
   * Get a random delay between min and max
   */
  private getRandomDelay(): number {
    return Math.floor(
      Math.random() * (this.config.maxDelayMs - this.config.minDelayMs)
    );
  }

  /**
   * Sleep for a given duration
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Remove timestamps outside the current window
   */
  private cleanupOldTimestamps(): void {
    const cutoff = Date.now() - this.config.windowMs;
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => ts > cutoff
    );
  }
}

/**
 * Create a throttled function wrapper
 */
export function createThrottledFunction<T>(
  fn: () => Promise<T>,
  throttle: ThrottleManager
): () => Promise<T> {
  return async () => {
    await throttle.wait();
    return fn();
  };
}
