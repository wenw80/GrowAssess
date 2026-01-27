import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { randomBytes } from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicLink: string }> }
) {
  try {
    const { publicLink } = await params;
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find the test
    const test = await prisma.test.findUnique({
      where: { publicLink },
      select: { id: true, title: true },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Check if candidate exists with this email
    let candidate = await prisma.candidate.findFirst({
      where: { email: normalizedEmail },
    });

    // If candidate doesn't exist, create one with minimal info
    if (!candidate) {
      candidate = await prisma.candidate.create({
        data: {
          email: normalizedEmail,
          name: normalizedEmail.split('@')[0], // Use email prefix as temporary name
          status: 'pending', // Mark as pending since profile is incomplete
        },
      });
    }

    // Check if this candidate already has an assignment for this test
    let assignment = await prisma.testAssignment.findFirst({
      where: {
        candidateId: candidate.id,
        testId: test.id,
      },
    });

    if (assignment) {
      // Assignment exists
      if (assignment.status === 'completed') {
        return NextResponse.json(
          { error: 'You have already completed this test' },
          { status: 400 }
        );
      }

      // Return existing assignment link for in_progress or not_started
      return NextResponse.json({
        assignmentLink: assignment.uniqueLink,
        candidateId: candidate.id,
        isNewCandidate: false,
        isResuming: assignment.status === 'in_progress',
      });
    }

    // Create new assignment
    const uniqueLink = randomBytes(16).toString('hex');

    assignment = await prisma.testAssignment.create({
      data: {
        candidateId: candidate.id,
        testId: test.id,
        uniqueLink,
        status: 'not_started',
      },
    });

    return NextResponse.json({
      assignmentLink: assignment.uniqueLink,
      candidateId: candidate.id,
      isNewCandidate: !candidate.name || candidate.name === normalizedEmail.split('@')[0],
      isResuming: false,
    }, { status: 201 });
  } catch (error) {
    console.error('Error starting public test:', error);
    return NextResponse.json({ error: 'Failed to start test' }, { status: 500 });
  }
}
