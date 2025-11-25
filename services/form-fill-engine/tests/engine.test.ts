/**
 * Form Auto-Fill Engine Unit Tests
 */

import { FormAutoFillEngine } from '../src/FormAutoFillEngine';
import { LinkedInEasyApplyAdapter } from '../src/adapters/LinkedInEasyApplyAdapter';
import { GlassdoorApplyAdapter } from '../src/adapters/GlassdoorApplyAdapter';
import { UserProfile, DEFAULT_CONFIG } from '../src/types';

// Mock Playwright
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn().mockResolvedValue(undefined),
          setDefaultTimeout: jest.fn(),
          close: jest.fn(),
          isClosed: jest.fn().mockReturnValue(false),
          url: jest.fn().mockReturnValue('https://example.com'),
          waitForLoadState: jest.fn().mockResolvedValue(undefined),
          waitForSelector: jest.fn().mockResolvedValue(undefined),
          waitForTimeout: jest.fn().mockResolvedValue(undefined),
          locator: jest.fn().mockReturnValue({
            count: jest.fn().mockResolvedValue(0),
            isVisible: jest.fn().mockResolvedValue(false),
            all: jest.fn().mockResolvedValue([])
          }),
          screenshot: jest.fn().mockResolvedValue(Buffer.from('test'))
        }),
        close: jest.fn()
      }),
      close: jest.fn()
    })
  }
}));

// Mock axios for LLM service
jest.mock('axios', () => ({
  create: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({ data: { status: 'ok' } }),
    post: jest.fn().mockResolvedValue({ data: { matches: [] } })
  })
}));

