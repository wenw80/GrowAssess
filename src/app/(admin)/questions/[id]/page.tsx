import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import QuestionForm from '@/components/questions/QuestionForm';

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const question = await prisma.question.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          tests: true,
        },
      },
    },
  });

  if (!question) {
    notFound();
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Question</h1>
        <p className="text-gray-500 mt-1">Update question details and options</p>
      </div>
      <QuestionForm initialData={question} />
    </div>
  );
}
