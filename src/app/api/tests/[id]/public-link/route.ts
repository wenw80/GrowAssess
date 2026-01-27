import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { randomBytes } from 'crypto';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const test = await prisma.test.findUnique({
      where: { id },
      select: { publicLink: true, title: true },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json({ publicLink: test.publicLink, title: test.title });
  } catch (error) {
    console.error('Error fetching public link:', error);
    return NextResponse.json({ error: 'Failed to fetch public link' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Generate a unique public link if one doesn't exist
    const test = await prisma.test.findUnique({
      where: { id },
      select: { publicLink: true },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    if (test.publicLink) {
      // Already has a public link
      return NextResponse.json({ publicLink: test.publicLink });
    }

    // Generate a unique link
    let publicLink: string;
    let isUnique = false;

    while (!isUnique) {
      publicLink = randomBytes(16).toString('hex');
      const existing = await prisma.test.findUnique({
        where: { publicLink },
      });
      if (!existing) {
        isUnique = true;
      }
    }

    // Update the test with the new public link
    const updatedTest = await prisma.test.update({
      where: { id },
      data: { publicLink },
    });

    return NextResponse.json({ publicLink: updatedTest.publicLink });
  } catch (error) {
    console.error('Error generating public link:', error);
    return NextResponse.json({ error: 'Failed to generate public link' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Remove the public link
    await prisma.test.update({
      where: { id },
      data: { publicLink: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting public link:', error);
    return NextResponse.json({ error: 'Failed to delete public link' }, { status: 500 });
  }
}
