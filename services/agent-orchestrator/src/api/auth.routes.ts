import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { userStore } from '../db/user-store';
import { CreateUserInput, LoginInput, OAuthInput, JwtPayload, User } from '../types/auth';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Helper to create JWT token
function createToken(user: User): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    plan: user.plan,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Helper to sanitize user (remove sensitive fields)
function sanitizeUser(user: User) {
  const { password_hash, ...sanitized } = user;
  return sanitized;
}

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password }: CreateUserInput = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters',
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Check if user exists
    const existingUser = await userStore.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Create user
    const user = await userStore.create({ name, email, password });
    const accessToken = createToken(user);

    console.log(`✅ User registered: ${email}`);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: sanitizeUser(user),
      accessToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
    });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginInput = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const user = await userStore.verifyPassword(email, password);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const accessToken = createToken(user);

    console.log(`✅ User logged in: ${email}`);

    return res.json({
      success: true,
      message: 'Login successful',
      user: sanitizeUser(user),
      accessToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
});

// OAuth sign-in/sign-up
router.post('/oauth', async (req: Request, res: Response) => {
  try {
    const { provider, providerId, email, name, image }: OAuthInput = req.body;

    if (!provider || !providerId || !email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Provider, providerId, email, and name are required',
      });
    }

    if (!['google', 'github'].includes(provider)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OAuth provider',
      });
    }

    const user = await userStore.createFromOAuth({
      provider: provider as 'google' | 'github',
      providerId,
      email,
      name,
      image,
    });

    const accessToken = createToken(user);

    console.log(`✅ OAuth user authenticated: ${email} via ${provider}`);

    return res.json({
      success: true,
      message: 'OAuth authentication successful',
      user: sanitizeUser(user),
      accessToken,
    });
  } catch (error) {
    console.error('OAuth error:', error);
    return res.status(500).json({
      success: false,
      message: 'OAuth authentication failed',
    });
  }
});

// Forgot password - send reset email
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const user = await userStore.findByEmail(email);
    
    // Always return success to prevent email enumeration
    if (!user) {
      console.log(`⚠️ Password reset requested for non-existent email: ${email}`);
      return res.json({
        success: true,
        message: 'If an account exists, a password reset link will be sent',
      });
    }

    // Create reset token
    const resetToken = await userStore.createPasswordResetToken(user.id);

    // In production, send email with reset link
    // For now, log the token (NEVER do this in production)
    console.log(`🔑 Password reset token for ${email}: ${resetToken}`);
    console.log(`   Reset link: ${process.env.APP_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`);

    return res.json({
      success: true,
      message: 'If an account exists, a password reset link will be sent',
      // Include token in dev mode only
      ...(process.env.NODE_ENV === 'development' && { resetToken }),
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
    });
  }
});

// Reset password with token
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters',
      });
    }

    const resetToken = await userStore.findPasswordResetToken(token);
    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    // Update password
    const success = await userStore.updatePassword(resetToken.user_id, newPassword);
    if (!success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update password',
      });
    }

    // Delete used token
    await userStore.deletePasswordResetToken(resetToken.id);

    console.log(`✅ Password reset successful for user: ${resetToken.user_id}`);

    return res.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password',
    });
  }
});

// Get current user (requires authentication)
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      const user = await userStore.findById(decoded.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      return res.json({
        success: true,
        user: sanitizeUser(user),
      });
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get user',
    });
  }
});

// Verify token endpoint
router.post('/verify-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required',
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      const user = await userStore.findById(decoded.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          valid: false,
          message: 'User not found',
        });
      }

      return res.json({
        success: true,
        valid: true,
        user: sanitizeUser(user),
      });
    } catch (err) {
      return res.status(401).json({
        success: false,
        valid: false,
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    console.error('Verify token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify token',
    });
  }
});

export default router;
