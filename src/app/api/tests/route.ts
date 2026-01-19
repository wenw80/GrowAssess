import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const tests = await prisma.test.findMany({
      include: {
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

    const test = await prisma.test.create({
      data: {
        title,
        description,
        category,
        durationMinutes,
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
