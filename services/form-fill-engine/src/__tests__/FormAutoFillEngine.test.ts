import { FormAutoFillEngine } from '../FormAutoFillEngine';
import { ScrapedJob, UserProfile, FormFillConfig } from '../types';

describe('FormAutoFillEngine', () => {
  let engine: FormAutoFillEngine;

  const mockUserProfile: UserProfile = {
    userId: 'test-user-1',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1-555-123-4567',
    linkedInUrl: 'https://linkedin.com/in/johndoe',
    githubUrl: 'https://github.com/johndoe',
    portfolioUrl: 'https://johndoe.dev',
    currentTitle: 'Senior Software Engineer',
    yearsOfExperience: 8,
    skills: ['TypeScript', 'React', 'Node.js'],
    summary: 'Experienced software engineer.',
    resumeContent: 'John Doe Resume Content',
  };

  const mockLinkedInJob: ScrapedJob = {
    jobId: 'linkedin-123',
    platform: 'linkedin',
    url: 'https://www.linkedin.com/jobs/view/123456',
    title: 'Senior Software Engineer',
    company: 'Tech Corp',
    description: 'We are looking for a senior software engineer...',
    location: 'San Francisco, CA',
  };

  beforeEach(() => {
    engine = new FormAutoFillEngine({
      headless: true,
      timeout: 10000,
    });
  });

  afterEach(async () => {
    await engine.close();
  });

  describe('constructor', () => {
    it('should create engine with default config', () => {
      const defaultEngine = new FormAutoFillEngine();
      expect(defaultEngine).toBeInstanceOf(FormAutoFillEngine);
      expect(defaultEngine.getSupportedPlatforms()).toContain('linkedin');
      expect(defaultEngine.getSupportedPlatforms()).toContain('glassdoor');
    });

    it('should create engine with custom config', () => {
      const customConfig: Partial<FormFillConfig> = {
        headless: false,
        timeout: 60000,
        maxRetries: 5,
      };
      const customEngine = new FormAutoFillEngine(customConfig);
      expect(customEngine).toBeInstanceOf(FormAutoFillEngine);
    });
  });

  describe('getSupportedPlatforms', () => {
    it('should return list of supported platforms', () => {
      const platforms = engine.getSupportedPlatforms();
      expect(platforms).toContain('linkedin');
      expect(platforms).toContain('glassdoor');
      expect(platforms.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('isPlatformSupported', () => {
    it('should return true for linkedin', () => {
      expect(engine.isPlatformSupported('linkedin')).toBe(true);
    });

    it('should return true for glassdoor', () => {
      expect(engine.isPlatformSupported('glassdoor')).toBe(true);
    });

    it('should return true for case-insensitive platform names', () => {
      expect(engine.isPlatformSupported('LINKEDIN')).toBe(true);
      expect(engine.isPlatformSupported('LinkedIn')).toBe(true);
      expect(engine.isPlatformSupported('Glassdoor')).toBe(true);
    });

    it('should return false for unsupported platforms', () => {
      expect(engine.isPlatformSupported('indeed')).toBe(false);
      expect(engine.isPlatformSupported('monster')).toBe(false);
    });
  });

  describe('getAdapter', () => {
    it('should return LinkedIn adapter', () => {
      const adapter = engine.getAdapter('linkedin');
      expect(adapter).toBeDefined();
      expect(adapter?.platformName).toBe('linkedin');
    });

    it('should return Glassdoor adapter', () => {
      const adapter = engine.getAdapter('glassdoor');
      expect(adapter).toBeDefined();
      expect(adapter?.platformName).toBe('glassdoor');
    });

    it('should return undefined for unsupported platform', () => {
      const adapter = engine.getAdapter('indeed');
      expect(adapter).toBeUndefined();
    });
  });

  describe('registerAdapter', () => {
    it('should register a custom adapter', () => {
      const mockAdapter = {
        platformName: 'custom-platform',
        isOnPlatform: jest.fn(),
        detectApplicationForm: jest.fn(),
        detectFields: jest.fn(),
        fillField: jest.fn(),
        uploadResume: jest.fn(),
        navigateToNextStep: jest.fn(),
        submitApplication: jest.fn(),
        isApplicationComplete: jest.fn(),
        handlePopups: jest.fn(),
      };

      engine.registerAdapter(mockAdapter);
      expect(engine.isPlatformSupported('custom-platform')).toBe(true);
      expect(engine.getAdapter('custom-platform')).toBe(mockAdapter);
    });
  });

  describe('autoFill', () => {
    it('should return error for unsupported platform', async () => {
      const unsupportedJob: ScrapedJob = {
        ...mockLinkedInJob,
        platform: 'unsupported-platform',
      };

      const result = await engine.autoFill(unsupportedJob, mockUserProfile, { dryRun: true });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No adapter available for platform');
    });

    // Note: Full integration tests would require mocking Playwright
    // or running against actual job application pages
  });

  describe('reliability scoring', () => {
    it('should calculate reliability score correctly', async () => {
      // This test verifies the structure of the reliability score
      const result = await engine.autoFill(mockLinkedInJob, mockUserProfile, { dryRun: true });

      expect(result.reliability).toBeDefined();
      expect(typeof result.reliability.overall).toBe('number');
      expect(typeof result.reliability.fieldsDetected).toBe('number');
      expect(typeof result.reliability.fieldsFilled).toBe('number');
      expect(typeof result.reliability.fieldsFailed).toBe('number');
      expect(typeof result.reliability.confidenceAverage).toBe('number');
      expect(Array.isArray(result.reliability.warnings)).toBe(true);
    });
  });

  describe('result structure', () => {
    it('should return correct result structure', async () => {
      const result = await engine.autoFill(mockLinkedInJob, mockUserProfile, { dryRun: true });

      expect(result.jobId).toBe(mockLinkedInJob.jobId);
      expect(result.platform).toBe(mockLinkedInJob.platform);
      expect(typeof result.success).toBe('boolean');
      expect(result.reliability).toBeDefined();
      expect(Array.isArray(result.fieldResults)).toBe(true);
      expect(typeof result.formSubmitted).toBe('boolean');
      expect(typeof result.duration).toBe('number');
      expect(typeof result.timestamp).toBe('string');
    });
  });
});
