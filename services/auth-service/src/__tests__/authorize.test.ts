import { Response, NextFunction } from 'express';
import { authorize, requireAdmin, requirePremiumOrAdmin } from '../middleware/authorize';
import { AuthenticatedRequest } from '../middleware/authenticate';

describe('Authorization Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock<NextFunction>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };
    mockNext = jest.fn();
    mockReq = {};
  });

  describe('authorize', () => {
    it('should return 401 if user is not authenticated', () => {
      const middleware = authorize('USER', 'ADMIN');
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Not authenticated' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if user role is not allowed', () => {
      mockReq.user = { id: '1', email: 'test@example.com', role: 'USER' };
      const middleware = authorize('ADMIN');
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next if user role is allowed', () => {
      mockReq.user = { id: '1', email: 'test@example.com', role: 'ADMIN' };
      const middleware = authorize('USER', 'ADMIN');
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should return 401 if user is not authenticated', () => {
      requireAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Not authenticated' });
    });

    it('should return 403 if user is not an admin', () => {
      mockReq.user = { id: '1', email: 'test@example.com', role: 'USER' };
      requireAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Admin access required' });
    });

    it('should call next if user is an admin', () => {
      mockReq.user = { id: '1', email: 'test@example.com', role: 'ADMIN' };
      requireAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requirePremiumOrAdmin', () => {
    it('should return 401 if user is not authenticated', () => {
      requirePremiumOrAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Not authenticated' });
    });

    it('should return 403 if user is a regular user', () => {
      mockReq.user = { id: '1', email: 'test@example.com', role: 'USER' };
      requirePremiumOrAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Premium or admin access required' });
    });

    it('should call next if user is premium', () => {
      mockReq.user = { id: '1', email: 'test@example.com', role: 'PREMIUM' };
      requirePremiumOrAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next if user is admin', () => {
      mockReq.user = { id: '1', email: 'test@example.com', role: 'ADMIN' };
      requirePremiumOrAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
