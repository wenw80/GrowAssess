import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { parseTestSnapshot } from '@/lib/testSnapshot';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;

    // Get test details
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Get all assignments for this test that are completed
    const assignments = await prisma.testAssignment.findMany({
      where: {
        testId,
        status: 'completed',
      },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
          },
        },
        responses: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    if (assignments.length === 0) {
      return NextResponse.json({
        test,
        totalCandidates: 0,
        candidateResults: [],
        questionAnalytics: [],
        overallStats: {
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          completionRate: 0,
        },
      });
    }

    // Get test questions (from snapshot or live)
    let questions: any[] = [];
    try {
      const firstAssignment = assignments[0];
      const snapshot = parseTestSnapshot(firstAssignment.testSnapshot);
      if (snapshot.questions && snapshot.questions.length > 0) {
        questions = snapshot.questions;
      } else {
        throw new Error('Empty snapshot');
      }
    } catch {
      // Fall back to live test questions
      const testQuestions = await prisma.testQuestion.findMany({
        where: { testId },
        include: { question: true },
        orderBy: { order: 'asc' },
      });
      questions = testQuestions.map((tq) => ({
        id: tq.question.id,
        type: tq.question.type,
        content: tq.question.content,
        options: tq.question.options,
        correctAnswer: tq.question.correctAnswer,
        timeLimitSeconds: tq.question.timeLimitSeconds,
        points: tq.question.points,
        order: tq.order,
      }));
    }

    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

    // Calculate candidate results with scores
    const candidateResults = assignments.map((assignment) => {
      const earnedPoints = assignment.responses.reduce((sum, r) => {
        if (r.score !== null) return sum + r.score;
        if (r.isCorrect) {
          const question = questions.find((q) => q.id === r.questionId);
          return sum + (question?.points || 0);
        }
        return sum;
      }, 0);

      const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

      return {
        assignmentId: assignment.id,
        candidate: assignment.candidate,
        completedAt: assignment.completedAt,
        score: {
          earned: earnedPoints,
          total: totalPoints,
          percentage,
        },
        responses: assignment.responses,
      };
    });

    // Sort by score descending
    candidateResults.sort((a, b) => b.score.percentage - a.score.percentage);

    // Calculate question-level analytics
    const questionAnalytics = questions.map((question) => {
      const responsesForQuestion = candidateResults.flatMap((cr) =>
        cr.responses.filter((r) => r.questionId === question.id)
      );

      const totalResponses = responsesForQuestion.length;
      const answeredResponses = responsesForQuestion.filter((r) => r.answer !== null);

      // Calculate score statistics
      const scores = responsesForQuestion
        .map((r) => {
          if (r.score !== null) return r.score;
          if (r.isCorrect) return question.points;
          return 0;
        })
        .filter((s) => s !== null);

      const averageScore =
        scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
      const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
      const minScore = scores.length > 0 ? Math.min(...scores) : 0;

      // For MCQ, calculate correct/incorrect
      let correctCount = 0;
      let incorrectCount = 0;
      if (question.type === 'mcq') {
        correctCount = responsesForQuestion.filter((r) => r.isCorrect === true).length;
        incorrectCount = responsesForQuestion.filter((r) => r.isCorrect === false).length;
      }

      // Calculate average time taken
      const timeTaken = responsesForQuestion
        .filter((r) => r.timeTakenSeconds !== null)
        .map((r) => r.timeTakenSeconds!);
      const averageTime =
        timeTaken.length > 0 ? timeTaken.reduce((sum, t) => sum + t, 0) / timeTaken.length : 0;

      // Get all candidate responses for this question
      const candidateResponses = candidateResults.map((cr) => {
        const response = cr.responses.find((r) => r.questionId === question.id);

        let score = 0;
        if (response) {
          if (response.score !== null) {
            score = response.score;
          } else if (response.isCorrect) {
            score = question.points;
          }
        }

        return {
          candidateId: cr.candidate.id,
          candidateName: cr.candidate.name,
          answer: response?.answer || null,
          score,
          maxScore: question.points,
          isCorrect: response?.isCorrect || null,
          graderNotes: response?.graderNotes || null,
          timeTakenSeconds: response?.timeTakenSeconds || null,
        };
      });

      return {
        question: {
          id: question.id,
          type: question.type,
          content: question.content,
          points: question.points,
          options: question.options,
          correctAnswer: question.correctAnswer,
        },
        stats: {
          totalResponses,
          answeredCount: answeredResponses.length,
          averageScore: Math.round(averageScore * 100) / 100,
          maxScore,
          minScore,
          averagePercentage:
            question.points > 0 ? Math.round((averageScore / question.points) * 100) : 0,
          correctCount,
          incorrectCount,
          averageTimeSeconds: Math.round(averageTime),
        },
        candidateResponses,
      };
    });

    // Calculate overall stats
    const scores = candidateResults.map((cr) => cr.score.percentage);
    const averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    // Get total assignments (including incomplete) for completion rate
    const allAssignments = await prisma.testAssignment.count({
      where: { testId },
    });
    const completionRate = allAssignments > 0 ? (assignments.length / allAssignments) * 100 : 0;

    return NextResponse.json({
      test: {
        id: test.id,
        title: test.title,
        description: test.description,
        tags: test.tags,
        durationMinutes: test.durationMinutes,
        createdBy: test.user,
        createdAt: test.createdAt,
      },
      totalCandidates: candidateResults.length,
      candidateResults,
      questionAnalytics,
      overallStats: {
        averageScore: Math.round(averageScore),
        highestScore,
        lowestScore,
        completionRate: Math.round(completionRate),
        totalPoints,
      },
    });
  } catch (error) {
    console.error('Error fetching test analytics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch test analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
