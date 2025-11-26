// Email service placeholder for password reset and email verification
// In production, integrate with actual email service (SendGrid, AWS SES, etc.)

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // In development, log email content
  if (process.env.NODE_ENV !== 'production') {
    console.log('📧 Email would be sent:', {
      to: options.to,
      subject: options.subject,
    });
    return true;
  }
  
  // In production, implement actual email sending
  // Example with nodemailer:
  // const transporter = nodemailer.createTransport({...});
  // await transporter.sendMail(options);
  
  console.log('Email service not configured for production');
  return false;
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:3001'}/auth/reset-password?token=${resetToken}`;
  
  return sendEmail({
    to: email,
    subject: 'Reset Your Password - AJOB4AGENT',
    html: `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset for your AJOB4AGENT account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
    text: `Reset your password: ${resetUrl}`,
  });
}

export async function sendVerificationEmail(email: string, verificationToken: string): Promise<boolean> {
  const verifyUrl = `${process.env.APP_URL || 'http://localhost:3001'}/auth/verify?token=${verificationToken}`;
  
  return sendEmail({
    to: email,
    subject: 'Verify Your Email - AJOB4AGENT',
    html: `
      <h1>Welcome to AJOB4AGENT!</h1>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>This link will expire in 24 hours.</p>
    `,
    text: `Verify your email: ${verifyUrl}`,
  });
}
