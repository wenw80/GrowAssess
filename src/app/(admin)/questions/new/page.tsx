import QuestionForm from '@/components/questions/QuestionForm';

export default function NewQuestionPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Question</h1>
        <p className="text-gray-500 mt-1">Add a new question to your question library</p>
      </div>
      <QuestionForm />
    </div>
  );
}
