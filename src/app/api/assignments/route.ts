import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateUniqueLink } from '@/lib/utils';
import { createTestSnapshot, serializeTestSnapshot } from '@/lib/testSnapshot';

export async function GET() {
  try {
    const assignments = await prisma.testAssignment.findMany({
      include: {
        candidate: true,
        test: true,
      },
      orderBy: { assignedAt: 'desc' },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { candidateId, testId } = data;

    if (!candidateId || !testId) {
      return NextResponse.json(
        { error: 'Candidate ID and Test ID are required' },
        { status: 400 }
      );
    }

    // Check if assignment already exists
    const existing = await prisma.testAssignment.findFirst({
      where: {
        candidateId,
        testId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Test already assigned to this candidate' },
        { status: 400 }
      );
    }

    // Create a snapshot of the test at assignment time
    const snapshot = await createTestSnapshot(testId);

    const assignment = await prisma.testAssignment.create({
      data: {
        candidateId,
        testId,
        uniqueLink: generateUniqueLink(),
        testSnapshot: serializeTestSnapshot(snapshot),
      },
      include: {
        candidate: true,
        test: true,
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}
