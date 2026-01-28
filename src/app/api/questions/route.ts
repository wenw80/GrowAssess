import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { type, content, options, correctAnswer, timeLimitSeconds, points, tags } = data;

    if (!type || !content) {
      return NextResponse.json({ error: 'Type and content are required' }, { status: 400 });
    }

    const question = await prisma.question.create({
      data: {
        type,
        content,
        options: options ? JSON.stringify(options) : null,
        correctAnswer: correctAnswer || null,
        timeLimitSeconds: timeLimitSeconds || null,
        points: points || 1,
        tags: tags || [],
      },
      include: {
        _count: {
          select: {
            tests: true,
          },
        },
      },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const type = searchParams.get('type');

    const where: {
      type?: string;
      OR?: Array<{
        content?: { contains: string; mode: 'insensitive' };
      }>;
    } = {};

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const questions = await prisma.question.findMany({
      where,
      include: {
        _count: {
          select: {
            tests: true,
          },
        },
        tests: {
          include: {
            test: {
              select: {
                id: true,
                title: true,
                tags: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}
