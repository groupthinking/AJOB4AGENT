import { NextRequest, NextResponse } from 'next/server';
import { generatePasswordResetToken, forgotPasswordSchema } from '@/lib/auth-utils';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = forgotPasswordSchema.parse(body);
    
    // Generate reset token
    const token = await generatePasswordResetToken(validatedData.email);
    
    // In production, send email with reset link
    // For now, we'll just return a success message
    // The token would be included in an email link like:
    // /auth/reset-password?token=${token}
    
    if (token) {
      // TODO: Send email with reset link
      console.log(`Password reset token generated for ${validatedData.email}: ${token}`);
    }
    
    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: error.issues,
      }, { status: 400 });
    }
    
    console.error('Forgot password error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while processing your request',
    }, { status: 500 });
  }
}
