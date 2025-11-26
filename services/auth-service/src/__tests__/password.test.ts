import { hashPassword, verifyPassword, isPasswordStrong } from '../services/password';

describe('Password Service', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for the same password', async () => {
      const password = 'TestPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword('WrongPassword123', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('isPasswordStrong', () => {
    it('should reject passwords shorter than 8 characters', () => {
      const result = isPasswordStrong('Short1');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('at least 8 characters');
    });

    it('should reject passwords without uppercase letters', () => {
      const result = isPasswordStrong('lowercase123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('uppercase');
    });

    it('should reject passwords without lowercase letters', () => {
      const result = isPasswordStrong('UPPERCASE123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('lowercase');
    });

    it('should reject passwords without numbers', () => {
      const result = isPasswordStrong('NoNumbersHere');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('number');
    });

    it('should accept valid strong passwords', () => {
      const result = isPasswordStrong('ValidPass123');
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });
  });
});
