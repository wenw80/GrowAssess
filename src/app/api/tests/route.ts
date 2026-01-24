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
    const { title, description, category, durationMinutes, questions } = data;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const currentUserId = await getCurrentUserId();

    const test = await prisma.test.create({
      data: {
        title,
        description,
        category,
        durationMinutes,
        userId: currentUserId,
        questions: {
          create: questions?.map((q: {
            type: string;
            content: string;
            options?: unknown;
            correctAnswer?: string;
            timeLimitSeconds?: number;
            points?: number;
            order: number;
          }, index: number) => ({
            type: q.type,
            content: q.content,
            options: q.options ? JSON.stringify(q.options) : null,
            correctAnswer: q.correctAnswer,
            timeLimitSeconds: q.timeLimitSeconds,
            points: q.points || 1,
            order: q.order ?? index,
          })) || [],
        },
      },
      include: {
        questions: true,
      },
    });

    return NextResponse.json(test, { status: 201 });
  } catch (error) {
    console.error('Error creating test:', error);
    return NextResponse.json({ error: 'Failed to create test' }, { status: 500 });
  }
}
