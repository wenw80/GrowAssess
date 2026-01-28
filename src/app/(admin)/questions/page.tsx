'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import TagFilter from '@/components/ui/TagFilter';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import BulkTagEditor from '@/components/questions/BulkTagEditor';

interface Question {
  id: string;
  type: string;
  content: string;
  options: string | null;
  correctAnswer: string | null;
  timeLimitSeconds: number | null;
  points: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  _count: {
    tests: number;
  };
  tests: Array<{
    test: {
      id: string;
      title: string;
      tags: string[];
      createdAt: string;
    };
  }>;
}

export default function QuestionsLibraryPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [showBulkTagEditor, setShowBulkTagEditor] = useState(false);
  const [questionForTests, setQuestionForTests] = useState<Question | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/questions');
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question? It will be removed from all tests that use it.')) {
      return;
    }

    setDeleting(id);
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setQuestions(questions.filter((q) => q.id !== id));
      } else {
        alert('Failed to delete question');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question');
    } finally {
      setDeleting(null);
    }
  };

  // Get all unique tags from questions
  const allTags = Array.from(
    new Set(questions.flatMap((q) => q.tags))
  ).sort();

  // Filter questions
  const filteredQuestions = questions.filter((q) => {
    if (typeFilter !== 'all' && q.type !== typeFilter) return false;
    if (selectedTags.length > 0 && !selectedTags.some((tag) => q.tags.includes(tag))) {
      return false;
    }
    if (searchQuery && !q.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setTypeFilter('all');
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

  const selectAllFiltered = () => {
    const newSet = new Set(filteredQuestions.map(q => q.id));
    setSelectedQuestionIds(newSet);
  };

  const deselectAll = () => {
    setSelectedQuestionIds(new Set());
  };

  const handleBulkTagSuccess = async () => {
    await fetchQuestions();
    setSelectedQuestionIds(new Set());
  };

  const getOptionText = (options: string | null, answerId: string | null) => {
    if (!options || !answerId) return '-';
    try {
      const parsed = JSON.parse(options);
      const option = parsed.find((o: { id: string; text: string }) => o.id === answerId);
      return option?.text || answerId;
    } catch {
      return answerId;
    }
  };

  const hasActiveFilters = searchQuery || selectedTags.length > 0 || typeFilter !== 'all';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl font-bold text-gray-900">Questions Library</h1>
          <p className="text-gray-500 mt-1">Browse and manage all questions across your tests</p>
        </div>
        <Link href="/questions/new">
          <Button>Create Question</Button>
        </Link>
      </div>

      {/* Filters */}
      {questions.length > 0 && (
        <Card className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
            <TagFilter
              tags={allTags}
              selectedTags={selectedTags}
              onChange={setSelectedTags}
              placeholder="Filter by tags..."
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
              className="w-full"
            />
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="w-full sm:w-auto"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Questions List */}
      {filteredQuestions.length === 0 ? (
        <Card className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No questions found</h3>
          <p className="mt-2 text-gray-500">
            {hasActiveFilters
              ? 'Try adjusting your filters.'
              : 'Create your first question to get started.'}
          </p>
          {hasActiveFilters && (
            <div className="mt-6">
              <Button variant="secondary" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <>
          {/* Bulk Actions Bar */}
          {selectedQuestionIds.size > 0 && (
            <Card className="mb-4 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedQuestionIds.size} question{selectedQuestionIds.size !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={deselectAll}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Deselect all
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowBulkTagEditor(true)}
                  >
                    Edit Tags
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedQuestionIds.size === filteredQuestions.length && filteredQuestions.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAllFiltered();
                          } else {
                            deselectAll();
                          }
                        }}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead className="min-w-[400px]">Question</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Used in Tests</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedQuestionIds.has(question.id)}
                          onChange={() => toggleQuestionSelection(question.id)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell className="min-w-[400px]">
                      <button
                        onClick={() => setSelectedQuestion(question)}
                        className="text-left hover:text-blue-600 transition-colors"
                      >
                        <p className="font-medium line-clamp-2">{question.content}</p>
                        {question.type === 'mcq' && question.correctAnswer && (
                          <p className="text-sm text-gray-500 mt-1">
                            Correct: {getOptionText(question.options, question.correctAnswer)}
                          </p>
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        {question.type === 'mcq' ? 'MCQ' : question.type === 'freetext' ? 'Free Text' : 'Timed'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {question.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {question.tags.map((tag, idx) => (
                            <Badge key={idx} variant="info">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>{question.points}</TableCell>
                    <TableCell>
                      {question._count.tests > 0 ? (
                        <button
                          onClick={() => setQuestionForTests(question)}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {question._count.tests} test{question._count.tests !== 1 ? 's' : ''}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">0 tests</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/questions/${question.id}`}>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(question.id)}
                          loading={deleting === question.id}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
        </>
      )}

      {/* Bulk Tag Editor */}
      <BulkTagEditor
        isOpen={showBulkTagEditor}
        onClose={() => setShowBulkTagEditor(false)}
        selectedQuestionIds={Array.from(selectedQuestionIds)}
        existingTags={allTags}
        onSuccess={handleBulkTagSuccess}
      />

      {/* Question Detail Modal */}
      <Modal
        isOpen={!!selectedQuestion}
        onClose={() => setSelectedQuestion(null)}
        title="Question Details"
        className="max-w-2xl"
      >
        {selectedQuestion && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <Badge variant="default">
                {selectedQuestion.type === 'mcq'
                  ? 'Multiple Choice'
                  : selectedQuestion.type === 'freetext'
                  ? 'Free Text'
                  : 'Timed Task'}
              </Badge>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
              <p className="text-gray-900 whitespace-pre-wrap">{selectedQuestion.content}</p>
            </div>

            {selectedQuestion.type === 'mcq' && selectedQuestion.options && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                <div className="space-y-2">
                  {JSON.parse(selectedQuestion.options).map((opt: { id: string; text: string; points?: number }, idx: number) => (
                    <div
                      key={opt.id}
                      className={`p-2 rounded ${
                        opt.id === selectedQuestion.correctAnswer
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-gray-50'
                      }`}
                    >
                      <span className="font-medium">
                        {String.fromCharCode(65 + idx)}.
                      </span>{' '}
                      {opt.text}
                      {opt.points !== undefined && (
                        <span className="ml-2 text-sm text-gray-600">({opt.points} pts)</span>
                      )}
                      {opt.id === selectedQuestion.correctAnswer && (
                        <span className="ml-2 text-green-600 text-sm">✓ Correct</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
                <p className="text-gray-900">{selectedQuestion.points}</p>
              </div>
              {selectedQuestion.timeLimitSeconds && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Limit</label>
                  <p className="text-gray-900">{selectedQuestion.timeLimitSeconds} seconds</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              {selectedQuestion.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedQuestion.tags.map((tag, idx) => (
                    <Badge key={idx} variant="info">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No tags</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Usage</label>
              {selectedQuestion._count.tests > 0 ? (
                <button
                  onClick={() => {
                    setQuestionForTests(selectedQuestion);
                    setSelectedQuestion(null);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Used in {selectedQuestion._count.tests} test{selectedQuestion._count.tests !== 1 ? 's' : ''} - Click to view
                </button>
              ) : (
                <p className="text-gray-600 text-sm">Not used in any tests yet</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setSelectedQuestion(null)}>
                Close
              </Button>
              <Link href={`/questions/${selectedQuestion.id}`}>
                <Button>Edit Question</Button>
              </Link>
            </div>
          </div>
        )}
      </Modal>

      {/* Tests Using This Question Modal */}
      <Modal
        isOpen={!!questionForTests}
        onClose={() => setQuestionForTests(null)}
        title="Tests Using This Question"
        className="max-w-3xl"
      >
        {questionForTests && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Question:</p>
              <p className="font-medium line-clamp-2">{questionForTests.content}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-3">
                This question is used in {questionForTests._count.tests} test{questionForTests._count.tests !== 1 ? 's' : ''}:
              </p>

              {questionForTests.tests.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No tests use this question</p>
              ) : (
                <div className="space-y-2">
                  {questionForTests.tests.map((testQuestion) => (
                    <Link
                      key={testQuestion.test.id}
                      href={`/tests/${testQuestion.test.id}`}
                      className="block p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 hover:text-blue-600">
                            {testQuestion.test.title}
                          </h3>
                          {testQuestion.test.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {testQuestion.test.tags.map((tag, idx) => (
                                <Badge key={idx} variant="info">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Created {new Date(testQuestion.test.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <svg
                          className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="secondary" onClick={() => setQuestionForTests(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
