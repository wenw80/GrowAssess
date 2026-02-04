import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success message to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Hash the token before storing (for security)
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Store hashed token in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: resetExpires,
      },
    });

    // In production, you would send an email here
    // For now, we'll include the token in the response for development
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;

    // Log the reset URL for development
    console.log('Password reset URL:', resetUrl);

    return NextResponse.json({
      message: 'If an account exists with this email, a password reset link has been sent.',
      // Remove this in production - only for development/testing
      ...(process.env.NODE_ENV === 'development' && { resetUrl }),
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
