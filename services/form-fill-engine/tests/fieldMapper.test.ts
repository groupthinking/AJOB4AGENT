/**
 * Field Mapper Tests
 */

import { FieldMapper } from '../src/services/FieldMapper';
import { FormField, UserProfile } from '../src/types';

describe('FieldMapper', () => {
  let mapper: FieldMapper;
  const mockProfile: UserProfile = {
    personalInfo: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-123-4567',
      location: 'San Francisco, CA',
      linkedInUrl: 'https://linkedin.com/in/johndoe',
      portfolioUrl: 'https://johndoe.dev',
      githubUrl: 'https://github.com/johndoe'
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
    mapper = new FieldMapper();
  });

  describe('mapField', () => {
    it('should map email field correctly', () => {
      const field: FormField = {
        id: 'email',
        name: 'email',
        type: 'email',
        label: 'Email Address',
        required: true,
        selector: '#email'
      };

      const mapping = mapper.mapField(field, mockProfile);
      
      expect(mapping.value).toBe('john.doe@example.com');
      expect(mapping.confidence).toBeGreaterThan(0.8);
      expect(mapping.profilePath).toBe('personalInfo.email');
    });

    it('should map phone field correctly', () => {
      const field: FormField = {
        id: 'phone',
        name: 'phone',
        type: 'tel',
        label: 'Phone Number',
        required: true,
        selector: '#phone'
      };

      const mapping = mapper.mapField(field, mockProfile);
      
      expect(mapping.value).toBe('+1-555-123-4567');
      expect(mapping.confidence).toBeGreaterThan(0.8);
    });

    it('should map first name field correctly', () => {
      const field: FormField = {
        id: 'firstName',
        name: 'firstName',
        type: 'text',
        label: 'First Name',
        required: true,
        selector: '#firstName'
      };

      const mapping = mapper.mapField(field, mockProfile);
      
      expect(mapping.value).toBe('John');
      expect(mapping.confidence).toBeGreaterThan(0.8);
    });

    it('should map last name field correctly', () => {
      const field: FormField = {
        id: 'lastName',
        name: 'lastName',
        type: 'text',
        label: 'Last Name',
        required: true,
        selector: '#lastName'
      };

      const mapping = mapper.mapField(field, mockProfile);
      
      expect(mapping.value).toBe('Doe');
      expect(mapping.confidence).toBeGreaterThan(0.8);
    });

    it('should map LinkedIn URL field correctly', () => {
      const field: FormField = {
        id: 'linkedin',
        name: 'linkedin',
        type: 'url',
        label: 'LinkedIn Profile URL',
        required: false,
        selector: '#linkedin'
      };

      const mapping = mapper.mapField(field, mockProfile);
      
      expect(mapping.value).toBe('https://linkedin.com/in/johndoe');
    });

    it('should map location field correctly', () => {
      const field: FormField = {
        id: 'location',
        name: 'location',
        type: 'text',
        label: 'Location',
        required: false,
        selector: '#location'
      };

      const mapping = mapper.mapField(field, mockProfile);
      
      expect(mapping.value).toBe('San Francisco, CA');
    });

    it('should map salary expectation field', () => {
      const field: FormField = {
        id: 'salary',
        name: 'salary',
        type: 'text',
        label: 'Expected Salary',
        required: false,
        selector: '#salary'
      };

      const mapping = mapper.mapField(field, mockProfile);
      
      expect(mapping.value).toBe('$150,000');
    });

    it('should return low confidence for unmapped fields', () => {
      const field: FormField = {
        id: 'unknown',
        name: 'unknownField',
        type: 'text',
        label: 'Some Random Field',
        required: false,
        selector: '#unknown'
      };

      const mapping = mapper.mapField(field, mockProfile);
      
      expect(mapping.confidence).toBe(0);
    });
  });

  describe('mapFields', () => {
    it('should map multiple fields at once', () => {
      const fields: FormField[] = [
        { id: 'email', name: 'email', type: 'email', label: 'Email', required: true, selector: '#email' },
        { id: 'phone', name: 'phone', type: 'tel', label: 'Phone', required: true, selector: '#phone' },
        { id: 'firstName', name: 'firstName', type: 'text', label: 'First Name', required: true, selector: '#firstName' }
      ];

      const result = mapper.mapFields(fields, mockProfile);
      
      expect(result.mappings.length).toBe(3);
      expect(result.unmappedFields.length).toBe(0);
      expect(result.averageConfidence).toBeGreaterThan(0.8);
    });

    it('should identify unmapped fields', () => {
      const fields: FormField[] = [
        { id: 'email', name: 'email', type: 'email', label: 'Email', required: true, selector: '#email' },
        { id: 'unknown', name: 'unknownField', type: 'text', label: 'Random Field', required: false, selector: '#unknown' }
      ];

      const result = mapper.mapFields(fields, mockProfile);
      
      expect(result.mappings.length).toBe(2);
      expect(result.unmappedFields.length).toBe(1);
    });
  });

  describe('setFallbacks', () => {
    it('should use fallback values for unmapped fields', () => {
      mapper.setFallbacks({
        'random field': 'Default Value'
      });

      const field: FormField = {
        id: 'random',
        name: 'random',
        type: 'text',
        label: 'Random Field',
        required: false,
        selector: '#random'
      };

      const mapping = mapper.mapField(field, mockProfile);
      
      expect(mapping.value).toBe('Default Value');
      expect(mapping.source).toBe('fallback');
    });
  });

  describe('matchSelectOption', () => {
    it('should find exact match in options', () => {
      const field: FormField = {
        id: 'experience',
        name: 'experience',
        type: 'select',
        label: 'Years of Experience',
        required: true,
        selector: '#experience',
        options: ['0-1 years', '2-4 years', '5-7 years', '8-10 years', '10+ years']
      };

      const match = mapper.matchSelectOption(field, '5-7 years');
      expect(match).toBe('5-7 years');
    });

    it('should find partial match in options', () => {
      const field: FormField = {
        id: 'auth',
        name: 'auth',
        type: 'select',
        label: 'Work Authorization',
        required: true,
        selector: '#auth',
        options: ['US Citizen', 'Green Card', 'Work Visa', 'Student Visa']
      };

      const match = mapper.matchSelectOption(field, 'citizen');
      expect(match).toBe('US Citizen');
    });

    it('should return null for no match', () => {
      const field: FormField = {
        id: 'test',
        name: 'test',
        type: 'select',
        label: 'Test',
        required: true,
        selector: '#test',
        options: ['Option A', 'Option B', 'Option C']
      };

      const match = mapper.matchSelectOption(field, 'XYZ');
      expect(match).toBeNull();
    });
  });
});
