/**
 * Form Auto-Fill Module
 * 
 * Provides automated form filling capabilities for job application forms.
 * Features:
 * - Intelligent field detection based on attributes, labels, and patterns
 * - User profile-based value mapping
 * - Multi-file upload support
 * - Reliability scoring
 * - Retry logic with exponential backoff
 * - Platform-specific automation for LinkedIn and Glassdoor
 */

// User Profile
export {
  UserProfile,
  WorkExperience,
  Education,
  Link,
  createEmptyProfile,
  validateProfile,
} from './user-profile.interface';

// Field Detection
export {
  FormFieldDetector,
  DetectedField,
  FormFieldType,
} from './field-detector';

// Form Auto-Fill
export {
  FormAutoFill,
  FormFillResult,
  FormFillOptions,
  FilledFieldResult,
  SkippedFieldResult,
  FormFillError,
} from './form-autofill';

// Application Automation
export {
  ApplicationAutomation,
  ApplicationResult,
  ApplicationConfig,
  SubmissionResult,
  RetryConfig,
  generateApplicationReport,
} from './application-automation';

// Platform-Specific Automation
export {
  LinkedInApplicationAutomation,
  applyToLinkedInJob,
} from './linkedin-automation';

export {
  GlassdoorApplicationAutomation,
  applyToGlassdoorJob,
} from './glassdoor-automation';
