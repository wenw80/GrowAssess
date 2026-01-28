import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // 'my' or 'all'
    const currentUserId = await getCurrentUserId();

    const whereClause = filter === 'my' && currentUserId
      ? { userId: currentUserId }
      : {};

    const tests = await prisma.test.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: { questions: true, assignments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(tests);
  } catch (error) {
    console.error('Error fetching tests:', error);
    return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { title, description, requirements, category, tags, durationMinutes, questions } = data;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const currentUserId = await getCurrentUserId();

    // Handle both tags array and legacy category string
    let testTags: string[] = [];
    if (tags && Array.isArray(tags)) {
      testTags = tags;
    } else if (category) {
      // Convert category to tags array (split by comma)
      testTags = category.split(',').map((t: string) => t.trim()).filter(Boolean);
    }

    // Create the test first
    const test = await prisma.test.create({
      data: {
        title,
        description,
        requirements,
        tags: testTags,
        durationMinutes,
        userId: currentUserId,
      },
    });

    // Create questions and link them to the test
    if (questions && questions.length > 0) {
      for (let index = 0; index < questions.length; index++) {
        const q = questions[index];

        // Create the question
        const question = await prisma.question.create({
          data: {
            type: q.type,
            content: q.content,
            options: q.options ? JSON.stringify(q.options) : null,
            correctAnswer: q.correctAnswer || null,
            timeLimitSeconds: q.timeLimitSeconds || null,
            points: q.points || 1,
            tags: q.tags || [],
          },
        });

        // Create the TestQuestion link
        await prisma.testQuestion.create({
          data: {
            testId: test.id,
            questionId: question.id,
            order: q.order ?? index,
          },
        });
      }
    }

    // Fetch the complete test with questions
    const completeTest = await prisma.test.findUnique({
      where: { id: test.id },
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
    const transformedTest = completeTest ? {
      ...completeTest,
      questions: completeTest.questions.map(tq => ({
        ...tq.question,
        order: tq.order,
      })),
    } : null;

    return NextResponse.json(transformedTest, { status: 201 });
  } catch (error) {
    console.error('Error creating test:', error);
    return NextResponse.json({ error: 'Failed to create test' }, { status: 500 });
  }
}
