import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const testId = searchParams.get('testId');

    const where: {
      testId?: string;
      type?: string;
      OR?: Array<{
        content?: { contains: string; mode: 'insensitive' };
      }>;
    } = {};

    if (testId) {
      where.testId = testId;
    }

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
        test: {
          select: {
            id: true,
            title: true,
            tags: true,
          },
        },
      },
      orderBy: [
        { testId: 'asc' },
        { order: 'asc' },
      ],
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
