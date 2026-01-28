import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the test with questions
    const test = await prisma.test.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Transform to export format
    const exportData = {
      title: test.title,
      description: test.description || undefined,
      requirements: test.requirements || undefined,
      tags: test.tags.length > 0 ? test.tags : undefined,
      durationMinutes: test.durationMinutes || undefined,
      questions: test.questions.map((tq) => {
        const q = tq.question;
        const baseQuestion: any = {
          type: q.type,
          content: q.content,
          points: q.points,
        };

        if (q.type === 'mcq' && q.options) {
          try {
            const parsedOptions = JSON.parse(q.options);
            // Check if options have points field (new format) or not (old format)
            const hasPoints = parsedOptions.length > 0 && parsedOptions[0].points !== undefined;

            if (hasPoints) {
              // New format: array of objects with text and points
              baseQuestion.options = parsedOptions.map((opt: any) => ({
                text: opt.text,
                points: opt.points,
              }));
            } else {
              // Old format or convert to simple string array
              baseQuestion.options = parsedOptions.map((opt: any) => opt.text);
            }

            // Convert correctAnswer from letter to index
            if (q.correctAnswer) {
              baseQuestion.correctAnswer = q.correctAnswer.charCodeAt(0) - 97; // 'a' -> 0, 'b' -> 1, etc.
            }
          } catch (e) {
            // If parsing fails, skip options
            console.error('Error parsing options:', e);
          }
        }

        if (q.type === 'timed' && q.timeLimitSeconds) {
          baseQuestion.timeLimitSeconds = q.timeLimitSeconds;
        }

        return baseQuestion;
      }),
    };

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${test.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting test:', error);
    return NextResponse.json({ error: 'Failed to export test' }, { status: 500 });
  }
}
