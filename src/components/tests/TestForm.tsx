'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Card from '@/components/ui/Card';
import QuestionEditor from './QuestionEditor';
import { QuestionFormData, MCQOption } from '@/types';

interface TestFormProps {
  initialData?: {
    id?: string;
    title: string;
    description: string | null;
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
  };
}

export default function TestForm({ initialData }: TestFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [tagsInput, setTagsInput] = useState(initialData?.tags?.join(', ') || '');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>(
    initialData?.durationMinutes || ''
  );
  const [questions, setQuestions] = useState<QuestionFormData[]>(() => {
    if (initialData?.questions) {
      return initialData.questions.map((q) => ({
        id: q.id,
        type: q.type as 'mcq' | 'freetext' | 'timed',
        content: q.content,
        options: q.options ? JSON.parse(q.options) : undefined,
        correctAnswer: q.correctAnswer || undefined,
        timeLimitSeconds: q.timeLimitSeconds || undefined,
        points: q.points,
        order: q.order,
      }));
    }
    return [];
  });

  const addQuestion = (type: 'mcq' | 'freetext' | 'timed') => {
    const newQuestion: QuestionFormData = {
      type,
      content: '',
      points: 1,
      order: questions.length,
      ...(type === 'mcq'
        ? {
            options: [
              { id: crypto.randomUUID(), text: '' },
              { id: crypto.randomUUID(), text: '' },
            ] as MCQOption[],
            correctAnswer: '',
          }
        : {}),
      ...(type === 'timed' ? { timeLimitSeconds: 60 } : {}),
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, question: QuestionFormData) => {
    const newQuestions = [...questions];
    newQuestions[index] = question;
    setQuestions(newQuestions);
  };

  const deleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newQuestions[index], newQuestions[newIndex]] = [
      newQuestions[newIndex],
      newQuestions[index],
    ];
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Please enter a test title');
      return;
    }

    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.content.trim()) {
        alert(`Question ${i + 1} is missing content`);
        return;
      }
      if (q.type === 'mcq') {
        if (!q.options || q.options.length < 2) {
          alert(`Question ${i + 1} needs at least 2 options`);
          return;
        }
        if (!q.correctAnswer) {
          alert(`Question ${i + 1} needs a correct answer selected`);
          return;
        }
        if (q.options.some((o) => !o.text.trim())) {
          alert(`Question ${i + 1} has empty options`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      // Convert comma-separated tags to array
      const tags = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        tags,
        durationMinutes: durationMinutes || null,
        questions: questions.map((q, i) => ({
          ...q,
          order: i,
        })),
      };

      const url = initialData?.id ? `/api/tests/${initialData.id}` : '/api/tests';
      const method = initialData?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push('/tests');
        router.refresh();
      } else {
        alert('Failed to save test');
      }
    } catch (error) {
      console.error('Error saving test:', error);
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold mb-4">Test Details</h2>
        <div className="space-y-4">
          <Input
            label="Title"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Cognitive Aptitude Test"
            required
          />
          <Textarea
            label="Description"
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this test measures..."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tags (comma-separated)"
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g., Analytical, Verbal, Numerical"
            />
            <Input
              label="Duration (minutes)"
              id="duration"
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) =>
                setDurationMinutes(e.target.value ? parseInt(e.target.value) : '')
              }
              placeholder="e.g., 30"
            />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Questions ({questions.length})</h2>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => addQuestion('mcq')}>
              + Multiple Choice
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => addQuestion('freetext')}>
              + Free Text
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => addQuestion('timed')}>
              + Timed Task
            </Button>
          </div>
        </div>

        {questions.length === 0 ? (
          <Card className="text-center py-12 text-gray-500">
            No questions yet. Add your first question using the buttons above.
          </Card>
        ) : (
          questions.map((question, index) => (
            <QuestionEditor
              key={question.id || index}
              question={question}
              index={index}
              onUpdate={updateQuestion}
              onDelete={deleteQuestion}
              onMoveUp={(i) => moveQuestion(i, 'up')}
              onMoveDown={(i) => moveQuestion(i, 'down')}
              isFirst={index === 0}
              isLast={index === questions.length - 1}
            />
          ))
        )}
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {initialData?.id ? 'Save Changes' : 'Create Test'}
        </Button>
      </div>
    </form>
  );
}
