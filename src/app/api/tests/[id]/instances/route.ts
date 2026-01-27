import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const assignments = await prisma.testAssignment.findMany({
      where: { testId: id },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        responses: {
          select: {
            id: true,
            questionId: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    // Get question count for this test
    const test = await prisma.test.findUnique({
      where: { id },
      select: {
        _count: {
          select: { questions: true },
        },
      },
    });

    const questionCount = test?._count.questions || 0;

    // Transform data to include progress
    const instancesWithProgress = assignments.map((assignment) => ({
      id: assignment.id,
      status: assignment.status,
      assignedAt: assignment.assignedAt,
      startedAt: assignment.startedAt,
      completedAt: assignment.completedAt,
      uniqueLink: assignment.uniqueLink,
      candidate: assignment.candidate,
      progress: {
        answeredQuestions: assignment.responses.length,
        totalQuestions: questionCount,
      },
    }));

    return NextResponse.json(instancesWithProgress);
  } catch (error) {
    console.error('Error fetching test instances:', error);
    return NextResponse.json({ error: 'Failed to fetch test instances' }, { status: 500 });
  }
}
