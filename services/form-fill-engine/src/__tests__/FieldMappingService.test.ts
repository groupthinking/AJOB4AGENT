import { FieldMappingService } from '../field-mapping/FieldMappingService';
import { UserProfile, FieldType, InputType } from '../types';

describe('FieldMappingService', () => {
  let fieldMapper: FieldMappingService;
  
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
    summary: 'Experienced software engineer with a passion for building scalable applications.',
    resumeContent: 'John Doe Resume Content',
    coverLetterTemplate: 'Dear Hiring Manager, I am excited to apply for this position.',
  };

  beforeEach(() => {
    fieldMapper = new FieldMappingService();
  });

  describe('detectFieldTypeLocal', () => {
    it('should detect email fields', () => {
      const result = fieldMapper.detectFieldTypeLocal('Email Address', undefined, 'email', undefined, undefined);
      expect(result.fieldType).toBe('email');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect email fields from input type', () => {
      const result = fieldMapper.detectFieldTypeLocal('', undefined, undefined, undefined, undefined, 'email');
      expect(result.fieldType).toBe('email');
      expect(result.confidence).toBe(0.95);
    });

    it('should detect phone fields', () => {
      const result = fieldMapper.detectFieldTypeLocal('Phone Number', undefined, 'phone', undefined, undefined);
      expect(result.fieldType).toBe('phone');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect phone fields from input type', () => {
      const result = fieldMapper.detectFieldTypeLocal('', undefined, undefined, undefined, undefined, 'tel');
      expect(result.fieldType).toBe('phone');
      expect(result.confidence).toBe(0.95);
    });

    it('should detect first name fields', () => {
      const result = fieldMapper.detectFieldTypeLocal('First Name', undefined, 'firstName', undefined, undefined);
      expect(result.fieldType).toBe('firstName');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect last name fields', () => {
      const result = fieldMapper.detectFieldTypeLocal('Last Name', undefined, 'lastName', undefined, undefined);
      expect(result.fieldType).toBe('lastName');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect full name fields', () => {
      const result = fieldMapper.detectFieldTypeLocal('Your Full Name', undefined, undefined, undefined, undefined);
      expect(result.fieldType).toBe('fullName');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect LinkedIn fields', () => {
      const result = fieldMapper.detectFieldTypeLocal('LinkedIn Profile URL', undefined, 'linkedin', undefined, undefined);
      expect(result.fieldType).toBe('linkedIn');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect GitHub fields', () => {
      const result = fieldMapper.detectFieldTypeLocal('GitHub URL', undefined, 'github', undefined, undefined);
      expect(result.fieldType).toBe('github');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect cover letter fields', () => {
      const result = fieldMapper.detectFieldTypeLocal('Cover Letter', undefined, 'coverLetter', undefined, undefined);
      expect(result.fieldType).toBe('coverLetter');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect resume fields', () => {
      const result = fieldMapper.detectFieldTypeLocal('Upload Resume', undefined, 'resume', undefined, undefined);
      expect(result.fieldType).toBe('resume');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect years of experience fields', () => {
      const result = fieldMapper.detectFieldTypeLocal('Years of Experience', undefined, 'experience', undefined, undefined);
      expect(result.fieldType).toBe('yearsExperience');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect work authorization fields', () => {
      const result = fieldMapper.detectFieldTypeLocal('Are you legally authorized to work in the US?', undefined, undefined, undefined, undefined);
      expect(result.fieldType).toBe('workAuthorization');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect sponsorship fields', () => {
      const result = fieldMapper.detectFieldTypeLocal('Do you require visa sponsorship?', undefined, undefined, undefined, undefined);
      expect(result.fieldType).toBe('sponsorship');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should return unknown for unrecognized fields', () => {
      const result = fieldMapper.detectFieldTypeLocal('Random Field XYZ123', undefined, 'random', undefined, undefined);
      expect(result.fieldType).toBe('unknown');
      expect(result.confidence).toBe(0.1);
    });
  });

  describe('getValueFromProfile', () => {
    it('should return email from profile', () => {
      const value = fieldMapper.getValueFromProfile('email', mockUserProfile);
      expect(value).toBe('john.doe@example.com');
    });

    it('should return first name from profile', () => {
      const value = fieldMapper.getValueFromProfile('firstName', mockUserProfile);
      expect(value).toBe('John');
    });

    it('should return last name from profile', () => {
      const value = fieldMapper.getValueFromProfile('lastName', mockUserProfile);
      expect(value).toBe('Doe');
    });

    it('should return full name from profile', () => {
      const value = fieldMapper.getValueFromProfile('fullName', mockUserProfile);
      expect(value).toBe('John Doe');
    });

    it('should return phone from profile', () => {
      const value = fieldMapper.getValueFromProfile('phone', mockUserProfile);
      expect(value).toBe('+1-555-123-4567');
    });

    it('should return LinkedIn URL from profile', () => {
      const value = fieldMapper.getValueFromProfile('linkedIn', mockUserProfile);
      expect(value).toBe('https://linkedin.com/in/johndoe');
    });

    it('should return GitHub URL from profile', () => {
      const value = fieldMapper.getValueFromProfile('github', mockUserProfile);
      expect(value).toBe('https://github.com/johndoe');
    });

    it('should return portfolio URL from profile', () => {
      const value = fieldMapper.getValueFromProfile('portfolio', mockUserProfile);
      expect(value).toBe('https://johndoe.dev');
    });

    it('should return current title from profile', () => {
      const value = fieldMapper.getValueFromProfile('currentTitle', mockUserProfile);
      expect(value).toBe('Senior Software Engineer');
    });

    it('should return years of experience from profile', () => {
      const value = fieldMapper.getValueFromProfile('yearsExperience', mockUserProfile);
      expect(value).toBe('8');
    });

    it('should return skills from profile', () => {
      const value = fieldMapper.getValueFromProfile('skills', mockUserProfile);
      expect(value).toBe('TypeScript, React, Node.js');
    });

    it('should return summary from profile', () => {
      const value = fieldMapper.getValueFromProfile('summary', mockUserProfile);
      expect(value).toBe('Experienced software engineer with a passion for building scalable applications.');
    });

    it('should return undefined for unknown field type', () => {
      const value = fieldMapper.getValueFromProfile('unknown' as FieldType, mockUserProfile);
      expect(value).toBeUndefined();
    });
  });

  describe('detectBooleanFieldValue', () => {
    it('should return yes for work authorization questions', () => {
      const result = fieldMapper.detectBooleanFieldValue('Are you legally authorized to work in the US?');
      expect(result.value).toBe('yes');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should return no for sponsorship questions', () => {
      const result = fieldMapper.detectBooleanFieldValue('Do you require visa sponsorship?');
      expect(result.value).toBe('no');
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('should return yes for age verification questions', () => {
      const result = fieldMapper.detectBooleanFieldValue('Are you at least 18 years of age?');
      expect(result.value).toBe('yes');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should return null for ambiguous questions', () => {
      const result = fieldMapper.detectBooleanFieldValue('Would you like to receive job alerts?');
      expect(result.value).toBeNull();
    });
  });

  describe('mapFieldWithLLM', () => {
    it('should use local mapping when confidence is high', async () => {
      const result = await fieldMapper.mapFieldWithLLM({
        detectedField: {
          label: 'Email Address',
          placeholder: 'Enter your email',
          name: 'email',
          id: 'email-field',
          ariaLabel: 'Email Address',
          inputType: 'email' as InputType,
        },
        userProfile: mockUserProfile,
        jobContext: {
          title: 'Software Engineer',
          company: 'Tech Corp',
          description: 'We are looking for a software engineer...',
        },
      });

      expect(result.fieldType).toBe('email');
      expect(result.suggestedValue).toBe('john.doe@example.com');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should fall back to local mapping when LLM is not configured', async () => {
      const result = await fieldMapper.mapFieldWithLLM({
        detectedField: {
          label: 'First Name',
          inputType: 'text' as InputType,
        },
        userProfile: mockUserProfile,
        jobContext: {
          title: 'Software Engineer',
          company: 'Tech Corp',
          description: 'We are looking for a software engineer...',
        },
      });

      expect(result.fieldType).toBe('firstName');
      expect(result.suggestedValue).toBe('John');
    });
  });
});
