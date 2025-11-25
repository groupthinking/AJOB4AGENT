/**
 * User Profile Interface
 * Defines the structure for user data used in form auto-fill
 */

export interface WorkExperience {
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
}

export interface Education {
  degree: string;
  fieldOfStudy?: string;
  institution: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
}

export interface Link {
  type: 'linkedin' | 'github' | 'portfolio' | 'other';
  url: string;
  label?: string;
}

export interface UserProfile {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  
  // Address
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  
  // Professional Links
  links?: Link[];
  
  // Resume/CV
  resumePath?: string;
  resumeContent?: string;
  coverLetterTemplate?: string;
  
  // Work Experience
  experience?: WorkExperience[];
  
  // Education
  education?: Education[];
  
  // Skills
  skills?: string[];
  
  // Additional Information
  summary?: string;
  yearsOfExperience?: number;
  desiredSalary?: string;
  willingToRelocate?: boolean;
  workAuthorization?: string;
  veteranStatus?: string;
  disabilityStatus?: string;
  
  // Platform-specific data
  platformData?: {
    [platform: string]: Record<string, unknown>;
  };
}

/**
 * Creates a default empty user profile
 */
export function createEmptyProfile(): UserProfile {
  return {
    firstName: '',
    lastName: '',
    email: '',
  };
}

/**
 * Validates that a user profile has minimum required fields
 */
export function validateProfile(profile: UserProfile): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!profile.firstName?.trim()) {
    errors.push('First name is required');
  }
  if (!profile.lastName?.trim()) {
    errors.push('Last name is required');
  }
  if (!profile.email?.trim()) {
    errors.push('Email is required');
  } else if (!isValidEmail(profile.email)) {
    errors.push('Invalid email format');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
