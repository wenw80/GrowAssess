import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const candidateId = searchParams.get('candidateId');
    const testId = searchParams.get('testId');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const assignmentId = searchParams.get('assignment');

    const where: {
      candidateId?: string;
      testId?: string;
      status?: string;
      id?: string;
      completedAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {};

    if (assignmentId) {
      where.id = assignmentId;
    }

    if (candidateId) {
      where.candidateId = candidateId;
    }

    if (testId) {
      where.testId = testId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.completedAt = {};
      if (dateFrom) {
        where.completedAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.completedAt.lte = new Date(dateTo + 'T23:59:59');
      }
    }

    const assignments = await prisma.testAssignment.findMany({
      where,
      include: {
        candidate: true,
        test: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
        },
        responses: {
          include: {
            question: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    // Calculate scores
    const results = assignments.map((assignment) => {
      const responses = assignment.responses;
      const totalPoints = assignment.test.questions.reduce((sum, q) => sum + q.points, 0);
      const earnedPoints = responses.reduce((sum, r) => {
        if (r.score !== null) return sum + r.score;
        if (r.isCorrect) return sum + r.question.points;
        return sum;
      }, 0);

      return {
        ...assignment,
        score: {
          earned: earnedPoints,
          total: totalPoints,
          percentage: totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0,
        },
      };
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
