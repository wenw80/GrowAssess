import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// This endpoint sets up the initial admin user
// It can only be called once - sets wen.wei@gmail.com as admin
export async function POST() {
  try {
    // Check if wen.wei@gmail.com exists
    const user = await prisma.user.findUnique({
      where: { email: 'wen.wei@gmail.com' },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User wen.wei@gmail.com not found. Please register first.' },
        { status: 404 }
      );
    }

    if (user.role === 'admin') {
      return NextResponse.json({
        message: 'User is already an admin',
        user: { id: user.id, email: user.email, role: user.role },
      });
    }

    // Update user to admin
    const updatedUser = await prisma.user.update({
      where: { email: 'wen.wei@gmail.com' },
      data: { role: 'admin' },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json({
      message: 'Admin user setup complete',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error setting up admin:', error);
    return NextResponse.json(
      { error: 'Failed to set up admin user' },
      { status: 500 }
    );
  }
}
