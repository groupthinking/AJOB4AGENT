import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { userStore } from '../db/user-store';
import { JwtPayload, User } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Extended Request interface with user data
export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: Omit<User, 'password_hash'>;
  jwtPayload?: JwtPayload;
}

// JWT Authentication middleware
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'No authentication token provided',
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      const user = await userStore.findById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'User not found',
        });
      }

      // Attach user info to request
      req.userId = user.id;
      req.jwtPayload = decoded;
      
      // Sanitize user (remove password_hash)
      const { password_hash, ...sanitizedUser } = user;
      req.user = sanitizedUser;
      
      next();
    } catch (jwtError) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed',
    });
  }
};

// Optional authentication - doesn't fail if no token
export const optionalAuthenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      const user = await userStore.findById(decoded.userId);
      
      if (user) {
        req.userId = user.id;
        req.jwtPayload = decoded;
        const { password_hash, ...sanitizedUser } = user;
        req.user = sanitizedUser;
      }
    } catch (jwtError) {
      // Token invalid, but continue without auth
      console.log('Optional auth: Invalid token provided');
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};

// Admin-only middleware (must be used after authenticate)
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Admin access required',
    });
  }
  next();
};

// Subscription check middleware (must be used after authenticate)
export const subscriptionCheck = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized. No user identified.',
    });
  }

  const user = req.user;

  if (user.plan === 'ENTERPRISE' || user.plan === 'PRO') {
    // PRO and ENTERPRISE have effectively unlimited applications for this check
    console.log(`[Auth] Access GRANTED for ${user.plan} user ${user.id}.`);
    return next();
  }

  // Default to PILOT plan logic
  if (user.application_credits > 0) {
    console.log(`[Auth] Access GRANTED for PILOT user ${user.id}. Credits remaining: ${user.application_credits}`);
    return next();
  } else {
    console.log(`[Auth] Access DENIED for PILOT user ${user.id}. No credits remaining.`);
    return res.status(429).json({
      status: 'error',
      message: 'You have used all your free application credits. Please upgrade to PRO to continue.',
    });
  }
};

// API Key authentication (for service-to-service communication)
export const apiKeyAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-api-key'] as string;
  const expectedKey = process.env.API_KEY;

  if (!expectedKey) {
    console.warn('⚠️ API_KEY not configured, skipping API key auth');
    return next();
  }

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid API key',
    });
  }

  next();
};