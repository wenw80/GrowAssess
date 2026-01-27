import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { assignmentId, questionId, answer, timeTakenSeconds } = data;

    if (!assignmentId || !questionId) {
      return NextResponse.json(
        { error: 'Assignment ID and Question ID are required' },
        { status: 400 }
      );
    }

    // Get the question to check the correct answer
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Determine if the answer is correct for MCQ questions
    let isCorrect: boolean | null = null;
    let score: number | null = null;

    if (question.type === 'mcq' && question.options) {
      // Parse options to get points for the selected answer
      try {
        const options = JSON.parse(question.options) as Array<{ id: string; text: string; points?: number }>;
        const selectedOption = options.find(opt => opt.id === answer);

        if (selectedOption) {
          // Use option points if available, otherwise use binary scoring (backwards compatibility)
          if (selectedOption.points !== undefined) {
            score = selectedOption.points;
          } else {
            // Old format: binary scoring
            score = answer === question.correctAnswer ? question.points : 0;
          }
          // isCorrect is true if the answer matches the correctAnswer
          isCorrect = answer === question.correctAnswer;
        } else {
          // Invalid answer selected
          score = 0;
          isCorrect = false;
        }
      } catch (e) {
        // Fallback to old scoring if JSON parsing fails
        isCorrect = answer === question.correctAnswer;
        score = isCorrect ? question.points : 0;
      }
    }

    // Upsert the response (create or update)
    const response = await prisma.response.upsert({
      where: {
        assignmentId_questionId: {
          assignmentId,
          questionId,
        },
      },
      update: {
        answer,
        isCorrect,
        score,
        timeTakenSeconds,
      },
      create: {
        assignmentId,
        questionId,
        answer,
        isCorrect,
        score,
        timeTakenSeconds,
      },
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error saving response:', error);
    return NextResponse.json({ error: 'Failed to save response' }, { status: 500 });
  }
}
