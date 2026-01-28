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
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Transform the response to match the old format
    const transformedTest = {
      ...test,
      questions: test.questions.map(tq => ({
        ...tq.question,
        order: tq.order,
      })),
    };

    return NextResponse.json(transformedTest);
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

    // Get existing TestQuestion records for this test
    const existingTestQuestions = await prisma.testQuestion.findMany({
      where: { testId: id },
      include: { question: true },
    });

    const existingQuestionIds = new Set(existingTestQuestions.map(tq => tq.question.id));
    const updatedQuestionIds = new Set(
      questions?.filter((q: any) => q.id).map((q: any) => q.id) || []
    );

    // Remove TestQuestion links that are no longer in the update
    const testQuestionsToDelete = existingTestQuestions
      .filter(tq => !updatedQuestionIds.has(tq.question.id));

    if (testQuestionsToDelete.length > 0) {
      await prisma.testQuestion.deleteMany({
        where: {
          id: { in: testQuestionsToDelete.map(tq => tq.id) },
        },
      });
    }

    // Process each question
    const processedQuestionIds: string[] = [];

    for (let index = 0; index < (questions?.length || 0); index++) {
      const q = questions[index];
      const questionData = {
        type: q.type,
        content: q.content,
        options: q.options ? JSON.stringify(q.options) : null,
        correctAnswer: q.correctAnswer || null,
        timeLimitSeconds: q.timeLimitSeconds || null,
        points: q.points || 1,
        tags: q.tags || [],
      };

      let questionId: string;

      if (q.id && existingQuestionIds.has(q.id)) {
        // Update existing question
        await prisma.question.update({
          where: { id: q.id },
          data: questionData,
        });
        questionId = q.id;

        // Update order in TestQuestion
        const existingTQ = existingTestQuestions.find(tq => tq.question.id === q.id);
        if (existingTQ) {
          await prisma.testQuestion.update({
            where: { id: existingTQ.id },
            data: { order: q.order ?? index },
          });
        }
      } else {
        // Create new question
        const newQuestion = await prisma.question.create({
          data: questionData,
        });
        questionId = newQuestion.id;

        // Create TestQuestion link
        await prisma.testQuestion.create({
          data: {
            testId: id,
            questionId: newQuestion.id,
            order: q.order ?? index,
          },
        });
      }

      processedQuestionIds.push(questionId);
    }

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
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    // Transform the response to match the old format
    const transformedTest = test ? {
      ...test,
      questions: test.questions.map(tq => ({
        ...tq.question,
        order: tq.order,
      })),
    } : null;

    return NextResponse.json(transformedTest);
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
