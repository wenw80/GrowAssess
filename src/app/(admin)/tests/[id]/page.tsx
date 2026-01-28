import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import TestForm from '@/components/tests/TestForm';
import TestHeader from '@/components/tests/TestHeader';

export default async function EditTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
    notFound();
  }

  // Transform the test data to match the expected format
  const transformedTest = {
    ...test,
    questions: test.questions.map(tq => ({
      ...tq.question,
      order: tq.order,
    })),
  };

  return (
    <div className="px-4 sm:px-0">
      <TestHeader testId={id} testTitle={test.title} />
      <TestForm initialData={transformedTest} />
    </div>
  );
}
