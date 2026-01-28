import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { questionIds, addTags, removeTags } = data;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ error: 'Question IDs are required' }, { status: 400 });
    }

    // Update each question
    const updates = questionIds.map(async (questionId: string) => {
      // Get current tags
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        select: { tags: true },
      });

      if (!question) return;

      let newTags = [...question.tags];

      // Remove tags
      if (removeTags && Array.isArray(removeTags)) {
        newTags = newTags.filter(tag => !removeTags.includes(tag));
      }

      // Add tags (avoid duplicates)
      if (addTags && Array.isArray(addTags)) {
        addTags.forEach((tag: string) => {
          if (!newTags.includes(tag)) {
            newTags.push(tag);
          }
        });
      }

      // Update the question
      return prisma.question.update({
        where: { id: questionId },
        data: { tags: newTags },
      });
    });

    await Promise.all(updates);

    return NextResponse.json({
      success: true,
      updatedCount: questionIds.length,
    });
  } catch (error) {
    console.error('Error bulk updating tags:', error);
    return NextResponse.json({ error: 'Failed to update tags' }, { status: 500 });
  }
}
