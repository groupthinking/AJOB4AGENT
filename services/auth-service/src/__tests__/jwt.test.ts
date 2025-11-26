// Set JWT_SECRET before importing the module
process.env.JWT_SECRET = 'test-secret-for-unit-tests-minimum-32-chars';

import { generateAccessToken, generateRefreshToken, verifyToken, decodeToken, isTokenExpired } from '../services/jwt';

describe('JWT Service', () => {
  const testPayload = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'USER',
  };

  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateAccessToken(testPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(testPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should generate different tokens for access and refresh', () => {
      const accessToken = generateAccessToken(testPayload);
      const refreshToken = generateRefreshToken(testPayload);
      
      expect(accessToken).not.toBe(refreshToken);
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const token = generateAccessToken(testPayload);
      const decoded = verifyToken(token);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.id).toBe(testPayload.id);
      expect(decoded?.email).toBe(testPayload.email);
      expect(decoded?.role).toBe(testPayload.role);
    });

    it('should return null for an invalid token', () => {
      const decoded = verifyToken('invalid-token');
      expect(decoded).toBeNull();
    });

    it('should return null for a tampered token', () => {
      const token = generateAccessToken(testPayload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      
      const decoded = verifyToken(tamperedToken);
      expect(decoded).toBeNull();
    });
  });

  describe('decodeToken', () => {
    it('should decode a token without verifying signature', () => {
      const token = generateAccessToken(testPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.id).toBe(testPayload.id);
      expect(decoded?.email).toBe(testPayload.email);
    });

    it('should return null for completely invalid tokens', () => {
      const decoded = decodeToken('not-a-token');
      expect(decoded).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for a fresh token', () => {
      const token = generateAccessToken(testPayload);
      const expired = isTokenExpired(token);
      
      expect(expired).toBe(false);
    });

    it('should return true for an invalid token', () => {
      const expired = isTokenExpired('invalid-token');
      expect(expired).toBe(true);
    });
  });
});
