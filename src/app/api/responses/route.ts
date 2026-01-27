import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { parseTestSnapshot } from '@/lib/testSnapshot';

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

    // Get the assignment to access the test snapshot
    const assignment = await prisma.testAssignment.findUnique({
      where: { id: assignmentId },
      select: { testSnapshot: true, testId: true },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Get the question from the snapshot (not from live test)
    let question;
    try {
      const snapshot = parseTestSnapshot(assignment.testSnapshot);
      if (snapshot.questions && snapshot.questions.length > 0) {
        question = snapshot.questions.find(q => q.id === questionId);
      }
    } catch {
      // Snapshot parsing failed or empty, fall back to live test
    }

    // Fall back to live test if snapshot is missing or invalid
    if (!question) {
      const liveQuestion = await prisma.question.findUnique({
        where: { id: questionId },
      });

      if (!liveQuestion) {
        return NextResponse.json({ error: 'Question not found' }, { status: 404 });
      }

      question = {
        id: liveQuestion.id,
        type: liveQuestion.type,
        content: liveQuestion.content,
        options: liveQuestion.options,
        correctAnswer: liveQuestion.correctAnswer,
        timeLimitSeconds: liveQuestion.timeLimitSeconds,
        points: liveQuestion.points,
        order: liveQuestion.order,
      };
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
