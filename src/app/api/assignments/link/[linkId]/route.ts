import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params;
    const assignment = await prisma.testAssignment.findUnique({
      where: { uniqueLink: linkId },
      include: {
        candidate: {
          select: { name: true, email: true },
        },
        test: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                type: true,
                content: true,
                options: true,
                timeLimitSeconds: true,
                points: true,
                order: true,
              },
            },
          },
        },
        responses: true,
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Error fetching assignment:', error);
    return NextResponse.json({ error: 'Failed to fetch test' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params;
    const data = await request.json();
    const { action } = data;

    const assignment = await prisma.testAssignment.findUnique({
      where: { uniqueLink: linkId },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    if (action === 'start') {
      if (assignment.status !== 'not_started') {
        return NextResponse.json({ error: 'Test already started' }, { status: 400 });
      }

      const updated = await prisma.testAssignment.update({
        where: { uniqueLink: linkId },
        data: {
          status: 'in_progress',
          startedAt: new Date(),
        },
      });

      return NextResponse.json(updated);
    }

    if (action === 'complete') {
      const updated = await prisma.testAssignment.update({
        where: { uniqueLink: linkId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json({ error: 'Failed to update test' }, { status: 500 });
  }
}
