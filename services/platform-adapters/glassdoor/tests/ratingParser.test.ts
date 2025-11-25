import {
  parseRating,
  parseReviewCount,
  getRatingCategory,
  formatRating,
  formatReviewCount,
  isValidRating,
  calculateAverageRating
} from '../src/utils/ratingParser';

describe('Rating Parser Utils', () => {
  describe('parseRating', () => {
    it('should parse simple decimal rating', () => {
      expect(parseRating('4.2')).toBe(4.2);
    });

    it('should parse rating with star symbol', () => {
      expect(parseRating('4.5 ★')).toBe(4.5);
    });

    it('should parse rating with "stars" text', () => {
      expect(parseRating('4.0 stars')).toBe(4.0);
    });

    it('should parse rating with /5 suffix', () => {
      expect(parseRating('3.8/5')).toBe(3.8);
    });

    it('should return undefined for empty string', () => {
      expect(parseRating('')).toBeUndefined();
    });

    it('should return undefined for invalid rating', () => {
      expect(parseRating('not a rating')).toBeUndefined();
    });

    it('should return undefined for out of range rating', () => {
      expect(parseRating('6.0')).toBeUndefined();
      expect(parseRating('-1.0')).toBeUndefined();
    });

    it('should round to 1 decimal place', () => {
      expect(parseRating('4.25')).toBe(4.3);
      expect(parseRating('4.24')).toBe(4.2);
    });
  });

  describe('parseReviewCount', () => {
    it('should parse simple number', () => {
      expect(parseReviewCount('1234')).toBe(1234);
    });

    it('should parse number with commas', () => {
      expect(parseReviewCount('12,345 reviews')).toBe(12345);
    });

    it('should parse K suffix for thousands', () => {
      expect(parseReviewCount('1.5K reviews')).toBe(1500);
    });

    it('should parse M suffix for millions', () => {
      expect(parseReviewCount('2.5M')).toBe(2500000);
    });

    it('should handle parentheses around count', () => {
      expect(parseReviewCount('(1,234 reviews)')).toBe(1234);
    });

    it('should return undefined for empty string', () => {
      expect(parseReviewCount('')).toBeUndefined();
    });

    it('should return undefined for invalid format', () => {
      expect(parseReviewCount('many reviews')).toBeUndefined();
    });
  });

  describe('getRatingCategory', () => {
    it('should return "excellent" for 4.5+', () => {
      expect(getRatingCategory(4.5)).toBe('excellent');
      expect(getRatingCategory(5.0)).toBe('excellent');
    });

    it('should return "good" for 4.0-4.4', () => {
      expect(getRatingCategory(4.0)).toBe('good');
      expect(getRatingCategory(4.4)).toBe('good');
    });

    it('should return "average" for 3.0-3.9', () => {
      expect(getRatingCategory(3.0)).toBe('average');
      expect(getRatingCategory(3.9)).toBe('average');
    });

    it('should return "poor" for 2.0-2.9', () => {
      expect(getRatingCategory(2.0)).toBe('poor');
      expect(getRatingCategory(2.9)).toBe('poor');
    });

    it('should return "very-poor" for below 2.0', () => {
      expect(getRatingCategory(1.5)).toBe('very-poor');
      expect(getRatingCategory(1.0)).toBe('very-poor');
    });
  });

  describe('formatRating', () => {
    it('should format rating with star symbol', () => {
      expect(formatRating(4.2)).toBe('4.2 ★');
    });

    it('should always show one decimal place', () => {
      expect(formatRating(4.0)).toBe('4.0 ★');
      expect(formatRating(5)).toBe('5.0 ★');
    });
  });

  describe('formatReviewCount', () => {
    it('should format small numbers as-is', () => {
      expect(formatReviewCount(50)).toBe('50 reviews');
    });

    it('should format single review correctly', () => {
      expect(formatReviewCount(1)).toBe('1 review');
    });

    it('should format thousands with K', () => {
      expect(formatReviewCount(1500)).toBe('1.5K reviews');
    });

    it('should format millions with M', () => {
      expect(formatReviewCount(2500000)).toBe('2.5M reviews');
    });
  });

  describe('isValidRating', () => {
    it('should return true for valid ratings', () => {
      expect(isValidRating(1)).toBe(true);
      expect(isValidRating(3.5)).toBe(true);
      expect(isValidRating(5)).toBe(true);
    });

    it('should return false for out of range values', () => {
      expect(isValidRating(0)).toBe(false);
      expect(isValidRating(6)).toBe(false);
    });

    it('should return false for NaN', () => {
      expect(isValidRating(NaN)).toBe(false);
    });
  });

  describe('calculateAverageRating', () => {
    it('should calculate average of valid ratings', () => {
      expect(calculateAverageRating([4.0, 4.5, 5.0])).toBe(4.5);
    });

    it('should filter out invalid ratings', () => {
      expect(calculateAverageRating([4.0, 0, 5.0, NaN, 6.0])).toBe(4.5);
    });

    it('should return undefined for empty array', () => {
      expect(calculateAverageRating([])).toBeUndefined();
    });

    it('should return undefined for array with only invalid values', () => {
      expect(calculateAverageRating([0, 6, NaN])).toBeUndefined();
    });
  });
});
