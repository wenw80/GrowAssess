'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import Select from '@/components/ui/SelectSimple';
import { Badge } from '@/components/ui/Badge';
import { QuestionFormData, MCQOption, QuestionType } from '@/types';

interface QuestionEditorProps {
  question: QuestionFormData;
  index: number;
  onUpdate: (index: number, question: QuestionFormData) => void;
  onDelete: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
}

export default function QuestionEditor({
  question,
  index,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: QuestionEditorProps) {
  const [expanded, setExpanded] = useState(false);

  const questionTypes = [
    { value: 'mcq', label: 'Multiple Choice' },
    { value: 'freetext', label: 'Free Text' },
    { value: 'timed', label: 'Timed Task' },
  ];

  const updateField = <K extends keyof QuestionFormData>(
    field: K,
    value: QuestionFormData[K]
  ) => {
    onUpdate(index, { ...question, [field]: value });
  };

  const addOption = () => {
    const newOption: MCQOption = {
      id: crypto.randomUUID(),
      text: '',
      points: 0,
    };
    const options = question.options || [];
    updateField('options', [...options, newOption]);
  };

  const updateOption = (optionIndex: number, text: string) => {
    const options = [...(question.options || [])];
    options[optionIndex] = { ...options[optionIndex], text };
    updateField('options', options);
  };

  const updateOptionPoints = (optionIndex: number, points: number) => {
    const options = [...(question.options || [])];
    options[optionIndex] = { ...options[optionIndex], points };
    updateField('options', options);
  };

  const removeOption = (optionIndex: number) => {
    const options = question.options?.filter((_, i) => i !== optionIndex) || [];
    updateField('options', options);
    if (question.correctAnswer === question.options?.[optionIndex]?.id) {
      updateField('correctAnswer', '');
    }
  };

  const moveOption = (optionIndex: number, direction: 'up' | 'down') => {
    if (!question.options) return;

    const options = [...question.options];
    const newIndex = direction === 'up' ? optionIndex - 1 : optionIndex + 1;

    // Ensure indices are valid
    if (newIndex < 0 || newIndex >= options.length) return;

    // Swap elements
    const temp = options[optionIndex];
    options[optionIndex] = options[newIndex];
    options[newIndex] = temp;

    updateField('options', options);
  };

  return (
    <div className="rounded-lg border p-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-left"
        >
          <svg
            className={`w-4 h-4 transition-transform text-muted-foreground ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium">Question {index + 1}</span>
        </button>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {questionTypes.find((t) => t.value === question.type)?.label}
          </Badge>
          <Badge variant="default" className="text-xs">
            {question.points} pts
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onMoveUp(index)}
            disabled={isFirst}
            className="h-7 w-7 p-0"
          >
            ↑
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onMoveDown(index)}
            disabled={isLast}
            className="h-7 w-7 p-0"
          >
            ↓
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(index)} className="h-7">
            Delete
          </Button>
        </div>
      </div>

      {!expanded && question.content && (
        <p className="text-sm text-muted-foreground mt-2 line-clamp-1">{question.content}</p>
      )}

      {expanded && (
        <div className="space-y-4 mt-3 pt-3 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Type"
              id={`q-${question.id || index}-type`}
              options={questionTypes}
              value={question.type}
              onChange={(e) => updateField('type', e.target.value as QuestionType)}
            />
            <Input
              label="Points"
              id={`q-${question.id || index}-points`}
              type="number"
              min={1}
              value={question.points}
              onChange={(e) => updateField('points', parseInt(e.target.value) || 1)}
            />
            {(question.type === 'timed') && (
              <Input
                label="Time Limit (seconds)"
                id={`q-${question.id || index}-time`}
                type="number"
                min={10}
                value={question.timeLimitSeconds || ''}
                onChange={(e) =>
                  updateField('timeLimitSeconds', parseInt(e.target.value) || undefined)
                }
                placeholder="e.g., 60"
              />
            )}
          </div>

          <Textarea
            label="Question Content"
            id={`q-${question.id || index}-content`}
            rows={3}
            value={question.content}
            onChange={(e) => updateField('content', e.target.value)}
            placeholder="Enter the question text..."
          />

          {question.type === 'mcq' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                Options (select the correct answer and assign points)
              </label>
              {question.options?.map((option, optionIndex) => {
                // Ensure option has a valid ID for React key
                const optionId = option.id || `temp-${optionIndex}`;
                return (
                <div key={optionId} className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveOption(optionIndex, 'up')}
                      disabled={optionIndex === 0}
                      className="px-1 py-0 h-4 text-xs"
                    >
                      ▲
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveOption(optionIndex, 'down')}
                      disabled={optionIndex === (question.options?.length || 0) - 1}
                      className="px-1 py-0 h-4 text-xs"
                    >
                      ▼
                    </Button>
                  </div>
                  <input
                    type="radio"
                    name={`q-${question.id || index}-correct`}
                    checked={question.correctAnswer === option.id}
                    onChange={() => updateField('correctAnswer', option.id)}
                    className="h-4 w-4 text-primary"
                  />
                  <Input
                    value={option.text}
                    onChange={(e) => updateOption(optionIndex, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={option.points}
                    onChange={(e) => updateOptionPoints(optionIndex, parseInt(e.target.value) || 0)}
                    placeholder="pts"
                    className="w-20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(optionIndex)}
                    disabled={question.options?.length === 2}
                  >
                    ×
                  </Button>
                </div>
                );
              })}
              {(question.options?.length || 0) < 6 && (
                <Button type="button" variant="secondary" size="sm" onClick={addOption}>
                  Add Option
                </Button>
              )}
            </div>
          )}

          {question.type === 'freetext' && (
            <p className="text-sm text-muted-foreground">
              Free text responses will require manual scoring.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