describe('FormAutoFillEngine', () => {
  let engine: FormAutoFillEngine;
  const mockProfile: UserProfile = {
    personalInfo: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-123-4567',
      location: 'San Francisco, CA',
      linkedInUrl: 'https://linkedin.com/in/johndoe',
      portfolioUrl: 'https://johndoe.dev'
    },
    resume: {
      summary: 'Experienced software engineer with 10+ years in full-stack development',
      experience: [
        {
          company: 'TechCorp',
          title: 'Senior Software Engineer',
          location: 'San Francisco, CA',
          startDate: '2020-01',
          current: true,
          description: 'Leading development of cloud-native applications'
        }
      ],
      education: [
        {
          institution: 'Stanford University',
          degree: 'Master of Science',
          field: 'Computer Science',
          endDate: '2015'
        }
      ],
      skills: ['TypeScript', 'Python', 'AWS', 'React', 'Node.js']
    },
    preferences: {
      salaryExpectation: '$150,000',
      startDate: '2 weeks',
      workAuthorization: 'US Citizen',
      requiresSponsorship: false,
      willingToRelocate: true
    }
  };

  beforeEach(() => {
    engine = new FormAutoFillEngine({
      headless: true,
      dryRun: true,
      timeout: 5000
    });
  });

  afterEach(() => {
    engine.clearHistory();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const defaultEngine = new FormAutoFillEngine();
      const config = defaultEngine.getConfig();
      
      expect(config.headless).toBe(DEFAULT_CONFIG.headless);
      expect(config.timeout).toBe(DEFAULT_CONFIG.timeout);
      expect(config.retryAttempts).toBe(DEFAULT_CONFIG.retryAttempts);
    });

    it('should override default config with provided options', () => {
      const customEngine = new FormAutoFillEngine({
        headless: false,
        timeout: 60000,
        dryRun: true
      });
      const config = customEngine.getConfig();
      
      expect(config.headless).toBe(false);
      expect(config.timeout).toBe(60000);
      expect(config.dryRun).toBe(true);
    });
  });

  describe('registerAdapter', () => {
    it('should register a platform adapter', () => {
      const linkedInAdapter = new LinkedInEasyApplyAdapter();
      engine.registerAdapter('linkedin', linkedInAdapter);
      
      const adapter = engine.getAdapter('linkedin');
      expect(adapter).toBeDefined();
      expect(adapter?.platform).toBe('linkedin');
    });

    it('should register multiple adapters', () => {
      engine.registerAdapter('linkedin', new LinkedInEasyApplyAdapter());
      engine.registerAdapter('glassdoor', new GlassdoorApplyAdapter());
      
      expect(engine.getAdapter('linkedin')).toBeDefined();
      expect(engine.getAdapter('glassdoor')).toBeDefined();
    });

    it('should handle case-insensitive platform names', () => {
      engine.registerAdapter('LinkedIn', new LinkedInEasyApplyAdapter());
      
      expect(engine.getAdapter('linkedin')).toBeDefined();
      expect(engine.getAdapter('LINKEDIN')).toBeDefined();
    });
  });

  describe('detectPlatform', () => {
    beforeEach(() => {
      engine.registerAdapter('linkedin', new LinkedInEasyApplyAdapter());
      engine.registerAdapter('glassdoor', new GlassdoorApplyAdapter());
    });

    it('should detect LinkedIn URLs', () => {
      const linkedInUrls = [
        'https://www.linkedin.com/jobs/view/123456',
        'https://linkedin.com/jobs/view/789012',
        'https://www.linkedin.com/job/software-engineer'
      ];

      linkedInUrls.forEach(url => {
        expect(engine.detectPlatform(url)).toBe('linkedin');
      });
    });

    it('should detect Glassdoor URLs', () => {
      const glassdoorUrls = [
        'https://www.glassdoor.com/job-listing/software-engineer.htm?jl=123456',
        'https://glassdoor.com/jobs/company-jobs'
      ];

      glassdoorUrls.forEach(url => {
        expect(engine.detectPlatform(url)).toBe('glassdoor');
      });
    });

    it('should return null for unknown platforms', () => {
      const unknownUrls = [
        'https://indeed.com/jobs/123456',
        'https://monster.com/job/456',
        'https://example.com'
      ];

      unknownUrls.forEach(url => {
        expect(engine.detectPlatform(url)).toBeNull();
      });
    });
  });

  describe('profile validation', () => {
    it('should accept valid mock profile', () => {
      // Ensure the mock profile has all required fields
      expect(mockProfile.personalInfo.firstName).toBe('John');
      expect(mockProfile.personalInfo.lastName).toBe('Doe');
      expect(mockProfile.personalInfo.email).toBe('john.doe@example.com');
      expect(mockProfile.resume.skills).toContain('TypeScript');
      expect(mockProfile.preferences.requiresSponsorship).toBe(false);
    });
  });

  describe('getHistory', () => {
    it('should return empty array initially', () => {
      expect(engine.getHistory()).toEqual([]);
    });

    it('should return copy of history', () => {
      const history1 = engine.getHistory();
      const history2 = engine.getHistory();
      
      expect(history1).not.toBe(history2);
    });
  });

  describe('clearHistory', () => {
    it('should clear application history', () => {
      // Add some mock history
      engine['history'] = [{
        jobId: '123',
        jobUrl: 'https://example.com',
        status: 'success',
        fieldsCompleted: 5,
        fieldsFailed: 0,
        fieldMappings: [],
        submittedAt: new Date().toISOString(),
        duration: 1000,
        platform: 'test',
        attempts: 1
      }];
      
      expect(engine.getHistory().length).toBe(1);
      
      engine.clearHistory();
      
      expect(engine.getHistory()).toEqual([]);
    });
  });

  describe('exportResults', () => {
    beforeEach(() => {
      engine['history'] = [
        {
          jobId: '123',
          jobUrl: 'https://linkedin.com/jobs/view/123',
          status: 'success',
          fieldsCompleted: 10,
          fieldsFailed: 2,
          fieldMappings: [],
          submittedAt: '2024-01-15T10:00:00Z',
          duration: 5000,
          platform: 'linkedin',
          attempts: 1
        },
        {
          jobId: '456',
          jobUrl: 'https://glassdoor.com/job/456',
          status: 'failed',
          fieldsCompleted: 3,
          fieldsFailed: 5,
          fieldMappings: [],
          errorMessage: 'Timeout error',
          submittedAt: '2024-01-15T11:00:00Z',
          duration: 30000,
          platform: 'glassdoor',
          attempts: 3
        }
      ];
    });

    it('should export results as JSON', () => {
      const json = engine.exportResults('json');
      const parsed = JSON.parse(json);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
      expect(parsed[0].jobId).toBe('123');
      expect(parsed[1].status).toBe('failed');
    });

    it('should export results as CSV', () => {
      const csv = engine.exportResults('csv');
      const lines = csv.split('\n');
      
      expect(lines.length).toBe(3); // Header + 2 data rows
      expect(lines[0]).toContain('jobId');
      expect(lines[0]).toContain('status');
      expect(lines[1]).toContain('123');
      expect(lines[2]).toContain('failed');
    });
  });

  describe('getReliabilityScore', () => {
    it('should return 0 for empty history', () => {
      expect(engine.getReliabilityScore()).toBe(0);
    });

    it('should return 1 for all successful applications', () => {
      engine['history'] = [
        { status: 'success' } as any,
        { status: 'success' } as any
      ];
      
      expect(engine.getReliabilityScore()).toBe(1);
    });

    it('should calculate score based on success/partial/failed ratio', () => {
      engine['history'] = [
        { status: 'success' } as any,
        { status: 'partial' } as any,
        { status: 'failed' } as any
      ];
      
      // (1 + 0.5 + 0) / 3 = 0.5
      expect(engine.getReliabilityScore()).toBe(0.5);
    });
  });

  describe('getFieldMappingStats', () => {
    it('should return zero stats for empty history', () => {
      const stats = engine.getFieldMappingStats();
      
      expect(stats.totalFields).toBe(0);
      expect(stats.exactMatches).toBe(0);
      expect(stats.llmMatches).toBe(0);
      expect(stats.fallbackMatches).toBe(0);
      expect(stats.averageConfidence).toBe(0);
    });

    it('should calculate correct stats from history', () => {
      engine['history'] = [
        {
          fieldMappings: [
            { source: 'exact', confidence: 0.95 },
            { source: 'exact', confidence: 0.90 },
            { source: 'llm', confidence: 0.75 },
            { source: 'fallback', confidence: 0.50 }
          ]
        } as any
      ];
      
      const stats = engine.getFieldMappingStats();
      
      expect(stats.totalFields).toBe(4);
      expect(stats.exactMatches).toBe(2);
      expect(stats.llmMatches).toBe(1);
      expect(stats.fallbackMatches).toBe(1);
      expect(stats.averageConfidence).toBe(0.78); // (0.95+0.90+0.75+0.50)/4
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      engine.updateConfig({ timeout: 60000 });
      
      expect(engine.getConfig().timeout).toBe(60000);
    });

    it('should preserve existing config values', () => {
      const originalConfig = engine.getConfig();
      engine.updateConfig({ timeout: 60000 });
      
      expect(engine.getConfig().headless).toBe(originalConfig.headless);
      expect(engine.getConfig().retryAttempts).toBe(originalConfig.retryAttempts);
    });
  });

  describe('setFallbackValues', () => {
    it('should set fallback values', () => {
      engine.setFallbackValues({
        'years of experience': '5+ years',
        'visa status': 'Not required'
      });
      
      // The fallbacks are stored in the internal fieldMapper
      // We can verify by checking the mapper has them set
      expect(() => engine.setFallbackValues({})).not.toThrow();
    });
  });

  describe('setLLMEnabled', () => {
    it('should enable/disable LLM matching', () => {
      expect(() => engine.setLLMEnabled(false)).not.toThrow();
      expect(() => engine.setLLMEnabled(true)).not.toThrow();
    });
  });
});

