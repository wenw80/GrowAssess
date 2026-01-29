'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { formatDate, formatDateTime } from '@/lib/utils';
import Link from 'next/link';
import TestAnalytics from '@/components/reports/TestAnalytics';

interface Question {
  id: string;
  type: string;
  content: string;
  options: string | null;
  correctAnswer: string | null;
  points: number;
}

interface Response {
  id: string;
  questionId: string;
  answer: string | null;
  isCorrect: boolean | null;
  score: number | null;
  timeTakenSeconds: number | null;
  graderNotes: string | null;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  position: string | null;
}

interface Test {
  id: string;
  title: string;
  questions: Question[];
}

interface Assignment {
  id: string;
  status: string;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  candidate: Candidate;
  test: Test;
  responses: Response[];
  score: {
    earned: number;
    total: number;
    percentage: number;
  };
}

interface TestOption {
  id: string;
  title: string;
}

interface CandidateOption {
  id: string;
  name: string;
  email: string;
}

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<'candidate' | 'test'>('candidate');
  const [selectedTestForAnalytics, setSelectedTestForAnalytics] = useState<string>('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tests, setTests] = useState<TestOption[]>([]);
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    candidateId: searchParams.get('candidateId') || '',
    testId: searchParams.get('testId') || '',
    status: searchParams.get('status') || 'all',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
  });

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [gradingResponse, setGradingResponse] = useState<Response | null>(null);
  const [gradingQuestion, setGradingQuestion] = useState<Question | null>(null);
  const [gradeForm, setGradeForm] = useState({ score: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [aiGrade, setAiGrade] = useState<{
    suggestedScore: number;
    strengths: string;
    weaknesses: string;
    fitAnalysis: string;
  } | null>(null);
  const [generatingAiGrade, setGeneratingAiGrade] = useState(false);
  const [bulkAiGrades, setBulkAiGrades] = useState<any[]>([]);
  const [generatingBulkGrades, setGeneratingBulkGrades] = useState(false);
  const [savingBulkGrades, setSavingBulkGrades] = useState(false);

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [filters, searchParams]);

  const fetchFiltersData = async () => {
    try {
      const [testsRes, candidatesRes] = await Promise.all([
        fetch('/api/tests'),
        fetch('/api/candidates'),
      ]);

      const testsData = await testsRes.json();
      const candidatesData = await candidatesRes.json();

      setTests(testsData);
      setCandidates(candidatesData);
    } catch (error) {
      console.error('Error fetching filter data:', error);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const assignmentParam = searchParams.get('assignment');
      if (assignmentParam) {
        params.set('assignment', assignmentParam);
      }
      if (filters.candidateId) params.set('candidateId', filters.candidateId);
      if (filters.testId) params.set('testId', filters.testId);
      if (filters.status !== 'all') params.set('status', filters.status);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);

      const res = await fetch(`/api/reports?${params}`);
      const data = await res.json();
      setAssignments(data);

      // Auto-open if assignment param present
      if (assignmentParam && data.length === 1) {
        setSelectedAssignment(data[0]);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filters.candidateId) params.set('candidateId', filters.candidateId);
    if (filters.testId) params.set('testId', filters.testId);
    if (filters.status !== 'all') params.set('status', filters.status);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);

    window.location.href = `/api/reports/export?${params}`;
  };

  const openGradeModal = (response: Response, question: Question) => {
    setGradingResponse(response);
    setGradingQuestion(question);
    setGradeForm({
      score: response.score?.toString() || '',
      notes: response.graderNotes || '',
    });
    setAiGrade(null); // Reset AI grade when opening modal
  };

  const generateAiGrade = async () => {
    if (!gradingResponse) return;

    setGeneratingAiGrade(true);
    try {
      const res = await fetch(`/api/responses/${gradingResponse.id}/ai-grade`, {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setAiGrade(data.grade);
      } else {
        alert(data.error || 'Failed to generate AI grade');
      }
    } catch (error) {
      console.error('Error generating AI grade:', error);
      alert('Failed to generate AI grade');
    } finally {
      setGeneratingAiGrade(false);
    }
  };

  const useAiSuggestion = () => {
    if (!aiGrade) return;
    setGradeForm({
      score: aiGrade.suggestedScore.toString(),
      notes: `Strengths:\n${aiGrade.strengths}\n\nWeaknesses:\n${aiGrade.weaknesses}\n\nFit Analysis:\n${aiGrade.fitAnalysis}`,
    });
  };

  const handleGrade = async () => {
    if (!gradingResponse) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/responses/${gradingResponse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: gradeForm.score ? parseInt(gradeForm.score) : null,
          graderNotes: gradeForm.notes || null,
        }),
      });

      if (res.ok) {
        setGradingResponse(null);
        setGradingQuestion(null);
        setAiGrade(null);
        fetchReports();
      }
    } catch (error) {
      console.error('Error saving grade:', error);
    } finally {
      setSaving(false);
    }
  };

  const generateBulkAiGrades = async () => {
    if (!selectedAssignment) return;

    setGeneratingBulkGrades(true);
    setBulkAiGrades([]);

    try {
      const res = await fetch('/api/responses/bulk-ai-grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: selectedAssignment.id }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setBulkAiGrades(data.results || []);

        if (data.summary.successful === 0) {
          alert('No gradable responses found (only freetext/timed questions with answers can be graded).');
        } else if (data.summary.failed > 0) {
          alert(
            `Generated ${data.summary.successful} grades successfully. ${data.summary.failed} failed.`
          );
        }
      } else {
        alert(data.error || 'Failed to generate AI grades');
      }
    } catch (error) {
      console.error('Error generating bulk AI grades:', error);
      alert('Failed to generate AI grades');
    } finally {
      setGeneratingBulkGrades(false);
    }
  };

  const acceptAllAiGrades = async () => {
    const successfulGrades = bulkAiGrades.filter((g) => g.success);

    if (successfulGrades.length === 0) {
      alert('No AI grades to accept');
      return;
    }

    if (!confirm(`Accept and save ${successfulGrades.length} AI-generated grades?`)) {
      return;
    }

    setSavingBulkGrades(true);

    try {
      const grades = successfulGrades.map((g) => ({
        responseId: g.responseId,
        score: g.grade.suggestedScore,
        graderNotes: `AI Assessment:\n\nStrengths:\n${g.grade.strengths}\n\nWeaknesses:\n${g.grade.weaknesses}\n\nFit Analysis:\n${g.grade.fitAnalysis}`,
      }));

      const res = await fetch('/api/responses/bulk-save-grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert(`Successfully saved ${data.updated} grades!`);
        setBulkAiGrades([]);
        fetchReports();
      } else {
        alert(data.error || 'Failed to save grades');
      }
    } catch (error) {
      console.error('Error saving bulk grades:', error);
      alert('Failed to save grades');
    } finally {
      setSavingBulkGrades(false);
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'completed', label: 'Completed' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'not_started', label: 'Not Started' },
  ];

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

  if (loading && assignments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">View and analyze assessment results</p>
        </div>
        {viewMode === 'candidate' && (
          <Button onClick={handleExport} variant="secondary">
            Export CSV
          </Button>
        )}
      </div>

      {/* View Mode Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setViewMode('candidate')}
              className={`${
                viewMode === 'candidate'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              By Candidate
            </button>
            <button
              onClick={() => setViewMode('test')}
              className={`${
                viewMode === 'test'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              By Test
            </button>
          </nav>
        </div>
      </div>

      {/* Candidate View */}
      {viewMode === 'candidate' && (
        <>
          {/* Filters */}
          <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Select
                label="Candidate"
                id="candidate"
                options={[
                  { value: '', label: 'All Candidates' },
                  ...candidates.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={filters.candidateId}
                onChange={(e) => setFilters({ ...filters, candidateId: e.target.value })}
              />
              <Select
                label="Test"
                id="test"
                options={[
                  { value: '', label: 'All Tests' },
                  ...tests.map((t) => ({ value: t.id, label: t.title })),
                ]}
                value={filters.testId}
                onChange={(e) => setFilters({ ...filters, testId: e.target.value })}
              />
              <Select
                label="Status"
                id="status"
                options={statusOptions}
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              />
              <Input
                label="From Date"
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
              <Input
                label="To Date"
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </Card>

          {/* Results */}
          {assignments.length === 0 ? (
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
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No results found</h3>
              <p className="mt-2 text-gray-500">Try adjusting your filters or assign more tests.</p>
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <Link
                          href={`/candidates/${assignment.candidate.id}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {assignment.candidate.name}
                        </Link>
                        <p className="text-sm text-gray-500">{assignment.candidate.email}</p>
                      </TableCell>
                      <TableCell>{assignment.test.title}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            assignment.status === 'completed'
                              ? 'success'
                              : assignment.status === 'in_progress'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {assignment.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {assignment.status === 'completed' ? (
                          <span className="font-medium">
                            {assignment.score.earned}/{assignment.score.total} ({assignment.score.percentage}%)
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {assignment.completedAt ? formatDate(assignment.completedAt) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAssignment(assignment)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}

      {/* Test View */}
      {viewMode === 'test' && (
        <>
          <Card className="mb-6">
            <div className="max-w-md">
              <Select
                label="Select Test"
                id="test-select"
                options={[
                  { value: '', label: 'Choose a test...' },
                  ...tests.map((t) => ({ value: t.id, label: t.title })),
                ]}
                value={selectedTestForAnalytics}
                onChange={(e) => setSelectedTestForAnalytics(e.target.value)}
              />
            </div>
          </Card>

          {selectedTestForAnalytics ? (
            <TestAnalytics testId={selectedTestForAnalytics} />
          ) : (
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
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Select a test to view analytics</h3>
              <p className="mt-2 text-gray-500">
                Choose a test from the dropdown above to see detailed performance analytics.
              </p>
            </Card>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedAssignment}
        onClose={() => {
          setSelectedAssignment(null);
          setBulkAiGrades([]);
        }}
        title="Assessment Details"
        className="max-w-4xl"
      >
        {selectedAssignment && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Candidate</p>
                <p className="font-medium">{selectedAssignment.candidate.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Test</p>
                <p className="font-medium">{selectedAssignment.test.title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <Badge
                  variant={
                    selectedAssignment.status === 'completed'
                      ? 'success'
                      : selectedAssignment.status === 'in_progress'
                      ? 'warning'
                      : 'default'
                  }
                >
                  {selectedAssignment.status.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Score</p>
                <p className="font-medium">
                  {selectedAssignment.score.earned}/{selectedAssignment.score.total} (
                  {selectedAssignment.score.percentage}%)
                </p>
              </div>
            </div>

            {/* Bulk AI Grading */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">AI Grading Assistant</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Generate and accept AI grades for all freetext/timed questions at once
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={generateBulkAiGrades}
                    loading={generatingBulkGrades}
                    disabled={bulkAiGrades.length > 0}
                  >
                    {bulkAiGrades.length > 0 ? '✓ Grades Generated' : '🤖 Generate All AI Grades'}
                  </Button>
                  {bulkAiGrades.length > 0 && (
                    <Button
                      onClick={acceptAllAiGrades}
                      loading={savingBulkGrades}
                    >
                      Accept All ({bulkAiGrades.filter((g) => g.success).length})
                    </Button>
                  )}
                </div>
              </div>

              {/* Bulk grading results */}
              {bulkAiGrades.length > 0 && (
                <div className="space-y-2">
                  {bulkAiGrades.map((result, idx) => (
                    <div
                      key={result.responseId}
                      className={`p-3 rounded-lg border ${
                        result.success
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      {result.success ? (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-900">
                              Question: {result.questionContent}...
                            </p>
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              <div>
                                <span className="font-medium text-green-800">Score: </span>
                                <span className="text-green-700">{result.grade.suggestedScore}</span>
                              </div>
                              <div>
                                <span className="font-medium text-green-800">Strengths: </span>
                                <span className="text-green-700">
                                  {result.grade.strengths.substring(0, 50)}...
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-green-800">Weaknesses: </span>
                                <span className="text-green-700">
                                  {result.grade.weaknesses.substring(0, 50)}...
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-medium text-red-900">
                            Question: {result.questionContent}...
                          </p>
                          <p className="text-xs text-red-700 mt-1">Error: {result.error}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Responses */}
            <div className="space-y-4">
              <h3 className="font-semibold">Responses</h3>
              {selectedAssignment.test.questions.map((question, index) => {
                const response = selectedAssignment.responses.find(
                  (r) => r.questionId === question.id
                );

                return (
                  <Card key={question.id} className="bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-gray-500">
                        Question {index + 1} ({question.type})
                      </span>
                      <span className="text-sm text-gray-500">{question.points} pts</span>
                    </div>

                    <p className="text-gray-900 mb-4 whitespace-pre-wrap">{question.content}</p>

                    <div className="border-t border-gray-200 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Answer</p>
                          <p className="text-gray-900">
                            {response?.answer
                              ? question.type === 'mcq'
                                ? getOptionText(question.options, response.answer)
                                : response.answer
                              : <span className="text-gray-400">No answer</span>}
                          </p>
                        </div>

                        {question.type === 'mcq' && question.correctAnswer && (
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Correct Answer</p>
                            <p className="text-green-600">
                              {getOptionText(question.options, question.correctAnswer)}
                            </p>
                          </div>
                        )}
                      </div>

                      {response && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center gap-4">
                            {response.isCorrect !== null && (
                              <Badge variant={response.isCorrect ? 'success' : 'danger'}>
                                {response.isCorrect ? 'Correct' : 'Incorrect'}
                              </Badge>
                            )}
                            {response.score !== null && (
                              <span className="text-sm">
                                Score: {response.score}/{question.points}
                              </span>
                            )}
                            {response.timeTakenSeconds !== null && (
                              <span className="text-sm text-gray-500">
                                Time: {response.timeTakenSeconds}s
                              </span>
                            )}
                          </div>

                          {(question.type === 'freetext' || question.type === 'timed') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openGradeModal(response, question)}
                            >
                              Grade
                            </Button>
                          )}
                        </div>
                      )}

                      {response?.graderNotes && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded text-sm">
                          <span className="font-medium">Grader Notes:</span> {response.graderNotes}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* Grading Modal */}
      <Modal
        isOpen={!!gradingResponse}
        onClose={() => {
          setGradingResponse(null);
          setGradingQuestion(null);
          setAiGrade(null);
        }}
        title="Grade Response"
        className="max-w-6xl"
      >
        {gradingResponse && gradingQuestion && (
          <div className="space-y-4">
            {/* Question and Answer Context */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Question</p>
                <p className="text-gray-900 whitespace-pre-wrap text-sm">
                  {gradingQuestion.content}
                </p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Candidate Answer</p>
                <p className="text-gray-900 whitespace-pre-wrap text-sm">
                  {gradingResponse.answer || 'No answer provided'}
                </p>
              </div>
            </div>

            {/* AI Generate Button */}
            <div className="flex justify-center">
              <Button
                variant="secondary"
                onClick={generateAiGrade}
                loading={generatingAiGrade}
                disabled={!!aiGrade}
              >
                {aiGrade ? '✓ AI Grade Generated' : '🤖 Generate AI Grade'}
              </Button>
            </div>

            {/* Side-by-Side Layout: AI Suggestions + Human Grading */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t">
              {/* AI Suggestions Panel */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">AI Suggestions</h3>
                  {aiGrade && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={useAiSuggestion}
                    >
                      Use AI Grade →
                    </Button>
                  )}
                </div>

                {aiGrade ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-900 mb-1">Suggested Score</p>
                      <p className="text-2xl font-bold text-green-700">
                        {aiGrade.suggestedScore} / {gradingQuestion.points}
                      </p>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-2">Strengths</p>
                      <p className="text-sm text-blue-800 whitespace-pre-wrap">
                        {aiGrade.strengths}
                      </p>
                    </div>

                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm font-medium text-orange-900 mb-2">Weaknesses</p>
                      <p className="text-sm text-orange-800 whitespace-pre-wrap">
                        {aiGrade.weaknesses}
                      </p>
                    </div>

                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-sm font-medium text-purple-900 mb-2">Fit Analysis</p>
                      <p className="text-sm text-purple-800 whitespace-pre-wrap">
                        {aiGrade.fitAnalysis}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-center px-4">
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
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">
                        Click "Generate AI Grade" to get AI-powered grading suggestions
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Human Grading Panel */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Your Grade</h3>

                <Input
                  label={`Score (max ${gradingQuestion.points})`}
                  id="score"
                  type="number"
                  min={0}
                  max={gradingQuestion.points}
                  value={gradeForm.score}
                  onChange={(e) => setGradeForm({ ...gradeForm, score: e.target.value })}
                />

                <Textarea
                  label="Grader Notes"
                  id="notes"
                  rows={12}
                  value={gradeForm.notes}
                  onChange={(e) => setGradeForm({ ...gradeForm, notes: e.target.value })}
                  placeholder="Enter your feedback, including strengths, weaknesses, and fit analysis..."
                />

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setGradingResponse(null);
                      setGradingQuestion(null);
                      setAiGrade(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleGrade} loading={saving}>
                    Save Grade
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
