import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const test = await prisma.test.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json(test);
  } catch (error) {
    console.error('Error fetching test:', error);
    return NextResponse.json({ error: 'Failed to fetch test' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { title, description, requirements, category, tags, durationMinutes, questions } = data;

    // Handle both tags array and legacy category string
    let testTags: string[] = [];
    if (tags && Array.isArray(tags)) {
      testTags = tags;
    } else if (category) {
      // Convert category to tags array (split by comma)
      testTags = category.split(',').map((t: string) => t.trim()).filter(Boolean);
    }

    // CRITICAL FIX: Preserve question IDs to maintain response relationships
    // Get existing questions
    const existingQuestions = await prisma.question.findMany({
      where: { testId: id },
      select: { id: true },
    });

    const existingQuestionIds = new Set(existingQuestions.map(q => q.id));
    const updatedQuestionIds = new Set(
      questions?.filter((q: any) => q.id).map((q: any) => q.id) || []
    );

    // Delete questions that are no longer in the update (user deleted them)
    const questionsToDelete = existingQuestions
      .filter(q => !updatedQuestionIds.has(q.id))
      .map(q => q.id);

    if (questionsToDelete.length > 0) {
      await prisma.question.deleteMany({
        where: { id: { in: questionsToDelete } },
      });
    }

    // Update existing questions and create new ones
    const questionUpdates = questions?.map((q: {
      id?: string;
      type: string;
      content: string;
      options?: unknown;
      correctAnswer?: string;
      timeLimitSeconds?: number;
      points?: number;
      order: number;
    }, index: number) => {
      const questionData = {
        type: q.type,
        content: q.content,
        options: q.options ? JSON.stringify(q.options) : null,
        correctAnswer: q.correctAnswer || null,
        timeLimitSeconds: q.timeLimitSeconds || null,
        points: q.points || 1,
        order: q.order ?? index,
        testId: id,
      };

      if (q.id && existingQuestionIds.has(q.id)) {
        // Update existing question
        return prisma.question.update({
          where: { id: q.id },
          data: questionData,
        });
      } else {
        // Create new question
        return prisma.question.create({
          data: questionData,
        });
      }
    }) || [];

    // Execute all question updates/creates
    await Promise.all(questionUpdates);

    // Update test metadata
    await prisma.test.update({
      where: { id },
      data: {
        title,
        description,
        requirements,
        tags: testTags,
        durationMinutes,
      },
    });

    // Fetch updated test with questions
    const test = await prisma.test.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json(test);
  } catch (error) {
    console.error('Error updating test:', error);
    return NextResponse.json({ error: 'Failed to update test' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.test.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting test:', error);
    return NextResponse.json({ error: 'Failed to delete test' }, { status: 500 });
  }
}
