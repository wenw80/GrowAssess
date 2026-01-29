import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface GradeUpdate {
  responseId: string;
  score: number;
  graderNotes: string;
}

export async function POST(request: NextRequest) {
  try {
    const { grades } = await request.json();

    if (!grades || !Array.isArray(grades) || grades.length === 0) {
      return NextResponse.json({ error: 'Grades array required' }, { status: 400 });
    }

    // Update all responses in a transaction
    const updates = grades.map((grade: GradeUpdate) =>
      prisma.response.update({
        where: { id: grade.responseId },
        data: {
          score: grade.score,
          graderNotes: grade.graderNotes,
        },
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({
      success: true,
      updated: grades.length,
    });
  } catch (error) {
    console.error('Error bulk saving grades:', error);
    return NextResponse.json(
      {
        error: 'Failed to save grades',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
