import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tests: true,
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    return NextResponse.json({ error: 'Failed to fetch question' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { type, content, options, correctAnswer, timeLimitSeconds, points, tags } = data;

    const question = await prisma.question.update({
      where: { id },
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

    return NextResponse.json(question);
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if question is used in any tests
    const testCount = await prisma.testQuestion.count({
      where: { questionId: id },
    });

    // Delete the question (cascade will remove TestQuestion records)
    await prisma.question.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, testCount });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}
