import QuestionForm from '@/components/questions/QuestionForm';

async function getQuestion(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/questions/${id}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch question');
  }

  return res.json();
}

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const question = await getQuestion(id);

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
