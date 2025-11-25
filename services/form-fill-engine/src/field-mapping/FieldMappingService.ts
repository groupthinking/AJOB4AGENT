import axios, { AxiosInstance } from 'axios';
import {
  FieldType,
  InputType,
  FieldMappingRequest,
  FieldMappingResponse,
  UserProfile,
  FormFillLogger,
} from '../types';
import { createDefaultLogger } from '../utils/DefaultLogger';

/**
 * Patterns for matching form field labels to semantic types
 */
const FIELD_PATTERNS: Record<FieldType, RegExp[]> = {
  email: [
    /email/i,
    /e-mail/i,
    /emailaddress/i,
    /email.address/i,
  ],
  firstName: [
    /first\s*name/i,
    /given\s*name/i,
    /fname/i,
    /^name$/i,
  ],
  lastName: [
    /last\s*name/i,
    /sur\s*name/i,
    /family\s*name/i,
    /lname/i,
  ],
  fullName: [
    /full\s*name/i,
    /your\s*name/i,
    /candidate\s*name/i,
    /applicant\s*name/i,
  ],
  phone: [
    /phone/i,
    /telephone/i,
    /mobile/i,
    /cell/i,
    /contact\s*number/i,
  ],
  linkedIn: [
    /linkedin/i,
    /linked\s*in/i,
    /li\s*profile/i,
    /linkedin\.com/i,
  ],
  github: [
    /github/i,
    /git\s*hub/i,
    /github\.com/i,
  ],
  portfolio: [
    /portfolio/i,
    /personal\s*site/i,
    /personal\s*website/i,
  ],
  website: [
    /website/i,
    /url/i,
    /web\s*page/i,
  ],
  currentTitle: [
    /current\s*title/i,
    /job\s*title/i,
    /position/i,
    /role/i,
    /headline/i,
  ],
  yearsExperience: [
    /years?\s*(of\s*)?experience/i,
    /experience\s*years/i,
    /how\s*many\s*years/i,
    /total\s*experience/i,
  ],
  education: [
    /education/i,
    /degree/i,
    /university/i,
    /college/i,
    /school/i,
    /academic/i,
  ],
  workExperience: [
    /work\s*experience/i,
    /employment/i,
    /previous\s*jobs?/i,
    /work\s*history/i,
  ],
  skills: [
    /skills?/i,
    /technologies/i,
    /technical\s*skills/i,
    /competencies/i,
  ],
  summary: [
    /summary/i,
    /about\s*you/i,
    /profile\s*summary/i,
    /professional\s*summary/i,
    /bio/i,
  ],
  coverLetter: [
    /cover\s*letter/i,
    /motivation/i,
    /why\s*(do\s*)?you\s*want/i,
    /interest\s*in\s*role/i,
  ],
  resume: [
    /resume/i,
    /cv/i,
    /curriculum\s*vitae/i,
    /upload\s*resume/i,
    /attach\s*resume/i,
  ],
  salaryExpectation: [
    /salary/i,
    /compensation/i,
    /pay\s*expectation/i,
    /desired\s*salary/i,
  ],
  startDate: [
    /start\s*date/i,
    /availability/i,
    /when\s*can\s*you\s*start/i,
    /available\s*from/i,
  ],
  workAuthorization: [
    /work\s*authorization/i,
    /authorized\s*to\s*work/i,
    /legally\s*authorized/i,
    /eligible\s*to\s*work/i,
    /right\s*to\s*work/i,
  ],
  sponsorship: [
    /sponsorship/i,
    /visa\s*sponsorship/i,
    /require\s*sponsorship/i,
    /immigration\s*sponsorship/i,
  ],
  referral: [
    /referral/i,
    /referred\s*by/i,
    /how\s*did\s*you\s*hear/i,
    /source/i,
  ],
  additionalInfo: [
    /additional\s*info/i,
    /other\s*info/i,
    /anything\s*else/i,
    /comments?/i,
  ],
  unknown: [],
};

/**
 * Service for LLM-enhanced field mapping
 */
export class FieldMappingService {
  private llmClient: AxiosInstance | null = null;
  private logger: FormFillLogger;
  private useLocalFallback: boolean;

