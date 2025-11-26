/**
 * Configuration Tests
 */

import { loadConfig, validateConfig, getDefaultConfig } from '../src/config';
import { DEFAULT_CONFIG } from '../src/types';

describe('Configuration', () => {
  // Save original env
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env for each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should return default config when no env vars are set', () => {
      const config = loadConfig();
      
      expect(config.headless).toBe(DEFAULT_CONFIG.headless);
      expect(config.timeout).toBe(DEFAULT_CONFIG.timeout);
      expect(config.retryAttempts).toBe(DEFAULT_CONFIG.retryAttempts);
    });

    it('should load config from environment variables', () => {
      process.env.BROWSER_HEADLESS = 'false';
      process.env.BROWSER_TIMEOUT = '60000';
      process.env.RETRY_ATTEMPTS = '5';
      process.env.LLM_SERVICE_URL = 'http://custom-llm:8000';
      
      const config = loadConfig();
      
      expect(config.headless).toBe(false);
      expect(config.timeout).toBe(60000);
      expect(config.retryAttempts).toBe(5);
      expect(config.llmServiceUrl).toBe('http://custom-llm:8000');
    });

    it('should apply overrides to config', () => {
      const config = loadConfig({
        headless: false,
        dryRun: true
      });
      
      expect(config.headless).toBe(false);
      expect(config.dryRun).toBe(true);
    });

    it('should parse viewport from env', () => {
      process.env.VIEWPORT_WIDTH = '1920';
      process.env.VIEWPORT_HEIGHT = '1080';
      
      const config = loadConfig();
      
      expect(config.viewport?.width).toBe(1920);
      expect(config.viewport?.height).toBe(1080);
    });

    it('should parse slowMo from env', () => {
      process.env.SLOW_MO = '100';
      
      const config = loadConfig();
      
      expect(config.slowMo).toBe(100);
    });

    it('should parse debug mode from env', () => {
      process.env.DEBUG = 'true';
      
      const config = loadConfig();
      
      expect(config.debug).toBe(true);
    });
  });

  describe('validateConfig', () => {
    it('should return empty array for valid config', () => {
      const config = getDefaultConfig();
      const errors = validateConfig(config);
      
      expect(errors).toEqual([]);
    });

    it('should return error for negative timeout', () => {
      const config = { ...getDefaultConfig(), timeout: -1 };
      const errors = validateConfig(config);
      
      expect(errors).toContain('timeout must be a positive number');
    });

    it('should return error for negative retryAttempts', () => {
      const config = { ...getDefaultConfig(), retryAttempts: -1 };
      const errors = validateConfig(config);
      
      expect(errors).toContain('retryAttempts must be non-negative');
    });

    it('should return error for invalid maxConcurrent', () => {
      const config = { ...getDefaultConfig(), maxConcurrent: 0 };
      const errors = validateConfig(config);
      
      expect(errors).toContain('maxConcurrent must be at least 1');
    });

    it('should return error for empty llmServiceUrl', () => {
      const config = { ...getDefaultConfig(), llmServiceUrl: '' };
      const errors = validateConfig(config);
      
      expect(errors).toContain('llmServiceUrl is required');
    });

    it('should return error for invalid viewport dimensions', () => {
      const config = { ...getDefaultConfig(), viewport: { width: -100, height: 720 } };
      const errors = validateConfig(config);
      
      expect(errors).toContain('viewport dimensions must be positive');
    });
  });

  describe('getDefaultConfig', () => {
    it('should return a copy of default config', () => {
      const config1 = getDefaultConfig();
      const config2 = getDefaultConfig();
      
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });

    it('should match DEFAULT_CONFIG values', () => {
      const config = getDefaultConfig();
      
      expect(config.headless).toBe(DEFAULT_CONFIG.headless);
      expect(config.timeout).toBe(DEFAULT_CONFIG.timeout);
      expect(config.retryAttempts).toBe(DEFAULT_CONFIG.retryAttempts);
      expect(config.llmServiceUrl).toBe(DEFAULT_CONFIG.llmServiceUrl);
    });
  });
});
