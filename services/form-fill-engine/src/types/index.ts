import { Page, Locator } from 'playwright';

/**
 * Represents a job scraped from a platform
 */
export interface ScrapedJob {
  jobId: string;
  platform: string;
  url: string;
  title: string;
  company: string;
  description: string;
  location?: string;
  salary?: string;
}

/**
 * User profile data for form filling
 */
export interface UserProfile {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  linkedInUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  currentTitle?: string;
  yearsOfExperience?: number;
  education?: EducationEntry[];
  workExperience?: WorkExperienceEntry[];
  skills?: string[];
  summary?: string;
  resumeContent: string;
  coverLetterTemplate?: string;
}

/**
 * Education entry in user profile
 */
export interface EducationEntry {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
}

/**
 * Work experience entry in user profile
 */
export interface WorkExperienceEntry {
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  description?: string;
  isCurrent?: boolean;
}

/**
 * Detected form field with metadata
 */
export interface DetectedField {
  element: Locator;
  fieldType: FieldType;
  inputType: InputType;
  label: string;
  placeholder?: string;
  name?: string;
  id?: string;
  required: boolean;
  ariaLabel?: string;
  options?: string[]; // For select/radio fields
  confidenceScore: number;
}

/**
 * Semantic field types that the engine can detect
 */
export type FieldType =
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'fullName'
  | 'phone'
  | 'linkedIn'
  | 'github'
  | 'portfolio'
  | 'website'
  | 'currentTitle'
  | 'yearsExperience'
  | 'education'
  | 'workExperience'
  | 'skills'
  | 'summary'
  | 'coverLetter'
  | 'resume'
  | 'salaryExpectation'
  | 'startDate'
  | 'workAuthorization'
  | 'sponsorship'
  | 'referral'
  | 'additionalInfo'
  | 'unknown';

/**
 * HTML input types
 */
export type InputType =
  | 'text'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'date'
  | 'unknown';

/**
 * Result of a field fill operation
 */
export interface FieldFillResult {
  field: DetectedField;
  success: boolean;
  valueFilled?: string;
  error?: string;
  fallbackUsed: boolean;
}

/**
 * Reliability score breakdown
 */
export interface ReliabilityScore {
  overall: number; // 0-100
  fieldsDetected: number;
  fieldsFilled: number;
  fieldsFailed: number;
  confidenceAverage: number;
  warnings: string[];
}

/**
 * Result of a form fill attempt
 */
export interface FormFillResult {
  jobId: string;
  platform: string;
  success: boolean;
  reliability: ReliabilityScore;
  fieldResults: FieldFillResult[];
  formSubmitted: boolean;
  error?: string;
  duration: number; // ms
  timestamp: string;
}

/**
 * Configuration for form fill engine
 */
export interface FormFillConfig {
  headless: boolean;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  screenshotOnError: boolean;
  screenshotPath?: string;
  simulateHumanTyping: boolean;
  typingDelay: { min: number; max: number };
  llmServiceUrl?: string;
}

/**
 * LLM field mapping request
 */
export interface FieldMappingRequest {
  detectedField: {
    label: string;
    placeholder?: string;
    name?: string;
    id?: string;
    ariaLabel?: string;
    inputType: InputType;
    options?: string[];
  };
  userProfile: Partial<UserProfile>;
  jobContext: {
    title: string;
    company: string;
    description: string;
  };
}

/**
 * LLM field mapping response
 */
export interface FieldMappingResponse {
  fieldType: FieldType;
  suggestedValue: string;
  confidence: number;
  reasoning?: string;
}

/**
 * Interface for platform-specific form adapters
 */
export interface IPlatformAdapter {
  readonly platformName: string;

  isOnPlatform(page: Page): Promise<boolean>;
  detectApplicationForm(page: Page): Promise<boolean>;
  detectFields(page: Page): Promise<DetectedField[]>;
  fillField(page: Page, field: DetectedField, value: string): Promise<boolean>;
  uploadResume(page: Page, resumePath: string): Promise<boolean>;
  navigateToNextStep(page: Page): Promise<boolean>;
  submitApplication(page: Page): Promise<boolean>;
  isApplicationComplete(page: Page): Promise<boolean>;
  handlePopups(page: Page): Promise<void>;
}

/**
 * Logging interface for form fill operations
 */
export interface FormFillLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}
