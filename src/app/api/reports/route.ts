import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { parseTestSnapshot } from '@/lib/testSnapshot';

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
          select: {
            id: true,
            title: true,
            description: true,
            requirements: true,
            tags: true,
            durationMinutes: true,
          },
        },
        responses: true,
      },
      orderBy: { assignedAt: 'desc' },
    });

    // Fetch questions for assignments without snapshots
    const assignmentsWithQuestions = await Promise.all(
      assignments.map(async (assignment) => {
        let snapshot;

        // Try to parse snapshot, fall back to live test if empty/invalid
        try {
          const parsed = parseTestSnapshot(assignment.testSnapshot);
          if (parsed.questions && parsed.questions.length > 0) {
            snapshot = parsed;
          } else {
            // Empty snapshot, fall back to live test
            const questions = await prisma.question.findMany({
              where: { testId: assignment.testId },
              orderBy: { order: 'asc' },
            });
            snapshot = {
              ...assignment.test,
              questions: questions.map(q => ({
                id: q.id,
                type: q.type,
                content: q.content,
                options: q.options,
                correctAnswer: q.correctAnswer,
                timeLimitSeconds: q.timeLimitSeconds,
                points: q.points,
                order: q.order,
              })),
            };
          }
        } catch {
          // Invalid JSON or parsing error, fall back to live test
          const questions = await prisma.question.findMany({
            where: { testId: assignment.testId },
            orderBy: { order: 'asc' },
          });
          snapshot = {
            ...assignment.test,
            questions: questions.map(q => ({
              id: q.id,
              type: q.type,
              content: q.content,
              options: q.options,
              correctAnswer: q.correctAnswer,
              timeLimitSeconds: q.timeLimitSeconds,
              points: q.points,
              order: q.order,
            })),
          };
        }

        return { assignment, snapshot };
      })
    );

    // Calculate scores using test snapshots
    const results = assignmentsWithQuestions.map(({ assignment, snapshot }) => {
      const responses = assignment.responses;

      // Create a map of question ID to points from snapshot
      const questionPointsMap = new Map(
        snapshot.questions.map(q => [q.id, q.points])
      );

      const totalPoints = snapshot.questions.reduce((sum, q) => sum + q.points, 0);
      const earnedPoints = responses.reduce((sum, r) => {
        if (r.score !== null) return sum + r.score;
        if (r.isCorrect) {
          const questionPoints = questionPointsMap.get(r.questionId) || 0;
          return sum + questionPoints;
        }
        return sum;
      }, 0);

      return {
        ...assignment,
        test: {
          ...assignment.test,
          ...snapshot,
        },
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