describe('LinkedInEasyApplyAdapter', () => {
  let adapter: LinkedInEasyApplyAdapter;

  beforeEach(() => {
    adapter = new LinkedInEasyApplyAdapter();
  });

  describe('platform', () => {
    it('should have correct platform name', () => {
      expect(adapter.platform).toBe('linkedin');
    });
  });

  describe('capabilities', () => {
    it('should support multi-step forms', () => {
      expect(adapter.capabilities.supportsMultiStep).toBe(true);
    });

    it('should support file upload', () => {
      expect(adapter.capabilities.supportsFileUpload).toBe(true);
    });

    it('should require login', () => {
      expect(adapter.capabilities.requiresLogin).toBe(true);
    });
  });

  describe('isApplyPage', () => {
    it('should return true for LinkedIn job URLs', () => {
      expect(adapter.isApplyPage('https://www.linkedin.com/jobs/view/123456')).toBe(true);
      expect(adapter.isApplyPage('https://linkedin.com/jobs/view/789')).toBe(true);
      expect(adapter.isApplyPage('https://www.linkedin.com/job/software-engineer')).toBe(true);
    });

    it('should return false for non-LinkedIn URLs', () => {
      expect(adapter.isApplyPage('https://indeed.com/job/123')).toBe(false);
      expect(adapter.isApplyPage('https://glassdoor.com/job/456')).toBe(false);
    });
  });

  describe('getFieldLabels', () => {
    it('should return LinkedIn-specific field labels', () => {
      const labels = adapter.getFieldLabels();
      
      expect(labels.email).toContain('Email');
      expect(labels.phone).toBeDefined();
      expect(labels.yearsExperience).toBeDefined();
    });
  });
});

describe('GlassdoorApplyAdapter', () => {
  let adapter: GlassdoorApplyAdapter;

  beforeEach(() => {
    adapter = new GlassdoorApplyAdapter();
  });

  describe('platform', () => {
    it('should have correct platform name', () => {
      expect(adapter.platform).toBe('glassdoor');
    });
  });

  describe('capabilities', () => {
    it('should support multi-step forms', () => {
      expect(adapter.capabilities.supportsMultiStep).toBe(true);
    });

    it('should support file upload', () => {
      expect(adapter.capabilities.supportsFileUpload).toBe(true);
    });

    it('should require login', () => {
      expect(adapter.capabilities.requiresLogin).toBe(true);
    });
  });

  describe('isApplyPage', () => {
    it('should return true for Glassdoor job URLs', () => {
      expect(adapter.isApplyPage('https://www.glassdoor.com/job-listing/engineer.htm?jl=123')).toBe(true);
      expect(adapter.isApplyPage('https://glassdoor.com/jobs/company-jobs')).toBe(true);
    });

    it('should return false for non-Glassdoor URLs', () => {
      expect(adapter.isApplyPage('https://linkedin.com/jobs/123')).toBe(false);
      expect(adapter.isApplyPage('https://indeed.com/job/456')).toBe(false);
    });
  });

  describe('getFieldLabels', () => {
    it('should return Glassdoor-specific field labels', () => {
      const labels = adapter.getFieldLabels();
      
      expect(labels.email).toBeDefined();
      expect(labels.currentCompany).toBeDefined();
      expect(labels.salaryExpectation).toBeDefined();
    });
  });
});
