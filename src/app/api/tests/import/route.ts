import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

interface ImportedQuestion {
  type: 'mcq' | 'freetext' | 'timed';
  content: string;
  options?: string[] | Array<{ text: string; points: number }>;
  correctAnswer?: number;
  timeLimitSeconds?: number;
  points?: number;
}

interface ImportedTest {
  title: string;
  description?: string;
  requirements?: string;
  category?: string; // Legacy support
  tags?: string[]; // New format
  durationMinutes?: number;
  questions: ImportedQuestion[];
}

function validateTest(data: unknown): { valid: boolean; error?: string; test?: ImportedTest } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid JSON structure' };
  }

  const test = data as Record<string, unknown>;

  if (!test.title || typeof test.title !== 'string') {
    return { valid: false, error: 'Missing or invalid "title" field' };
  }

  if (!Array.isArray(test.questions) || test.questions.length === 0) {
    return { valid: false, error: 'Missing or empty "questions" array' };
  }

  for (let i = 0; i < test.questions.length; i++) {
    const q = test.questions[i] as Record<string, unknown>;
    const qNum = i + 1;

    if (!q.type || !['mcq', 'freetext', 'timed'].includes(q.type as string)) {
      return { valid: false, error: `Question ${qNum}: Invalid or missing "type" (must be mcq, freetext, or timed)` };
    }

    if (!q.content || typeof q.content !== 'string') {
      return { valid: false, error: `Question ${qNum}: Missing or invalid "content"` };
    }

    if (q.type === 'mcq') {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        return { valid: false, error: `Question ${qNum}: MCQ requires at least 2 options` };
      }
      if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
        return { valid: false, error: `Question ${qNum}: Invalid "correctAnswer" index for MCQ` };
      }
      // Validate points for each option if provided
      for (let i = 0; i < q.options.length; i++) {
        const opt = q.options[i];
        if (typeof opt === 'object' && opt !== null) {
          if (!opt.text || typeof opt.text !== 'string') {
            return { valid: false, error: `Question ${qNum}, Option ${i + 1}: Missing or invalid "text"` };
          }
          if (typeof opt.points !== 'number') {
            return { valid: false, error: `Question ${qNum}, Option ${i + 1}: Missing or invalid "points"` };
          }
        }
      }
    }

    if (q.type === 'timed') {
      if (typeof q.timeLimitSeconds !== 'number' || q.timeLimitSeconds < 10) {
        return { valid: false, error: `Question ${qNum}: Timed questions require "timeLimitSeconds" (minimum 10)` };
      }
    }
  }

  return { valid: true, test: test as unknown as ImportedTest };
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate the imported data
    const validation = validateTest(data);
    if (!validation.valid || !validation.test) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const importedTest = validation.test;

    // Transform questions to database format
    const questions = importedTest.questions.map((q, index) => {
      const baseQuestion = {
        type: q.type,
        content: q.content,
        points: q.points || 1,
        order: index,
        options: null as string | null,
        correctAnswer: null as string | null,
        timeLimitSeconds: null as number | null,
      };

      if (q.type === 'mcq' && q.options) {
        // Convert options array to the format expected by the database
        const questionPoints = baseQuestion.points;
        const correctAnswerIndex = q.correctAnswer || 0;

        const optionsWithIds = q.options.map((opt, i) => {
          // Handle both string format and object format
          if (typeof opt === 'string') {
            // Legacy format: assign full points to correct answer, 0 to others
            return {
              id: String.fromCharCode(97 + i), // a, b, c, d, etc.
              text: opt,
              points: i === correctAnswerIndex ? questionPoints : 0,
            };
          } else {
            // New format: use provided points
            return {
              id: String.fromCharCode(97 + i),
              text: opt.text,
              points: opt.points,
            };
          }
        });
        baseQuestion.options = JSON.stringify(optionsWithIds);
        baseQuestion.correctAnswer = String.fromCharCode(97 + correctAnswerIndex);
      }

      if (q.type === 'timed' && q.timeLimitSeconds) {
        baseQuestion.timeLimitSeconds = q.timeLimitSeconds;
      }

      return baseQuestion;
    });

    // Handle both tags array and legacy category string
    const currentUserId = await getCurrentUserId();
    let testTags: string[] = [];
    if (importedTest.tags && Array.isArray(importedTest.tags)) {
      testTags = importedTest.tags;
    } else if (importedTest.category) {
      // Convert category to tags array (split by comma)
      testTags = importedTest.category.split(',').map(t => t.trim()).filter(Boolean);
    }

    // Create the test in the database
    const test = await prisma.test.create({
      data: {
        title: importedTest.title,
        description: importedTest.description || null,
        requirements: importedTest.requirements || null,
        tags: testTags,
        durationMinutes: importedTest.durationMinutes || null,
        userId: currentUserId,
        questions: {
          create: questions,
        },
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      test,
      message: `Successfully imported "${test.title}" with ${test.questions.length} questions`,
    }, { status: 201 });
  } catch (error) {
    console.error('Error importing test:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to import test' }, { status: 500 });
  }
}
