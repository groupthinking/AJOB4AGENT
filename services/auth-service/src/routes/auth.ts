import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../services/password';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../services/jwt';

const router = Router();

// In-memory user store for development
// In production, replace with database
const users: Map<string, {
  id: string;
  email: string;
  password: string;
  name?: string;
  role: 'USER' | 'ADMIN' | 'PREMIUM';
  createdAt: Date;
}> = new Map();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);
    
    // Check if user exists
    if (users.has(data.email)) {
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }
    
    // Hash password
    const hashedPassword = await hashPassword(data.password);
    
    // Create user
    const user = {
      id: crypto.randomUUID(),
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: 'USER' as const,
      createdAt: new Date(),
    };
    
    users.set(data.email, user);
    
    // Generate tokens
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    
    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = loginSchema.parse(req.body);
    
    // Find user
    const user = users.get(data.email);

    // Always verify password to mitigate timing attacks
    const passwordHash = user ? user.password : await hashPassword('dummy');
    const isValid = await verifyPassword(data.password, passwordHash);

    if (!user || !isValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    
    // Generate tokens
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    
    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = refreshSchema.parse(req.body);
    
    const decoded = verifyToken(data.refreshToken);
    
    if (!decoded) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }
    
    // Find user
    const user = users.get(decoded.email);
    
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    
    // Generate new tokens
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    
    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    
    res.json({
      success: true,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout (client-side token removal, but we can track revoked tokens)
router.post('/logout', (req: Request, res: Response): void => {
  // In production, add token to blacklist or revoke refresh token
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
