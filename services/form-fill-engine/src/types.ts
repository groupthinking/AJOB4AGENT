/**
 * Form Fill Engine Types
 * Core TypeScript interfaces for the form auto-fill system
 */

// ===== User Profile Types =====

export interface WorkExperience {
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
  highlights?: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
  achievements?: string[];
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedInUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
}

export interface Resume {
  summary: string;
  experience: WorkExperience[];
  education: Education[];
  skills: string[];
  certifications?: string[];
  languages?: string[];
}

export interface Preferences {
  salaryExpectation?: string;
  startDate?: string;
  workAuthorization?: string;
  requiresSponsorship?: boolean;
  willingToRelocate?: boolean;
  remotePreference?: 'remote' | 'hybrid' | 'onsite' | 'flexible';
}

export interface UserProfile {
  personalInfo: PersonalInfo;
  resume: Resume;
  preferences: Preferences;
}

// ===== Form Field Types =====

export type FieldType = 'text' | 'email' | 'tel' | 'select' | 'radio' | 'checkbox' | 'file' | 'textarea' | 'number' | 'date' | 'url';

export interface FormField {
  id: string;
  name: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
  selector: string;
  placeholder?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  ariaLabel?: string;
}

export interface DetectedForm {
  fields: FormField[];
  formSelector: string;
  submitSelector?: string;
  platform: string;
  url: string;
  isMultiStep: boolean;
  currentStep?: number;
  totalSteps?: number;
}

// ===== Field Mapping Types =====

export type MappingSource = 'exact' | 'llm' | 'fallback' | 'user_input';

export interface FieldMapping {
  field: FormField;
  profilePath: string;
  value: string;
  confidence: number;
  source: MappingSource;
  alternativeValues?: string[];
}

export interface MappingResult {
  mappings: FieldMapping[];
  unmappedFields: FormField[];
  averageConfidence: number;
  timestamp: string;
}

// ===== Application Result Types =====

export type ApplicationStatus = 'success' | 'partial' | 'failed' | 'pending' | 'dry_run';

export interface ApplicationResult {
  jobId: string;
  jobUrl: string;
  status: ApplicationStatus;
  fieldsCompleted: number;
  fieldsFailed: number;
  fieldMappings: FieldMapping[];
  screenshot?: string;
  errorMessage?: string;
  errorStack?: string;
  submittedAt: string;
  duration: number;
  platform: string;
  attempts: number;
}

export interface BatchApplicationResult {
  results: ApplicationResult[];
  totalJobs: number;
  successCount: number;
  partialCount: number;
  failedCount: number;
  startedAt: string;
  completedAt: string;
  totalDuration: number;
}

// ===== Job Types =====

export interface Job {
  id: string;
  url: string;
  title?: string;
  company?: string;
  location?: string;
  platform: string;
  metadata?: Record<string, unknown>;
}

// ===== Configuration Types =====

export interface FormFillConfig {
  headless: boolean;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  screenshotOnComplete: boolean;
  screenshotOnError: boolean;
  dryRun: boolean;
  llmServiceUrl: string;
  maxConcurrent: number;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  slowMo?: number;
  debug?: boolean;
}

export const DEFAULT_CONFIG: FormFillConfig = {
  headless: true,
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  screenshotOnComplete: true,
  screenshotOnError: true,
  dryRun: false,
  llmServiceUrl: 'http://localhost:8002',
  maxConcurrent: 1,
  viewport: {
    width: 1280,
    height: 720
  },
  debug: false
};

// ===== LLM Service Types =====

export interface LLMMatchRequest {
  field: FormField;
  profile: UserProfile;
  context?: string;
}

export interface LLMMatchResponse {
  profilePath: string;
  value: string;
  confidence: number;
  reasoning?: string;
  alternatives?: Array<{
    profilePath: string;
    value: string;
    confidence: number;
  }>;
}

export interface LLMBatchMatchRequest {
  fields: FormField[];
  profile: UserProfile;
  context?: string;
}

export interface LLMBatchMatchResponse {
  matches: LLMMatchResponse[];
}

// ===== Adapter Types =====

export interface AdapterCapabilities {
  supportsMultiStep: boolean;
  supportsFileUpload: boolean;
  supportsScreenshot: boolean;
  requiresLogin: boolean;
  platformName: string;
  platformUrl: string;
}

// ===== Event Types =====

export type FormFillEvent = 
  | 'field:detected'
  | 'field:mapped'
  | 'field:filled'
  | 'field:failed'
  | 'form:submitted'
  | 'form:error'
  | 'step:completed'
  | 'application:started'
  | 'application:completed';

export interface FormFillEventPayload {
  event: FormFillEvent;
  timestamp: string;
  jobId?: string;
  field?: FormField;
  mapping?: FieldMapping;
  error?: Error;
  metadata?: Record<string, unknown>;
}

// ===== Error Types =====

export class FormFillError extends Error {
  constructor(
    message: string,
    public code: string,
    public field?: FormField,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'FormFillError';
  }
}

export class FieldDetectionError extends FormFillError {
  constructor(message: string, field?: FormField) {
    super(message, 'FIELD_DETECTION_ERROR', field, true);
    this.name = 'FieldDetectionError';
  }
}

export class FieldMappingError extends FormFillError {
  constructor(message: string, field?: FormField) {
    super(message, 'FIELD_MAPPING_ERROR', field, true);
    this.name = 'FieldMappingError';
  }
}

export class FormSubmissionError extends FormFillError {
  constructor(message: string) {
    super(message, 'FORM_SUBMISSION_ERROR', undefined, false);
    this.name = 'FormSubmissionError';
  }
}

export class LLMServiceError extends FormFillError {
  constructor(message: string) {
    super(message, 'LLM_SERVICE_ERROR', undefined, true);
    this.name = 'LLMServiceError';
  }
}

export class AdapterNotFoundError extends FormFillError {
  constructor(platform: string) {
    super(`No adapter found for platform: ${platform}`, 'ADAPTER_NOT_FOUND', undefined, false);
    this.name = 'AdapterNotFoundError';
  }
}
