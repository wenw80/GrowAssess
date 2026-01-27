import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { parseTestSnapshot } from '@/lib/testSnapshot';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params;
    const assignment = await prisma.testAssignment.findUnique({
      where: { uniqueLink: linkId },
      include: {
        candidate: {
          select: { name: true, email: true },
        },
        responses: true,
        test: true,
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Parse the test snapshot to get the test structure at assignment time
    let testSnapshot;
    try {
      const parsed = parseTestSnapshot(assignment.testSnapshot);
      if (parsed.questions && parsed.questions.length > 0) {
        testSnapshot = parsed;
      } else {
        // Empty snapshot, fall back to live test with questions
        const questions = await prisma.question.findMany({
          where: { testId: assignment.testId },
          orderBy: { order: 'asc' },
        });
        testSnapshot = {
          title: assignment.test.title,
          description: assignment.test.description,
          requirements: assignment.test.requirements,
          tags: assignment.test.tags,
          durationMinutes: assignment.test.durationMinutes,
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
      testSnapshot = {
        title: assignment.test.title,
        description: assignment.test.description,
        requirements: assignment.test.requirements,
        tags: assignment.test.tags,
        durationMinutes: assignment.test.durationMinutes,
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

    // Return assignment with snapshot as the test data
    return NextResponse.json({
      ...assignment,
      test: testSnapshot,
    });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    return NextResponse.json({ error: 'Failed to fetch test' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params;
    const data = await request.json();
    const { action } = data;

    const assignment = await prisma.testAssignment.findUnique({
      where: { uniqueLink: linkId },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    if (action === 'start') {
      if (assignment.status !== 'not_started') {
        return NextResponse.json({ error: 'Test already started' }, { status: 400 });
      }

      const updated = await prisma.testAssignment.update({
        where: { uniqueLink: linkId },
        data: {
          status: 'in_progress',
          startedAt: new Date(),
        },
      });

      return NextResponse.json(updated);
    }

    if (action === 'complete') {
      const updated = await prisma.testAssignment.update({
        where: { uniqueLink: linkId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json({ error: 'Failed to update test' }, { status: 500 });
  }
}
