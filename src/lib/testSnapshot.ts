import prisma from './db';

export interface TestSnapshot {
  title: string;
  description: string | null;
  requirements: string | null;
  tags: string[];
  durationMinutes: number | null;
  questions: Array<{
    id: string;
    type: string;
    content: string;
    options: string | null;
    correctAnswer: string | null;
    timeLimitSeconds: number | null;
    points: number;
    order: number;
  }>;
}

/**
 * Creates a snapshot of a test at the current moment
 * This snapshot preserves the test structure so future edits don't affect existing assignments
 */
export async function createTestSnapshot(testId: string): Promise<TestSnapshot> {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!test) {
    throw new Error(`Test not found: ${testId}`);
  }

  return {
    title: test.title,
    description: test.description,
    requirements: test.requirements,
    tags: test.tags,
    durationMinutes: test.durationMinutes,
    questions: test.questions.map((q) => ({
      id: q.id,
      type: q.type,
      content: q.content,
      options: q.options,
      correctAnswer: q.correctAnswer,
      timeLimitSeconds: q.timeLimitSeconds,
      points: q.points,
      order: q.order,
    })),
  };
}

/**
 * Parses a test snapshot from JSON string
 */
export function parseTestSnapshot(snapshotJson: string): TestSnapshot {
  return JSON.parse(snapshotJson);
}

/**
 * Serializes a test snapshot to JSON string
 */
export function serializeTestSnapshot(snapshot: TestSnapshot): string {
  return JSON.stringify(snapshot);
}
