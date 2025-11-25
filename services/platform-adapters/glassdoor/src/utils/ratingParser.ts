/**
 * Utility functions for parsing Glassdoor company ratings and review counts
 */

/**
 * Parse company rating from string to number (1-5 scale)
 * Handles formats like "4.2", "4.2 ★", "4.2/5", "4.2 stars"
 */
export function parseRating(ratingStr: string): number | undefined {
  if (!ratingStr || ratingStr.trim() === '') {
    return undefined;
  }

  // Clean up the string
  const cleaned = ratingStr
    .replace(/★/g, '')
    .replace(/stars?/gi, '')
    .replace(/\/5/g, '')
    .replace(/\s+/g, '')
    .trim();

  const rating = parseFloat(cleaned);

  // Validate rating is within expected range (1-5)
  if (isNaN(rating) || rating < 0 || rating > 5) {
    return undefined;
  }

  // Round to 1 decimal place
  return Math.round(rating * 10) / 10;
}

/**
 * Parse review count from string
 * Handles formats like "1,234 reviews", "(1.2K)", "1234", "1.2K Reviews"
 */
export function parseReviewCount(countStr: string): number | undefined {
  if (!countStr || countStr.trim() === '') {
    return undefined;
  }

  // Extract the numeric portion
  const match = countStr.match(/[\d,.]+[kKmM]?/);
  if (!match) {
    return undefined;
  }

  let numberStr = match[0].toLowerCase();
  let multiplier = 1;

  // Handle K (thousands) and M (millions) suffixes
  if (numberStr.endsWith('k')) {
    multiplier = 1000;
    numberStr = numberStr.slice(0, -1);
  } else if (numberStr.endsWith('m')) {
    multiplier = 1000000;
    numberStr = numberStr.slice(0, -1);
  }

  // Remove commas and parse
  const value = parseFloat(numberStr.replace(/,/g, ''));

  if (isNaN(value)) {
    return undefined;
  }

  return Math.round(value * multiplier);
}

/**
 * Get rating category based on numeric rating
 */
export function getRatingCategory(rating: number): 'excellent' | 'good' | 'average' | 'poor' | 'very-poor' {
  if (rating >= 4.5) return 'excellent';
  if (rating >= 4.0) return 'good';
  if (rating >= 3.0) return 'average';
  if (rating >= 2.0) return 'poor';
  return 'very-poor';
}

/**
 * Format rating for display
 */
export function formatRating(rating: number): string {
  return `${rating.toFixed(1)} ★`;
}

/**
 * Format review count for display
 */
export function formatReviewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M reviews`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K reviews`;
  }
  return `${count} review${count !== 1 ? 's' : ''}`;
}

/**
 * Validate that a rating is within expected bounds
 */
export function isValidRating(rating: number): boolean {
  return typeof rating === 'number' && 
         !isNaN(rating) && 
         rating >= 1 && 
         rating <= 5;
}

/**
 * Calculate average rating from an array of ratings
 */
export function calculateAverageRating(ratings: number[]): number | undefined {
  const validRatings = ratings.filter(isValidRating);
  
  if (validRatings.length === 0) {
    return undefined;
  }

  const sum = validRatings.reduce((acc, rating) => acc + rating, 0);
  return Math.round((sum / validRatings.length) * 10) / 10;
}

export default {
  parseRating,
  parseReviewCount,
  getRatingCategory,
  formatRating,
  formatReviewCount,
  isValidRating,
  calculateAverageRating
};
