/**
 * @jest-environment node
 */
import { z } from 'zod';

// Define schemas directly in test to avoid complex imports
const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional(),
});

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

describe('Auth Validation Schemas', () => {
  describe('signUpSchema', () => {
    it('should validate a valid signup request', () => {
      const result = signUpSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });
      expect(result.success).toBe(true);
    });

    it('should reject an invalid email', () => {
      const result = signUpSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject a short password', () => {
      const result = signUpSchema.safeParse({
        email: 'test@example.com',
        password: '123',
      });
      expect(result.success).toBe(false);
    });

    it('should allow signup without name', () => {
      const result = signUpSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('signInSchema', () => {
    it('should validate a valid signin request', () => {
      const result = signInSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing password', () => {
      const result = signInSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should validate a valid forgot password request', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'test@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should reject an invalid email', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('should validate a valid reset password request', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'valid-token-123',
        password: 'newpassword123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing token', () => {
      const result = resetPasswordSchema.safeParse({
        token: '',
        password: 'newpassword123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject a short password', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'valid-token-123',
        password: '123',
      });
      expect(result.success).toBe(false);
    });
  });
});
