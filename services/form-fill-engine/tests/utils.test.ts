/**
 * Utility Tests - Retry and Logger
 */

import { withRetry, sleep, createRetryWrapper, DEFAULT_RETRY_OPTIONS } from '../src/utils/retry';
import { createLogger, createComponentLogger } from '../src/utils/logger';

describe('Retry Utility', () => {
  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      
      const result = await withRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('First fail'))
        .mockRejectedValueOnce(new Error('Second fail'))
        .mockResolvedValue('success');
      
      const result = await withRetry(fn, {
        maxAttempts: 3,
        initialDelay: 10
      });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max attempts', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Always fails'));
      
      await expect(withRetry(fn, {
        maxAttempts: 2,
        initialDelay: 10
      })).rejects.toThrow('Always fails');
      
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry if retryCondition returns false', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Not retryable'));
      
      await expect(withRetry(fn, {
        maxAttempts: 3,
        initialDelay: 10,
        retryCondition: () => false
      })).rejects.toThrow('Not retryable');
      
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback on each retry', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');
      
      const onRetry = jest.fn();
      
      await withRetry(fn, {
        maxAttempts: 3,
        initialDelay: 10,
        onRetry
      });
      
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success');
      
      const delays: number[] = [];
      const onRetry = jest.fn((_attempt, _error, delay) => {
        delays.push(delay);
      });
      
      await withRetry(fn, {
        maxAttempts: 3,
        initialDelay: 100,
        backoffMultiplier: 2,
        onRetry
      });
      
      expect(delays[0]).toBe(100);
    });
  });

  describe('sleep', () => {
    it('should wait for specified duration', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(40);
    });
  });

  describe('createRetryWrapper', () => {
    it('should create a wrapper with pre-configured options', async () => {
      const wrapper = createRetryWrapper({
        maxAttempts: 2,
        initialDelay: 10
      });
      
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success');
      
      const result = await wrapper(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('DEFAULT_RETRY_OPTIONS', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_RETRY_OPTIONS.maxAttempts).toBe(3);
      expect(DEFAULT_RETRY_OPTIONS.initialDelay).toBe(1000);
      expect(DEFAULT_RETRY_OPTIONS.maxDelay).toBe(30000);
      expect(DEFAULT_RETRY_OPTIONS.backoffMultiplier).toBe(2);
    });
  });
});

describe('Logger Utility', () => {
  describe('createLogger', () => {
    it('should create a logger with default options', () => {
      const logger = createLogger();
      
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should create a logger with custom options', () => {
      const logger = createLogger({
        level: 'debug',
        service: 'test-service',
        silent: true
      });
      
      expect(logger).toBeDefined();
    });

    it('should create a silent logger', () => {
      const logger = createLogger({ silent: true });
      
      // Should not throw when logging
      expect(() => logger.info('test message')).not.toThrow();
    });
  });

  describe('createComponentLogger', () => {
    it('should create a component logger', () => {
      const componentLogger = createComponentLogger('test-component');
      
      expect(componentLogger).toBeDefined();
      expect(typeof componentLogger.info).toBe('function');
    });
  });
});
