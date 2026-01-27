import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicLink: string }> }
) {
  try {
    const { publicLink } = await params;

    const test = await prisma.test.findUnique({
      where: { publicLink },
      select: {
        id: true,
        title: true,
        description: true,
        durationMinutes: true,
        _count: {
          select: { questions: true },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json({
      title: test.title,
      description: test.description,
      durationMinutes: test.durationMinutes,
      questionCount: test._count.questions,
    });
  } catch (error) {
    console.error('Error fetching public test:', error);
    return NextResponse.json({ error: 'Failed to fetch test' }, { status: 500 });
  }
}
