'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { MCQOption } from '@/types';

interface QuestionFormProps {
  initialData?: {
    id: string;
    type: string;
    content: string;
    options: string | null;
    correctAnswer: string | null;
    timeLimitSeconds: number | null;
    points: number;
    tags: string[];
  };
}

export default function QuestionForm({ initialData }: QuestionFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<'mcq' | 'freetext' | 'timed'>(
    (initialData?.type as 'mcq' | 'freetext' | 'timed') || 'mcq'
  );
  const [content, setContent] = useState(initialData?.content || '');
  const [points, setPoints] = useState(initialData?.points || 1);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number | ''>(
    initialData?.timeLimitSeconds || ''
  );
  const [tagsInput, setTagsInput] = useState(initialData?.tags?.join(', ') || '');

  // MCQ specific state
  const [options, setOptions] = useState<MCQOption[]>(() => {
    if (initialData?.options && initialData.type === 'mcq') {
      try {
        const parsed = JSON.parse(initialData.options);
        return parsed.map((opt: any) => ({
          id: opt.id || crypto.randomUUID(),
          text: opt.text,
          points: opt.points !== undefined ? opt.points : (opt.id === initialData.correctAnswer ? initialData.points : 0),
        }));
      } catch {
        return [
          { id: crypto.randomUUID(), text: '', points: 1 },
          { id: crypto.randomUUID(), text: '', points: 0 },
        ];
      }
    }
    return [
      { id: crypto.randomUUID(), text: '', points: 1 },
      { id: crypto.randomUUID(), text: '', points: 0 },
    ];
  });
  const [correctAnswer, setCorrectAnswer] = useState(
    initialData?.correctAnswer || (options.length > 0 ? options[0].id : '')
  );

  const handleTypeChange = (newType: 'mcq' | 'freetext' | 'timed') => {
    setType(newType);
    if (newType === 'mcq' && options.length === 0) {
      const option1Id = crypto.randomUUID();
      const option2Id = crypto.randomUUID();
      setOptions([
        { id: option1Id, text: '', points: 1 },
        { id: option2Id, text: '', points: 0 },
      ]);
      setCorrectAnswer(option1Id);
    } else if (newType === 'timed' && !timeLimitSeconds) {
      setTimeLimitSeconds(60);
    }
  };

  const addOption = () => {
    setOptions([...options, { id: crypto.randomUUID(), text: '', points: 0 }]);
  };

  const updateOption = (index: number, field: 'text' | 'points', value: string | number) => {
    const newOptions = [...options];
    if (field === 'text') {
      newOptions[index].text = value as string;
    } else {
      newOptions[index].points = value as number;
    }
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    if (correctAnswer === options[index].id && newOptions.length > 0) {
      setCorrectAnswer(newOptions[0].id);
    }
  };

  const moveOption = (index: number, direction: 'up' | 'down') => {
    const newOptions = [...options];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newOptions[index], newOptions[newIndex]] = [newOptions[newIndex], newOptions[index]];
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      alert('Please enter question content');
      return;
    }

    if (type === 'mcq') {
      if (options.length < 2) {
        alert('MCQ questions need at least 2 options');
        return;
      }
      if (!correctAnswer) {
        alert('Please select a correct answer');
        return;
      }
      if (options.some((o) => !o.text.trim())) {
        alert('All options must have text');
        return;
      }
    }

    setSaving(true);
    try {
      const tags = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const payload = {
        type,
        content: content.trim(),
        options: type === 'mcq' ? options : undefined,
        correctAnswer: type === 'mcq' ? correctAnswer : undefined,
        timeLimitSeconds: type === 'timed' ? (timeLimitSeconds || null) : null,
        points,
        tags,
      };

      const url = initialData?.id ? `/api/questions/${initialData.id}` : '/api/questions';
      const method = initialData?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push('/questions');
        router.refresh();
      } else {
        alert('Failed to save question');
      }
    } catch (error) {
      console.error('Error saving question:', error);
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold mb-4">Question Details</h2>
        <div className="space-y-4">
          <Select
            label="Question Type"
            id="type"
            options={[
              { value: 'mcq', label: 'Multiple Choice' },
              { value: 'freetext', label: 'Free Text' },
              { value: 'timed', label: 'Timed Task' },
            ]}
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as 'mcq' | 'freetext' | 'timed')}
          />

          <Textarea
            label="Question Content"
            id="content"
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your question here..."
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Points"
              id="points"
              type="number"
              min={0}
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
              required
            />
            {type === 'timed' && (
              <Input
                label="Time Limit (seconds)"
                id="timeLimit"
                type="number"
                min={1}
                value={timeLimitSeconds}
                onChange={(e) => setTimeLimitSeconds(e.target.value ? parseInt(e.target.value) : '')}
              />
            )}
          </div>

          <Input
            label="Tags (comma-separated)"
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g., Logic, Reasoning, Hard"
          />
        </div>
      </Card>

      {type === 'mcq' && (
        <Card>
          <h2 className="text-lg font-semibold mb-4">Answer Options</h2>
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={option.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={correctAnswer === option.id}
                    onChange={() => setCorrectAnswer(option.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder={`Option ${String.fromCharCode(65 + index)} text`}
                      value={option.text}
                      onChange={(e) => updateOption(index, 'text', e.target.value)}
                      required
                    />
                    <Input
                      label="Points for this option"
                      type="number"
                      min={0}
                      value={option.points}
                      onChange={(e) => updateOption(index, 'points', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveOption(index, 'up')}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveOption(index, 'down')}
                      disabled={index === options.length - 1}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeOption(index)}
                      disabled={options.length <= 2}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
                {correctAnswer === option.id && (
                  <Badge variant="success">Correct Answer</Badge>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button type="button" variant="secondary" onClick={addOption}>
              + Add Option
            </Button>
          </div>
        </Card>
      )}

      <div className="flex justify-end gap-4">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {initialData?.id ? 'Save Changes' : 'Create Question'}
        </Button>
      </div>
    </form>
  );
}
