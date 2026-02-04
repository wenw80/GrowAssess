import QuestionForm from '@/components/questions/QuestionForm';

export default function NewQuestionPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Create New Question</h1>
        <p className="text-muted-foreground mt-1">Add a new question to your question library</p>
      </div>
      <QuestionForm />
    </div>
  );
}
