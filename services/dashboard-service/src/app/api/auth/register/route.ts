import { NextRequest, NextResponse } from 'next/server';
import { createUser, signUpSchema } from '@/lib/auth-utils';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = signUpSchema.parse(body);
    
    // Create user
    const user = await createUser(
      validatedData.email,
      validatedData.password,
      validatedData.name
    );
    
    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: error.issues,
      }, { status: 400 });
    }
    
    if (error instanceof Error) {
      if (error.message === 'User with this email already exists') {
        return NextResponse.json({
          success: false,
          message: error.message,
        }, { status: 409 });
      }
    }
    
    console.error('Registration error:', error);
    return NextResponse.json({
      success: false,
      message: 'An error occurred during registration',
    }, { status: 500 });
  }
}
