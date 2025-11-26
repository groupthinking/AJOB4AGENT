/**
 * Retry utility for Form Fill Engine
 * Provides configurable retry logic with exponential backoff
 */

import { createComponentLogger } from './logger';

const logger = createComponentLogger('retry');

export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error, nextDelay: number) => void;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryCondition: () => true
};

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error = new Error('Unknown error');
  let delay = config.initialDelay;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt >= config.maxAttempts) {
        logger.error(`All ${config.maxAttempts} attempts failed`, {
          error: lastError.message
        });
        throw lastError;
      }

      // Check retry condition
      if (config.retryCondition && !config.retryCondition(lastError)) {
        logger.warn('Retry condition not met, throwing error', {
          error: lastError.message
        });
        throw lastError;
      }

      // Calculate next delay with exponential backoff
      const nextDelay = Math.min(
        delay * (config.backoffMultiplier || 2),
        config.maxDelay || 30000
      );

      logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, {
        error: lastError.message,
        nextAttempt: attempt + 1,
        delay
      });

      // Call onRetry callback if provided
      if (config.onRetry) {
        config.onRetry(attempt, lastError, delay);
      }

      // Wait before retrying
      await sleep(delay);
      delay = nextDelay;
    }
  }

  throw lastError;
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a retry wrapper with pre-configured options
 */
export function createRetryWrapper(defaultOptions: Partial<RetryOptions>) {
  return function <T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    return withRetry(fn, { ...defaultOptions, ...options });
  };
}

/**
 * Decorator-style retry wrapper for class methods
 */
export function retryable(options: Partial<RetryOptions> = {}) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return withRetry(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}

export default withRetry;
