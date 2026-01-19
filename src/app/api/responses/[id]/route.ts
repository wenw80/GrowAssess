import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { score, graderNotes } = data;

    const response = await prisma.response.update({
      where: { id },
      data: {
        score,
        graderNotes,
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating response:', error);
    return NextResponse.json({ error: 'Failed to update response' }, { status: 500 });
  }
}
