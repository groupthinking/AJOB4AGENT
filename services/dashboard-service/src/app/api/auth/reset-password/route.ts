import { NextRequest, NextResponse } from 'next/server';
import { resetPassword, resetPasswordSchema } from '@/lib/auth-utils';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = resetPasswordSchema.parse(body);
    
    // Reset password
    await resetPassword(validatedData.token, validatedData.password);
    
    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: error.issues,
      }, { status: 400 });
    }
    
    if (error instanceof Error) {
      if (error.message === 'Invalid or expired token' || error.message === 'Token has expired') {
        return NextResponse.json({
          success: false,
          message: error.message,
        }, { status: 400 });
      }
    }
    
    console.error('Reset password error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred while resetting your password',
    }, { status: 500 });
  }
}
