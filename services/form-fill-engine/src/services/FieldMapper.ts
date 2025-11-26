/**
 * Field Mapper Service
 * Maps user profile data to form fields
 */

import { FormField, UserProfile, FieldMapping, MappingResult } from '../types';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('field-mapper');

/**
 * Profile path mappings for common field patterns
 */
const PROFILE_PATH_MAPPINGS: Record<string, string> = {
  email: 'personalInfo.email',
  phone: 'personalInfo.phone',
  firstName: 'personalInfo.firstName',
  lastName: 'personalInfo.lastName',
  fullName: 'personalInfo.firstName,personalInfo.lastName',
  location: 'personalInfo.location',
  linkedin: 'personalInfo.linkedInUrl',
  github: 'personalInfo.githubUrl',
  portfolio: 'personalInfo.portfolioUrl',
  summary: 'resume.summary',
  skills: 'resume.skills',
  authorization: 'preferences.workAuthorization',
  sponsorship: 'preferences.requiresSponsorship',
  relocate: 'preferences.willingToRelocate',
  salary: 'preferences.salaryExpectation',
  startDate: 'preferences.startDate'
};

/**
 * Common field label patterns for exact matching
 */
const FIELD_LABEL_PATTERNS: Record<string, RegExp> = {
  email: /^(email|e-mail|correo)(\s*(address|addr))?$/i,
  phone: /^(phone|telephone|tel|mobile|cell)(\s*(number|no|#))?$/i,
  firstName: /^(first|given)\s*(name)?$/i,
  lastName: /^(last|sur|family)\s*(name)?$/i,
  fullName: /^(full\s*)?name$/i,
  location: /^(location|city|address)$/i,
  linkedin: /^(linkedin|linked\s*in)(\s*(url|profile|link))?$/i,
  github: /^(github|git\s*hub)(\s*(url|profile|link))?$/i,
  portfolio: /^(portfolio|website|personal\s*site)(\s*(url|link))?$/i,
  salary: /^(salary|compensation|desired\s*(salary|pay))$/i,
  startDate: /^(start\s*date|availability|when.*available)$/i,
  authorization: /^(work\s*authorization|authorized|eligible)$/i,
  sponsorship: /^(sponsor|sponsorship|visa\s*support)$/i
};

export class FieldMapper {
  private fallbackValues: Map<string, string> = new Map();

  constructor(fallbacks?: Record<string, string>) {
    if (fallbacks) {
      this.setFallbacks(fallbacks);
    }
  }

  /**
   * Set fallback values for unmapped fields
   */
  setFallbacks(fallbacks: Record<string, string>): void {
    for (const [key, value] of Object.entries(fallbacks)) {
      this.fallbackValues.set(key.toLowerCase(), value);
    }
  }

  /**
   * Map a single field to profile data
   */
  mapField(field: FormField, profile: UserProfile): FieldMapping {
    logger.debug('Mapping field', { fieldId: field.id, label: field.label });

    // Try exact pattern matching first
    const exactMatch = this.tryExactMatch(field, profile);
    if (exactMatch) {
      logger.debug('Exact match found', { fieldId: field.id, path: exactMatch.profilePath });
      return exactMatch;
    }

    // Try fuzzy matching based on label keywords
    const fuzzyMatch = this.tryFuzzyMatch(field, profile);
    if (fuzzyMatch) {
      logger.debug('Fuzzy match found', { fieldId: field.id, path: fuzzyMatch.profilePath });
      return fuzzyMatch;
    }

    // Try type-based matching
    const typeMatch = this.tryTypeMatch(field, profile);
    if (typeMatch) {
      logger.debug('Type match found', { fieldId: field.id, path: typeMatch.profilePath });
      return typeMatch;
    }

    // Use fallback value if available
    const fallbackMatch = this.tryFallback(field);
    if (fallbackMatch) {
      logger.debug('Using fallback value', { fieldId: field.id });
      return fallbackMatch;
    }

    // Return empty mapping with low confidence
    return {
      field,
      profilePath: '',
      value: '',
      confidence: 0,
      source: 'fallback'
    };
  }

  /**
   * Map multiple fields to profile data
   */
  mapFields(fields: FormField[], profile: UserProfile): MappingResult {
    logger.info('Mapping fields', { fieldCount: fields.length });

    const mappings: FieldMapping[] = [];
    const unmappedFields: FormField[] = [];

    for (const field of fields) {
      const mapping = this.mapField(field, profile);
      mappings.push(mapping);

      if (mapping.confidence === 0 || !mapping.value) {
        unmappedFields.push(field);
      }
    }

    const averageConfidence = this.calculateAverageConfidence(mappings);

    logger.info('Field mapping complete', {
      mapped: mappings.length - unmappedFields.length,
      unmapped: unmappedFields.length,
      averageConfidence
    });

    return {
      mappings,
      unmappedFields,
      averageConfidence,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Try exact pattern matching
   */
  private tryExactMatch(field: FormField, profile: UserProfile): FieldMapping | null {
    const label = field.label.toLowerCase().trim();

    for (const [fieldType, pattern] of Object.entries(FIELD_LABEL_PATTERNS)) {
      if (pattern.test(label)) {
        const profilePath = PROFILE_PATH_MAPPINGS[fieldType];
        if (profilePath) {
          const value = this.getProfileValue(profile, profilePath);
          if (value) {
            return {
              field,
              profilePath,
              value,
              confidence: 0.95,
              source: 'exact'
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Try fuzzy matching based on label keywords
   */
  private tryFuzzyMatch(field: FormField, profile: UserProfile): FieldMapping | null {
    const label = field.label.toLowerCase();
    const name = field.name?.toLowerCase() || '';
    const placeholder = field.placeholder?.toLowerCase() || '';
    const ariaLabel = field.ariaLabel?.toLowerCase() || '';

    const searchText = `${label} ${name} ${placeholder} ${ariaLabel}`;

    // Check for common keywords
    const keywords: Array<{ pattern: RegExp; path: string; confidence: number }> = [
      { pattern: /email/i, path: 'personalInfo.email', confidence: 0.85 },
      { pattern: /phone|tel|mobile|cell/i, path: 'personalInfo.phone', confidence: 0.85 },
      { pattern: /first.*name|given.*name/i, path: 'personalInfo.firstName', confidence: 0.85 },
      { pattern: /last.*name|sur.*name|family.*name/i, path: 'personalInfo.lastName', confidence: 0.85 },
      { pattern: /linkedin/i, path: 'personalInfo.linkedInUrl', confidence: 0.85 },
      { pattern: /github/i, path: 'personalInfo.githubUrl', confidence: 0.85 },
      { pattern: /portfolio|website/i, path: 'personalInfo.portfolioUrl', confidence: 0.80 },
      { pattern: /location|city|address/i, path: 'personalInfo.location', confidence: 0.75 },
      { pattern: /salary|compensation|pay/i, path: 'preferences.salaryExpectation', confidence: 0.80 },
      { pattern: /start.*date|availability|when.*start/i, path: 'preferences.startDate', confidence: 0.80 },
      { pattern: /summary|about|objective/i, path: 'resume.summary', confidence: 0.75 },
      { pattern: /skills|technologies|expertise/i, path: 'resume.skills', confidence: 0.70 },
      { pattern: /authorization|authorized|eligible/i, path: 'preferences.workAuthorization', confidence: 0.80 }
    ];

    for (const { pattern, path, confidence } of keywords) {
      if (pattern.test(searchText)) {
        const value = this.getProfileValue(profile, path);
        if (value) {
          return {
            field,
            profilePath: path,
            value,
            confidence,
            source: 'exact'
          };
        }
      }
    }

    return null;
  }

  /**
   * Try type-based matching
   */
  private tryTypeMatch(field: FormField, profile: UserProfile): FieldMapping | null {
    switch (field.type) {
      case 'email':
        return {
          field,
          profilePath: 'personalInfo.email',
          value: profile.personalInfo.email,
          confidence: 0.90,
          source: 'exact'
        };

      case 'tel':
        return {
          field,
          profilePath: 'personalInfo.phone',
          value: profile.personalInfo.phone,
          confidence: 0.90,
          source: 'exact'
        };

      case 'url': {
        // Try to determine which URL based on label
        const urlLabel = field.label.toLowerCase();
        if (urlLabel.includes('linkedin')) {
          const urlValue = profile.personalInfo.linkedInUrl;
          if (urlValue) {
            return {
              field,
              profilePath: 'personalInfo.linkedInUrl',
              value: urlValue,
              confidence: 0.85,
              source: 'exact'
            };
          }
        }
        if (urlLabel.includes('github')) {
          const ghValue = profile.personalInfo.githubUrl;
          if (ghValue) {
            return {
              field,
              profilePath: 'personalInfo.githubUrl',
              value: ghValue,
              confidence: 0.85,
              source: 'exact'
            };
          }
        }
        if (urlLabel.includes('portfolio') || urlLabel.includes('website')) {
          const portValue = profile.personalInfo.portfolioUrl;
          if (portValue) {
            return {
              field,
              profilePath: 'personalInfo.portfolioUrl',
              value: portValue,
              confidence: 0.80,
              source: 'exact'
            };
          }
        }
        break;
      }

      case 'checkbox': {
        // Handle sponsorship and relocation checkboxes
        if (field.label.toLowerCase().includes('sponsor')) {
          const sponsorValue = profile.preferences.requiresSponsorship;
          return {
            field,
            profilePath: 'preferences.requiresSponsorship',
            value: sponsorValue ? 'true' : 'false',
            confidence: 0.80,
            source: 'exact'
          };
        }
        if (field.label.toLowerCase().includes('relocat')) {
          const relocateValue = profile.preferences.willingToRelocate;
          return {
            field,
            profilePath: 'preferences.willingToRelocate',
            value: relocateValue ? 'true' : 'false',
            confidence: 0.80,
            source: 'exact'
          };
        }
        break;
      }
    }

    return null;
  }

  /**
   * Try to use a fallback value
   */
  private tryFallback(field: FormField): FieldMapping | null {
    const label = field.label.toLowerCase();
    const name = field.name?.toLowerCase() || '';

    const fallbackValue = this.fallbackValues.get(label) || this.fallbackValues.get(name);
    if (fallbackValue) {
      return {
        field,
        profilePath: '',
        value: fallbackValue,
        confidence: 0.5,
        source: 'fallback'
      };
    }

    return null;
  }

  /**
   * Get a value from the user profile using a dot-notation path
   */
  private getProfileValue(profile: UserProfile, path: string): string {
    // Handle comma-separated paths (e.g., for full name)
    if (path.includes(',')) {
      const paths = path.split(',');
      const values = paths.map(p => this.getProfileValue(profile, p.trim()));
      return values.filter(v => v).join(' ');
    }

    const parts = path.split('.');
    let current: unknown = profile;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return '';
      }
      if (typeof current !== 'object') {
        return '';
      }
      current = (current as Record<string, unknown>)[part];
    }

    if (Array.isArray(current)) {
      return current.join(', ');
    }

    if (typeof current === 'boolean') {
      return current ? 'Yes' : 'No';
    }

    return current !== null && current !== undefined ? String(current) : '';
  }

  /**
   * Calculate average confidence across all mappings
   */
  private calculateAverageConfidence(mappings: FieldMapping[]): number {
    if (mappings.length === 0) return 0;

    const sum = mappings.reduce((acc, m) => acc + m.confidence, 0);
    return Math.round((sum / mappings.length) * 100) / 100;
  }

  /**
   * Get the best matching value for a select field
   */
  matchSelectOption(field: FormField, targetValue: string): string | null {
    if (!field.options || field.options.length === 0) {
      return null;
    }

    const normalizedTarget = targetValue.toLowerCase().trim();

    // Try exact match first
    const exactMatch = field.options.find(
      opt => opt.toLowerCase().trim() === normalizedTarget
    );
    if (exactMatch) return exactMatch;

    // Try partial match
    const partialMatch = field.options.find(
      opt => opt.toLowerCase().includes(normalizedTarget) ||
             normalizedTarget.includes(opt.toLowerCase())
    );
    if (partialMatch) return partialMatch;

    // Try word match
    const targetWords = normalizedTarget.split(/\s+/);
    for (const option of field.options) {
      const optionWords = option.toLowerCase().split(/\s+/);
      const matchedWords = targetWords.filter(w => 
        optionWords.some(ow => ow.includes(w) || w.includes(ow))
      );
      if (matchedWords.length >= targetWords.length / 2) {
        return option;
      }
    }

    return null;
  }
}

export default FieldMapper;
