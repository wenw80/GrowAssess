import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const candidateId = searchParams.get('candidateId');
    const testId = searchParams.get('testId');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: {
      candidateId?: string;
      testId?: string;
      status?: string;
      completedAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {};

    if (candidateId) {
      where.candidateId = candidateId;
    }

    if (testId) {
      where.testId = testId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.completedAt = {};
      if (dateFrom) {
        where.completedAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.completedAt.lte = new Date(dateTo + 'T23:59:59');
      }
    }

    const assignments = await prisma.testAssignment.findMany({
      where,
      include: {
        candidate: true,
        test: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
        },
        responses: {
          include: {
            question: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    // Build CSV
    const headers = [
      'Candidate Name',
      'Candidate Email',
      'Position',
      'Test Title',
      'Status',
      'Assigned Date',
      'Completed Date',
      'Score',
      'Total Points',
      'Percentage',
    ];

    const rows = assignments.map((assignment) => {
      const totalPoints = assignment.test.questions.reduce((sum, q) => sum + q.points, 0);
      const earnedPoints = assignment.responses.reduce((sum, r) => {
        if (r.score !== null) return sum + r.score;
        if (r.isCorrect) return sum + r.question.points;
        return sum;
      }, 0);
      const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

      return [
        assignment.candidate.name,
        assignment.candidate.email,
        assignment.candidate.position || '',
        assignment.test.title,
        assignment.status,
        new Date(assignment.assignedAt).toISOString().split('T')[0],
        assignment.completedAt
          ? new Date(assignment.completedAt).toISOString().split('T')[0]
          : '',
        earnedPoints,
        totalPoints,
        `${percentage}%`,
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((cell) =>
            typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))
              ? `"${cell.replace(/"/g, '""')}"`
              : cell
          )
          .join(',')
      ),
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="assessment-report-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting reports:', error);
    return NextResponse.json({ error: 'Failed to export reports' }, { status: 500 });
  }
}
