/**
 * LLM Field Matcher Service
 * Uses LLM for semantic field matching when exact matching fails
 */

import axios, { AxiosInstance } from 'axios';
import { FormField, UserProfile, FieldMapping, LLMMatchRequest, LLMMatchResponse, LLMBatchMatchRequest } from '../types';
import { createComponentLogger } from '../utils/logger';
import { withRetry } from '../utils/retry';

const logger = createComponentLogger('llm-field-matcher');

export class LLMFieldMatcher {
  private client: AxiosInstance;
  private serviceUrl: string;
  private timeout: number;
  private enabled: boolean = true;

  constructor(llmServiceUrl: string, timeout: number = 30000) {
    this.serviceUrl = llmServiceUrl;
    this.timeout = timeout;

    this.client = axios.create({
      baseURL: llmServiceUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    logger.info('LLM Field Matcher initialized', { serviceUrl: llmServiceUrl });
  }

  /**
   * Enable or disable LLM matching
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    logger.info('LLM matching', { enabled });
  }

  /**
   * Check if LLM service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      await this.client.get('/health', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Match a single field using LLM
   */
  async matchField(field: FormField, profile: UserProfile, context?: string): Promise<FieldMapping> {
    if (!this.enabled) {
      logger.debug('LLM matching disabled, returning empty mapping');
      return this.createEmptyMapping(field);
    }

    logger.debug('Matching field with LLM', { fieldId: field.id, label: field.label });

    const request: LLMMatchRequest = {
      field,
      profile,
      context
    };

    try {
      const response = await withRetry(
        async () => {
          const result = await this.client.post<LLMMatchResponse>('/match-field', request);
          return result.data;
        },
        {
          maxAttempts: 2,
          initialDelay: 500
        }
      );

      return this.responseToMapping(field, response);
    } catch (error) {
      logger.warn('LLM matching failed', {
        fieldId: field.id,
        error: error instanceof Error ? error.message : String(error)
      });

      // Graceful degradation - return empty mapping instead of throwing
      return this.createEmptyMapping(field);
    }
  }

  /**
   * Match multiple fields using LLM in a single request
   */
  async matchFields(fields: FormField[], profile: UserProfile, context?: string): Promise<FieldMapping[]> {
    if (!this.enabled) {
      logger.debug('LLM matching disabled, returning empty mappings');
      return fields.map(f => this.createEmptyMapping(f));
    }

    if (fields.length === 0) {
      return [];
    }

    logger.info('Batch matching fields with LLM', { fieldCount: fields.length });

    const request: LLMBatchMatchRequest = {
      fields,
      profile,
      context
    };

    try {
      const response = await withRetry(
        async () => {
          const result = await this.client.post<{ matches: LLMMatchResponse[] }>('/batch-match-fields', request);
          return result.data;
        },
        {
          maxAttempts: 2,
          initialDelay: 1000
        }
      );

      // Map responses to field mappings
      return fields.map((field, index) => {
        const match = response.matches[index];
        if (match) {
          return this.responseToMapping(field, match);
        }
        return this.createEmptyMapping(field);
      });
    } catch (error) {
      logger.warn('LLM batch matching failed, falling back to empty mappings', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Graceful degradation - return empty mappings
      return fields.map(f => this.createEmptyMapping(f));
    }
  }

  /**
   * Generate a natural language response for a field based on profile
   */
  async generateFieldResponse(field: FormField, profile: UserProfile, prompt?: string): Promise<string> {
    if (!this.enabled) {
      return '';
    }

    logger.debug('Generating field response', { fieldId: field.id, label: field.label });

    try {
      const response = await withRetry(
        async () => {
          const result = await this.client.post<{ response: string }>('/generate-response', {
            field,
            profile,
            prompt: prompt || `Generate an appropriate response for the form field labeled "${field.label}"`
          });
          return result.data;
        },
        {
          maxAttempts: 2,
          initialDelay: 500
        }
      );

      return response.response || '';
    } catch (error) {
      logger.warn('Failed to generate field response', {
        fieldId: field.id,
        error: error instanceof Error ? error.message : String(error)
      });
      return '';
    }
  }

  /**
   * Analyze a form and suggest optimal field mappings
   */
  async analyzeForm(
    fields: FormField[],
    profile: UserProfile
  ): Promise<{
    suggestedMappings: FieldMapping[];
    confidence: number;
    warnings: string[];
  }> {
    if (!this.enabled) {
      return {
        suggestedMappings: fields.map(f => this.createEmptyMapping(f)),
        confidence: 0,
        warnings: ['LLM service is disabled']
      };
    }

    logger.info('Analyzing form structure', { fieldCount: fields.length });

    try {
      const response = await this.client.post<{
        mappings: LLMMatchResponse[];
        overallConfidence: number;
        warnings: string[];
      }>('/analyze-form', {
        fields,
        profile
      });

      const suggestedMappings = fields.map((field, index) => {
        const match = response.data.mappings[index];
        if (match) {
          return this.responseToMapping(field, match);
        }
        return this.createEmptyMapping(field);
      });

      return {
        suggestedMappings,
        confidence: response.data.overallConfidence || 0,
        warnings: response.data.warnings || []
      };
    } catch (error) {
      logger.warn('Form analysis failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        suggestedMappings: fields.map(f => this.createEmptyMapping(f)),
        confidence: 0,
        warnings: ['LLM service unavailable']
      };
    }
  }

  /**
   * Convert LLM response to FieldMapping
   */
  private responseToMapping(field: FormField, response: LLMMatchResponse): FieldMapping {
    return {
      field,
      profilePath: response.profilePath || '',
      value: response.value || '',
      confidence: response.confidence || 0,
      source: 'llm',
      alternativeValues: response.alternatives?.map(a => a.value)
    };
  }

  /**
   * Create an empty mapping for graceful degradation
   */
  private createEmptyMapping(field: FormField): FieldMapping {
    return {
      field,
      profilePath: '',
      value: '',
      confidence: 0,
      source: 'fallback'
    };
  }

  /**
   * Build a context string from profile for LLM
   */
  buildProfileContext(profile: UserProfile): string {
    const parts: string[] = [];

    parts.push(`Name: ${profile.personalInfo.firstName} ${profile.personalInfo.lastName}`);
    parts.push(`Email: ${profile.personalInfo.email}`);
    parts.push(`Phone: ${profile.personalInfo.phone}`);
    parts.push(`Location: ${profile.personalInfo.location}`);

    if (profile.personalInfo.linkedInUrl) {
      parts.push(`LinkedIn: ${profile.personalInfo.linkedInUrl}`);
    }

    if (profile.resume.summary) {
      parts.push(`Summary: ${profile.resume.summary.substring(0, 200)}...`);
    }

    if (profile.resume.skills.length > 0) {
      parts.push(`Skills: ${profile.resume.skills.slice(0, 10).join(', ')}`);
    }

    if (profile.resume.experience.length > 0) {
      const latestExp = profile.resume.experience[0];
      parts.push(`Current/Latest Role: ${latestExp.title} at ${latestExp.company}`);
    }

    if (profile.preferences.workAuthorization) {
      parts.push(`Work Authorization: ${profile.preferences.workAuthorization}`);
    }

    return parts.join('\n');
  }
}

export default LLMFieldMatcher;
