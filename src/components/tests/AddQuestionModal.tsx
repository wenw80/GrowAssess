'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { QuestionFormData, MCQOption } from '@/types';

interface Test {
  id: string;
  title: string;
  tags: string[];
}

interface QuestionWithTest {
  id: string;
  type: string;
  content: string;
  options: string | null;
  correctAnswer: string | null;
  timeLimitSeconds: number | null;
  points: number;
  order: number;
  test: Test;
}

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddQuestions: (questions: QuestionFormData[]) => void;
}

export default function AddQuestionModal({
  isOpen,
  onClose,
  onAddQuestions,
}: AddQuestionModalProps) {
  const [activeTab, setActiveTab] = useState<'new' | 'library' | 'import'>('new');
  const [questionType, setQuestionType] = useState<'mcq' | 'freetext' | 'timed'>('mcq');

  // Library tab state
  const [allQuestions, setAllQuestions] = useState<QuestionWithTest[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Import tab state
  const [jsonInput, setJsonInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'library') {
      fetchQuestions();
    }
  }, [isOpen, activeTab]);

  const fetchQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const res = await fetch('/api/questions');
      if (res.ok) {
        const data = await res.json();
        setAllQuestions(data);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleAddNewQuestion = () => {
    let newQuestion: QuestionFormData;

    if (questionType === 'mcq') {
      const option1Id = crypto.randomUUID();
      const option2Id = crypto.randomUUID();
      newQuestion = {
        id: crypto.randomUUID(),
        type: questionType,
        content: '',
        points: 1,
        order: 0,
        options: [
          { id: option1Id, text: '', points: 1 },
          { id: option2Id, text: '', points: 0 },
        ],
        correctAnswer: option1Id, // Set to first option ID instead of empty string
      };
    } else {
      newQuestion = {
        id: crypto.randomUUID(),
        type: questionType,
        content: '',
        points: 1,
        order: 0,
        ...(questionType === 'timed' ? { timeLimitSeconds: 60 } : {}),
      };
    }

    onAddQuestions([newQuestion]);
    onClose();
  };

  const handleAddFromLibrary = () => {
    const selected = allQuestions.filter((q) => selectedQuestionIds.has(q.id));
    const questionsToAdd: QuestionFormData[] = selected.map((q) => {
      let options: MCQOption[] | undefined = undefined;
      let correctAnswer: string | undefined = undefined;

      if (q.options) {
        const parsed = JSON.parse(q.options);
        // Create mapping from old IDs to new IDs
        const idMap = new Map<string, string>();

        options = parsed.map((opt: { id: string; text: string; points?: number }) => {
          const newId = crypto.randomUUID();
          idMap.set(opt.id, newId);
          return {
            id: newId,
            text: opt.text,
            points: opt.points !== undefined ? opt.points : (opt.id === q.correctAnswer ? q.points : 0),
          };
        });

        // Map old correctAnswer ID to new ID
        if (q.correctAnswer && idMap.has(q.correctAnswer)) {
          correctAnswer = idMap.get(q.correctAnswer);
        }
      }

      return {
        id: crypto.randomUUID(),
        type: q.type as 'mcq' | 'freetext' | 'timed',
        content: q.content,
        options,
        correctAnswer,
        timeLimitSeconds: q.timeLimitSeconds || undefined,
        points: q.points,
        order: 0, // Will be set by parent
      };
    });

    onAddQuestions(questionsToAdd);
    setSelectedQuestionIds(new Set());
    onClose();
  };

  const handleImportFromJSON = () => {
    setImportError(null);
    try {
      const parsed = JSON.parse(jsonInput);

      if (!Array.isArray(parsed)) {
        throw new Error('JSON must be an array of questions');
      }

      const questionsToAdd: QuestionFormData[] = parsed.map((q, idx) => {
        if (!q.type || !q.content) {
          throw new Error(`Question ${idx + 1}: Missing type or content`);
        }

        let options: MCQOption[] | undefined = undefined;
        let correctAnswer: string | undefined = undefined;

        if (q.type === 'mcq') {
          if (!q.options || !Array.isArray(q.options)) {
            throw new Error(`Question ${idx + 1}: MCQ questions require options array`);
          }

          // Handle both string array and object array formats
          if (typeof q.options[0] === 'string') {
            // Old format: ["option1", "option2"]
            options = q.options.map((text: string, i: number) => ({
              id: crypto.randomUUID(),
              text,
              points: i === q.correctAnswer ? (q.points || 1) : 0,
            }));
          } else {
            // New format: [{text: "...", points: N}]
            options = q.options.map((opt: { text: string; points?: number }, i: number) => ({
              id: crypto.randomUUID(),
              text: opt.text,
              points: opt.points !== undefined ? opt.points : (i === q.correctAnswer ? (q.points || 1) : 0),
            }));
          }

          if (q.correctAnswer === undefined || q.correctAnswer === null) {
            throw new Error(`Question ${idx + 1}: MCQ questions require correctAnswer field`);
          }

          if (!options || q.correctAnswer < 0 || q.correctAnswer >= options.length) {
            throw new Error(`Question ${idx + 1}: Invalid correctAnswer index`);
          }

          // Set correctAnswer to the ID of the correct option
          correctAnswer = options[q.correctAnswer]?.id;
        }

        return {
          id: crypto.randomUUID(),
          type: q.type as 'mcq' | 'freetext' | 'timed',
          content: q.content,
          options,
          correctAnswer,
          timeLimitSeconds: q.timeLimitSeconds || undefined,
          points: q.points || 1,
          order: 0, // Will be set by parent
        };
      });

      onAddQuestions(questionsToAdd);
      setJsonInput('');
      onClose();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Invalid JSON format');
    }
  };

  const toggleQuestionSelection = (id: string) => {
    const newSet = new Set(selectedQuestionIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedQuestionIds(newSet);
  };

  const filteredQuestions = allQuestions.filter((q) => {
    if (typeFilter !== 'all' && q.type !== typeFilter) return false;
    if (searchQuery && !q.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Questions"
      className="max-w-4xl"
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('new')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'new'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Create New
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'library'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              From Library
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'import'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Import JSON
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'new' && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Select the type of question you want to create:
            </p>
            <Select
              label="Question Type"
              id="question-type"
              options={[
                { value: 'mcq', label: 'Multiple Choice' },
                { value: 'freetext', label: 'Free Text' },
                { value: 'timed', label: 'Timed Task' },
              ]}
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as 'mcq' | 'freetext' | 'timed')}
            />
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleAddNewQuestion}>
                Add Question
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'library' && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Select
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'mcq', label: 'Multiple Choice' },
                  { value: 'freetext', label: 'Free Text' },
                  { value: 'timed', label: 'Timed Task' },
                ]}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              />
            </div>

            {loadingQuestions ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredQuestions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No questions found</p>
                ) : (
                  filteredQuestions.map((q) => (
                    <div
                      key={q.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedQuestionIds.has(q.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleQuestionSelection(q.id)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedQuestionIds.has(q.id)}
                          onChange={() => toggleQuestionSelection(q.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="default">{q.type}</Badge>
                            <span className="text-sm text-gray-600">{q.points} pts</span>
                            <span className="text-xs text-gray-500">from: {q.test.title}</span>
                          </div>
                          <p className="text-sm text-gray-900 line-clamp-2">{q.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-sm text-gray-600">
                {selectedQuestionIds.size} question{selectedQuestionIds.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddFromLibrary}
                  disabled={selectedQuestionIds.size === 0}
                >
                  Add Selected
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">JSON Format</h4>
              <p className="text-sm text-blue-700 mb-2">
                Paste an array of question objects in the same format as test import:
              </p>
              <pre className="text-xs bg-blue-100 p-2 rounded overflow-x-auto">
{`[
  {
    "type": "mcq",
    "content": "Question text?",
    "options": ["A", "B", "C"],
    "correctAnswer": 0,
    "points": 1
  },
  {
    "type": "freetext",
    "content": "Essay question?",
    "points": 5
  }
]`}
              </pre>
            </div>

            <Textarea
              label="JSON Input"
              id="json-input"
              rows={12}
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setImportError(null);
              }}
              placeholder="Paste your questions JSON here..."
            />

            {importError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {importError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleImportFromJSON}
                disabled={!jsonInput.trim()}
              >
                Import Questions
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