  constructor(llmServiceUrl?: string, logger?: FormFillLogger) {
    this.useLocalFallback = !llmServiceUrl;
    this.logger = logger || createDefaultLogger('FieldMappingService');

    if (llmServiceUrl) {
      this.llmClient = axios.create({
        baseURL: llmServiceUrl,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  }

  /**
   * Detect field type using pattern matching (local fallback)
   */
  detectFieldTypeLocal(
    label: string,
    placeholder?: string,
    name?: string,
    id?: string,
    ariaLabel?: string,
    inputType?: InputType
  ): { fieldType: FieldType; confidence: number } {
    const textToMatch = [label, placeholder, name, id, ariaLabel]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    // Check input type hints first
    if (inputType === 'email') {
      return { fieldType: 'email', confidence: 0.95 };
    }
    if (inputType === 'tel') {
      return { fieldType: 'phone', confidence: 0.95 };
    }
    if (inputType === 'file') {
      if (/resume|cv/i.test(textToMatch)) {
        return { fieldType: 'resume', confidence: 0.9 };
      }
    }

    // Pattern matching
    for (const [fieldType, patterns] of Object.entries(FIELD_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(textToMatch)) {
          const confidence = this.calculateConfidence(pattern, textToMatch);
          return { fieldType: fieldType as FieldType, confidence };
        }
      }
    }

    return { fieldType: 'unknown', confidence: 0.1 };
  }

  /**
   * Calculate confidence based on pattern match quality
   */
  private calculateConfidence(pattern: RegExp, text: string): number {
    const match = text.match(pattern);
    if (!match) return 0.5;

    // Higher confidence if the match covers more of the text
    const matchLength = match[0].length;
    const textLength = text.length;
    const coverageRatio = matchLength / textLength;

    // Base confidence is 0.7, can go up to 0.95 based on coverage
    return Math.min(0.95, 0.7 + coverageRatio * 0.25);
  }

  /**
   * Get value from user profile based on field type
   */
  getValueFromProfile(fieldType: FieldType, profile: UserProfile): string | undefined {
    switch (fieldType) {
      case 'email':
        return profile.email;
      case 'firstName':
        return profile.firstName;
      case 'lastName':
        return profile.lastName;
      case 'fullName':
        return `${profile.firstName} ${profile.lastName}`;
      case 'phone':
        return profile.phone;
      case 'linkedIn':
        return profile.linkedInUrl;
      case 'github':
        return profile.githubUrl;
      case 'portfolio':
      case 'website':
        return profile.portfolioUrl;
      case 'currentTitle':
        return profile.currentTitle;
      case 'yearsExperience':
        return profile.yearsOfExperience?.toString();
      case 'skills':
        return profile.skills?.join(', ');
      case 'summary':
        return profile.summary;
      case 'coverLetter':
        return profile.coverLetterTemplate;
      default:
        return undefined;
    }
  }

  /**
   * Map field using LLM service for semantic understanding
   */
  async mapFieldWithLLM(request: FieldMappingRequest): Promise<FieldMappingResponse> {
    // First try local pattern matching
    const localResult = this.detectFieldTypeLocal(
      request.detectedField.label,
      request.detectedField.placeholder,
      request.detectedField.name,
      request.detectedField.id,
      request.detectedField.ariaLabel,
      request.detectedField.inputType
    );

    // If local confidence is high enough, use it
    if (localResult.confidence >= 0.85 || this.useLocalFallback) {
      const value = this.getValueFromProfile(
        localResult.fieldType,
        request.userProfile as UserProfile
      );
      return {
        fieldType: localResult.fieldType,
        suggestedValue: value || '',
        confidence: localResult.confidence,
        reasoning: 'Pattern-matched locally',
      };
    }

    // Otherwise, use LLM for semantic matching
    try {
      const response = await this.callLLMService(request);
      return response;
    } catch (error) {
      this.logger.warn('LLM mapping failed, falling back to local', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      const value = this.getValueFromProfile(
        localResult.fieldType,
        request.userProfile as UserProfile
      );
      return {
        fieldType: localResult.fieldType,
        suggestedValue: value || '',
        confidence: localResult.confidence,
        reasoning: 'Fallback to local pattern matching',
      };
    }
  }

  /**
   * Call LLM service for field mapping
   */
  private async callLLMService(request: FieldMappingRequest): Promise<FieldMappingResponse> {
    if (!this.llmClient) {
      throw new Error('LLM client not configured');
    }

    const response = await this.llmClient.post('/map-field', {
      field: request.detectedField,
      profile: request.userProfile,
      job: request.jobContext,
    });

    return response.data;
  }

  /**
   * Handle yes/no question fields based on common patterns
   */
  detectBooleanFieldValue(
    label: string,
    placeholder?: string
  ): { value: 'yes' | 'no' | null; confidence: number } {
    const text = [label, placeholder].filter(Boolean).join(' ').toLowerCase();

    // Work authorization - generally assume yes
    if (/authorized\s*to\s*work|legally\s*authorized|right\s*to\s*work|eligible\s*to\s*work/i.test(text)) {
      return { value: 'yes', confidence: 0.8 };
    }

    // Sponsorship required - generally assume no (safer default)
    if (/require.*sponsorship|need.*sponsorship|visa\s*sponsorship/i.test(text)) {
      return { value: 'no', confidence: 0.7 };
    }

    // 18+ or legal age
    if (/18\s*years|over\s*18|legal\s*age|at\s*least\s*18/i.test(text)) {
      return { value: 'yes', confidence: 0.9 };
    }

    // Willing to relocate
    if (/willing\s*to\s*relocate|relocat/i.test(text)) {
      return { value: null, confidence: 0.5 }; // Depends on user preference
    }

    return { value: null, confidence: 0.3 };
  }
}
