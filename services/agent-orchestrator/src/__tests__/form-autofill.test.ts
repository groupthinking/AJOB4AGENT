import { FormFieldDetector } from '../form-autofill/field-detector';
import {
  UserProfile,
  validateProfile,
  createEmptyProfile,
} from '../form-autofill/user-profile.interface';
import { FormAutoFill } from '../form-autofill/form-autofill';
import { generateApplicationReport, ApplicationResult } from '../form-autofill/application-automation';

// Mock Playwright Page and Locator
const createMockLocator = (overrides: Record<string, unknown> = {}) => ({
  count: jest.fn().mockResolvedValue(0),
  nth: jest.fn().mockReturnThis(),
  first: jest.fn().mockReturnThis(),
  isVisible: jest.fn().mockResolvedValue(true),
  fill: jest.fn().mockResolvedValue(undefined),
  click: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
  type: jest.fn().mockResolvedValue(undefined),
  setInputFiles: jest.fn().mockResolvedValue(undefined),
  innerText: jest.fn().mockResolvedValue(''),
  textContent: jest.fn().mockResolvedValue(''),
  evaluate: jest.fn().mockResolvedValue({
    tagName: 'input',
    type: 'text',
    name: 'email',
    id: 'email',
    placeholder: 'Enter email',
    required: false,
    autocomplete: '',
    ariaLabel: '',
    ariaLabelledBy: '',
  }),
  locator: jest.fn().mockReturnThis(),
  ...overrides,
});

const createMockPage = (overrides: Record<string, unknown> = {}) => ({
  locator: jest.fn().mockReturnValue(createMockLocator()),
  waitForSelector: jest.fn().mockResolvedValue(undefined),
  waitForTimeout: jest.fn().mockResolvedValue(undefined),
  goto: jest.fn().mockResolvedValue(undefined),
  waitForLoadState: jest.fn().mockResolvedValue(undefined),
  screenshot: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('User Profile', () => {
  describe('validateProfile', () => {
    it('should validate a complete profile', () => {
      const profile: UserProfile = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      };
      
      const result = validateProfile(profile);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should return errors for missing required fields', () => {
      const profile: UserProfile = {
        firstName: '',
        lastName: '',
        email: '',
      };
      
      const result = validateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('First name is required');
      expect(result.errors).toContain('Last name is required');
      expect(result.errors).toContain('Email is required');
    });
    
    it('should return error for invalid email format', () => {
      const profile: UserProfile = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
      };
      
      const result = validateProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });
  });
  
  describe('createEmptyProfile', () => {
    it('should create an empty profile with required fields', () => {
      const profile = createEmptyProfile();
      expect(profile.firstName).toBe('');
      expect(profile.lastName).toBe('');
      expect(profile.email).toBe('');
    });
  });
});

describe('FormFieldDetector', () => {
  describe('classifyField', () => {
    let detector: FormFieldDetector;
    
    beforeEach(() => {
      const mockPage = createMockPage() as any;
      detector = new FormFieldDetector(mockPage);
    });
    
    it('should classify email fields correctly', () => {
      const result = detector.classifyField(
        'email',
        'user_email',
        'Email Address',
        'Enter your email',
        '',
        '',
        'text'
      );
      
      expect(result.fieldType).toBe('email');
      expect(result.confidence).toBeGreaterThan(0);
    });
    
    it('should classify phone fields correctly', () => {
      const result = detector.classifyField(
        'phone',
        'user_phone',
        'Phone Number',
        'Enter your phone',
        '',
        '',
        'tel'
      );
      
      expect(result.fieldType).toBe('phone');
      expect(result.confidence).toBeGreaterThan(0.9);
    });
    
    it('should classify first name fields correctly', () => {
      const result = detector.classifyField(
        'firstName',
        'first_name',
        'First Name',
        '',
        '',
        '',
        'text'
      );
      
      expect(result.fieldType).toBe('firstName');
    });
    
    it('should classify last name fields correctly', () => {
      const result = detector.classifyField(
        'lastName',
        'last_name',
        'Last Name',
        '',
        '',
        '',
        'text'
      );
      
      expect(result.fieldType).toBe('lastName');
    });
    
    it('should use autocomplete attribute for high-confidence classification', () => {
      const result = detector.classifyField(
        'random_name',
        'random_id',
        'Random Label',
        '',
        'given-name',
        '',
        'text'
      );
      
      expect(result.fieldType).toBe('firstName');
      expect(result.confidence).toBe(1.0);
    });
    
    it('should classify resume file inputs', () => {
      const result = detector.classifyField(
        'resume_upload',
        'resume',
        'Upload Resume',
        '',
        '',
        '',
        'file'
      );
      
      expect(result.fieldType).toBe('resume');
    });
    
    it('should return unknown for unrecognized fields', () => {
      const result = detector.classifyField(
        'xyz123',
        'abc456',
        'Some Random Field',
        '',
        '',
        '',
        'text'
      );
      
      expect(result.fieldType).toBe('unknown');
    });
    
    it('should classify linkedin fields', () => {
      const result = detector.classifyField(
        'linkedin_url',
        'linkedin',
        'LinkedIn Profile',
        '',
        '',
        '',
        'text'
      );
      
      expect(result.fieldType).toBe('linkedin');
    });
    
    it('should classify github fields', () => {
      const result = detector.classifyField(
        'github_url',
        'github',
        'GitHub Profile',
        '',
        '',
        '',
        'text'
      );
      
      expect(result.fieldType).toBe('github');
    });
  });
});

