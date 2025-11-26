import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { randomBytes } from 'crypto';

// Validation schemas
export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional(),
});

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Get current user session
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

// Check if user is authenticated
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}

// Check if user has a specific role
export async function hasRole(role: string) {
  const user = await getCurrentUser();
  return user?.role === role;
}

// Check if user has one of the specified roles
export async function hasAnyRole(roles: string[]) {
  const user = await getCurrentUser();
  return user ? roles.includes(user.role) : false;
}

// Create a new user with email/password
export async function createUser(email: string, password: string, name?: string) {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

// Generate password reset token
export async function generatePasswordResetToken(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Don't reveal if user exists or not
    return null;
  }

  // Generate cryptographically secure token
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000); // 1 hour

  // Store token
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  return token;
}

// Reset password with token
export async function resetPassword(token: string, newPassword: string) {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!verificationToken) {
    throw new Error('Invalid or expired token');
  }

  if (verificationToken.expires < new Date()) {
    // Delete expired token
    await prisma.verificationToken.delete({
      where: { token },
    });
    throw new Error('Token has expired');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update user password
  await prisma.user.update({
    where: { email: verificationToken.identifier },
    data: { password: hashedPassword },
  });

  // Delete token
  await prisma.verificationToken.delete({
    where: { token },
  });

  return true;
}

// Verify email with token
export async function verifyEmail(token: string) {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!verificationToken) {
    throw new Error('Invalid or expired token');
  }

  if (verificationToken.expires < new Date()) {
    await prisma.verificationToken.delete({
      where: { token },
    });
    throw new Error('Token has expired');
  }

  // Update user email verification status
  await prisma.user.update({
    where: { email: verificationToken.identifier },
    data: { emailVerified: new Date() },
  });

  // Delete token
  await prisma.verificationToken.delete({
    where: { token },
  });

  return true;
}

// Get user by email
export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      emailVerified: true,
    },
  });
}

// Update user profile
export async function updateUserProfile(userId: string, data: {
  name?: string;
  image?: string;
}) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
    },
  });
}
