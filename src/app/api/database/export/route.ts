import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Fetch all data from all tables
    const [
      users,
      settings,
      tests,
      questions,
      candidates,
      assignments,
      responses,
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          // Exclude password hash for security
        },
      }),
      prisma.setting.findMany(),
      prisma.test.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          requirements: true,
          tags: true,
          durationMinutes: true,
          publicLink: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.question.findMany({
        select: {
          id: true,
          testId: true,
          type: true,
          content: true,
          options: true,
          correctAnswer: true,
          timeLimitSeconds: true,
          points: true,
          order: true,
        },
      }),
      prisma.candidate.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          position: true,
          status: true,
          notes: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.testAssignment.findMany({
        select: {
          id: true,
          candidateId: true,
          testId: true,
          status: true,
          assignedAt: true,
          startedAt: true,
          completedAt: true,
          uniqueLink: true,
          testSnapshot: true,
        },
      }),
      prisma.response.findMany({
        select: {
          id: true,
          assignmentId: true,
          questionId: true,
          answer: true,
          isCorrect: true,
          score: true,
          timeTakenSeconds: true,
          graderNotes: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    // Build the export object
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        application: 'GrowAssess',
        counts: {
          users: users.length,
          settings: settings.length,
          tests: tests.length,
          questions: questions.length,
          candidates: candidates.length,
          assignments: assignments.length,
          responses: responses.length,
        },
      },
      data: {
        users,
        settings: settings.map(s => ({
          key: s.key,
          // Mask API keys in export for security
          value: s.key.includes('api_key') ? '***REDACTED***' : s.value,
        })),
        tests,
        questions,
        candidates,
        assignments,
        responses,
      },
    };

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `growassess-export-${timestamp}.json`;

    // Return as downloadable JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting database:', error);
    return NextResponse.json(
      {
        error: 'Failed to export database',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
