import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { questionIds } = data;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ error: 'Question IDs are required' }, { status: 400 });
    }

    // Check which questions are used in tests
    const questionsWithTests = await prisma.question.findMany({
      where: {
        id: { in: questionIds },
      },
      include: {
        _count: {
          select: { tests: true },
        },
      },
    });

    const questionsInUse = questionsWithTests.filter(q => q._count.tests > 0);

    if (questionsInUse.length > 0) {
      return NextResponse.json({
        error: 'Some questions are used in tests and cannot be deleted',
        questionsInUse: questionsInUse.map(q => ({
          id: q.id,
          content: q.content,
          testCount: q._count.tests,
        })),
      }, { status: 400 });
    }

    // Delete all questions that are not in use
    const result = await prisma.question.deleteMany({
      where: {
        id: { in: questionIds },
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('Error bulk deleting questions:', error);
    return NextResponse.json({ error: 'Failed to delete questions' }, { status: 500 });
  }
}