describe('FormAutoFill', () => {
  describe('getValueForField', () => {
    let formAutoFill: FormAutoFill;
    const userProfile: UserProfile = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '555-123-4567',
      address: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        country: 'United States',
      },
      links: [
        { type: 'linkedin', url: 'https://linkedin.com/in/johndoe' },
        { type: 'github', url: 'https://github.com/johndoe' },
        { type: 'portfolio', url: 'https://johndoe.com' },
      ],
      skills: ['JavaScript', 'TypeScript', 'Python'],
      yearsOfExperience: 5,
      desiredSalary: '$150,000',
      resumePath: '/path/to/resume.pdf',
      education: [
        {
          degree: 'Bachelor of Science',
          fieldOfStudy: 'Computer Science',
          institution: 'Stanford University',
        },
      ],
    };
    
    beforeEach(() => {
      const mockPage = createMockPage() as any;
      formAutoFill = new FormAutoFill(mockPage, userProfile);
    });
    
    it('should return email value', () => {
      expect(formAutoFill.getValueForField('email')).toBe('john.doe@example.com');
    });
    
    it('should return firstName value', () => {
      expect(formAutoFill.getValueForField('firstName')).toBe('John');
    });
    
    it('should return lastName value', () => {
      expect(formAutoFill.getValueForField('lastName')).toBe('Doe');
    });
    
    it('should return fullName value', () => {
      expect(formAutoFill.getValueForField('fullName')).toBe('John Doe');
    });
    
    it('should return phone value', () => {
      expect(formAutoFill.getValueForField('phone')).toBe('555-123-4567');
    });
    
    it('should return address values', () => {
      expect(formAutoFill.getValueForField('address')).toBe('123 Main St');
      expect(formAutoFill.getValueForField('city')).toBe('San Francisco');
      expect(formAutoFill.getValueForField('state')).toBe('CA');
      expect(formAutoFill.getValueForField('zipCode')).toBe('94102');
      expect(formAutoFill.getValueForField('country')).toBe('United States');
    });
    
    it('should return linkedin value', () => {
      expect(formAutoFill.getValueForField('linkedin')).toBe('https://linkedin.com/in/johndoe');
    });
    
    it('should return github value', () => {
      expect(formAutoFill.getValueForField('github')).toBe('https://github.com/johndoe');
    });
    
    it('should return portfolio value', () => {
      expect(formAutoFill.getValueForField('portfolio')).toBe('https://johndoe.com');
    });
    
    it('should return skills value', () => {
      expect(formAutoFill.getValueForField('skills')).toBe('JavaScript, TypeScript, Python');
    });
    
    it('should return experience value', () => {
      expect(formAutoFill.getValueForField('experience')).toBe('5');
    });
    
    it('should return salary value', () => {
      expect(formAutoFill.getValueForField('salary')).toBe('$150,000');
    });
    
    it('should return resume value', () => {
      expect(formAutoFill.getValueForField('resume')).toBe('/path/to/resume.pdf');
    });
    
    it('should return education value', () => {
      const education = formAutoFill.getValueForField('education');
      expect(education).toContain('Bachelor of Science');
      expect(education).toContain('Computer Science');
      expect(education).toContain('Stanford University');
    });
    
    it('should return undefined for unknown field types', () => {
      expect(formAutoFill.getValueForField('unknown')).toBeUndefined();
    });
  });
});

describe('generateApplicationReport', () => {
  it('should generate a summary report for application results', () => {
    const results: ApplicationResult[] = [
      {
        jobId: 'job1',
        platform: 'linkedin',
        jobUrl: 'https://linkedin.com/jobs/1',
        status: 'success',
        formFillResult: {
          success: true,
          filledFields: [{ fieldType: 'email', fieldName: 'email', value: 'test@test.com', confidence: 0.9 }],
          skippedFields: [],
          errors: [],
          reliabilityScore: 0.95,
          timestamp: new Date(),
        },
        retryCount: 0,
        startTime: new Date(),
        endTime: new Date(),
        errors: [],
        warnings: [],
      },
      {
        jobId: 'job2',
        platform: 'glassdoor',
        jobUrl: 'https://glassdoor.com/jobs/2',
        status: 'partial',
        formFillResult: {
          success: false,
          filledFields: [],
          skippedFields: [],
          errors: [{ fieldType: 'resume', fieldName: 'resume', error: 'Upload failed' }],
          reliabilityScore: 0.5,
          timestamp: new Date(),
        },
        retryCount: 2,
        startTime: new Date(),
        endTime: new Date(),
        errors: ['Upload failed'],
        warnings: [],
      },
      {
        jobId: 'job3',
        platform: 'linkedin',
        jobUrl: 'https://linkedin.com/jobs/3',
        status: 'failed',
        retryCount: 3,
        startTime: new Date(),
        endTime: new Date(),
        errors: ['Form not found'],
        warnings: [],
      },
    ];
    
    const report = generateApplicationReport(results);
    
    expect(report.summary.total).toBe(3);
    expect(report.summary.successful).toBe(1);
    expect(report.summary.partial).toBe(1);
    expect(report.summary.failed).toBe(1);
    expect(report.summary.totalRetries).toBe(5);
    expect(report.summary.averageReliabilityScore).toBeCloseTo(0.725, 2);
    expect(report.details).toHaveLength(3);
  });
  
  it('should handle empty results', () => {
    const report = generateApplicationReport([]);
    
    expect(report.summary.total).toBe(0);
    expect(report.summary.successful).toBe(0);
    expect(report.summary.averageReliabilityScore).toBe(0);
  });
});
