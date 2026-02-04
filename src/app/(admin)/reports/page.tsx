'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Select from '@/components/ui/SelectSimple';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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

  // Pagination calculations
  const totalPages = Math.ceil(assignments.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAssignments = assignments.slice(startIndex, endIndex);

  // Reset to page 1 when filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, pageSize]);

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">View and analyze assessment results</p>
        </div>
        {viewMode === 'candidate' && (
          <Button onClick={handleExport} variant="secondary">
            Export CSV
          </Button>
        )}
      </div>

      {/* View Mode Tabs */}
      <div className="mb-6">
        <div className="border-b border-border">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setViewMode('candidate')}
              className={`${
                viewMode === 'candidate'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              By Candidate
            </button>
            <button
              onClick={() => setViewMode('test')}
              className={`${
                viewMode === 'test'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
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
          <Card className="mb-6 flex flex-col gap-4 overflow-hidden rounded-xl py-4">
            <div className="px-4">
              <h2 className="text-base font-medium leading-snug">Filters</h2>
              <p className="text-sm text-muted-foreground mt-1">Filter assessment results</p>
            </div>
            <div className="px-4">
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
            </div>
          </Card>

          {/* Results */}
          {assignments.length === 0 ? (
            <Card className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-muted-foreground"
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
              <h3 className="mt-4 text-lg font-medium text-foreground">No results found</h3>
              <p className="mt-2 text-muted-foreground">Try adjusting your filters or assign more tests.</p>
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
                  {paginatedAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <Link
                          href={`/candidates/${assignment.candidate.id}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {assignment.candidate.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">{assignment.candidate.email}</p>
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
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  assignment.score.percentage > 90
                                    ? 'bg-green-500'
                                    : assignment.score.percentage >= 80
                                    ? 'bg-yellow-500'
                                    : assignment.score.percentage >= 70
                                    ? 'bg-orange-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${assignment.score.percentage}%` }}
                              />
                            </div>
                            <Badge
                              variant={
                                assignment.score.percentage > 90
                                  ? 'success'
                                  : assignment.score.percentage >= 80
                                  ? 'warning'
                                  : 'danger'
                              }
                              className={`text-xs font-medium min-w-[3rem] justify-center ${
                                assignment.score.percentage >= 70 && assignment.score.percentage < 80
                                  ? 'bg-orange-500 text-white'
                                  : ''
                              }`}
                            >
                              {assignment.score.percentage}%
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {assignment.completedAt ? formatDate(assignment.completedAt) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setSelectedAssignment(assignment)}
                          title="View Details"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {assignments.length > 0 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Show</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                    <span className="text-sm text-muted-foreground">per page</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {startIndex + 1}-{Math.min(endIndex, assignments.length)} of {assignments.length}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage >= totalPages}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* Test View */}
      {viewMode === 'test' && (
        <>
          <Card className="mb-6 flex flex-col gap-4 overflow-hidden rounded-xl py-4">
            <div className="px-4">
              <h2 className="text-base font-medium leading-snug">Select Test</h2>
              <p className="text-sm text-muted-foreground mt-1">Choose a test to view analytics</p>
            </div>
            <div className="px-4">
              <div className="max-w-md">
                <Select
                  label="Test"
                  id="test-select"
                  options={[
                    { value: '', label: 'Choose a test...' },
                    ...tests.map((t) => ({ value: t.id, label: t.title })),
                  ]}
                  value={selectedTestForAnalytics}
                  onChange={(e) => setSelectedTestForAnalytics(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {selectedTestForAnalytics ? (
            <TestAnalytics testId={selectedTestForAnalytics} />
          ) : (
            <Card className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-muted-foreground"
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
              <h3 className="mt-4 text-lg font-medium text-foreground">Select a test to view analytics</h3>
              <p className="mt-2 text-muted-foreground">
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
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Candidate</p>
                  <p className="text-sm font-medium">{selectedAssignment.candidate.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Test</p>
                  <p className="text-sm font-medium">{selectedAssignment.test.title}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge
                    variant={
                      selectedAssignment.status === 'completed'
                        ? 'success'
                        : selectedAssignment.status === 'in_progress'
                        ? 'warning'
                        : 'default'
                    }
                    className="text-xs mt-1"
                  >
                    {selectedAssignment.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Score</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                        selectedAssignment.score.percentage > 90
                          ? 'bg-green-500'
                          : selectedAssignment.score.percentage >= 80
                          ? 'bg-yellow-500'
                          : selectedAssignment.score.percentage >= 70
                          ? 'bg-orange-500'
                          : 'bg-red-500'
                      }`}
                    >
                      {selectedAssignment.score.percentage}%
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {selectedAssignment.score.earned}/{selectedAssignment.score.total}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bulk AI Grading */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">AI Grading Assistant</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generate and accept AI grades for all freetext/timed questions at once
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={generateBulkAiGrades}
                    disabled={generatingBulkGrades || bulkAiGrades.length > 0}
                  >
                    {generatingBulkGrades ? 'Generating...' : bulkAiGrades.length > 0 ? '✓ Grades Generated' : '🤖 Generate All AI Grades'}
                  </Button>
                  {bulkAiGrades.length > 0 && (
                    <Button
                      onClick={acceptAllAiGrades}
                      disabled={savingBulkGrades}
                    >
                      {savingBulkGrades ? 'Saving...' : `Accept All (${bulkAiGrades.filter((g) => g.success).length})`}
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
                          ? 'bg-green-500/10 border-green-500/20'
                          : 'bg-destructive/10 border-destructive/20'
                      }`}
                    >
                      {result.success ? (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-700">
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
                          <p className="text-sm font-medium text-destructive">
                            Question: {result.questionContent}...
                          </p>
                          <p className="text-xs text-destructive mt-1">Error: {result.error}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Responses */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Responses</h3>
              {selectedAssignment.test.questions.map((question, index) => {
                const response = selectedAssignment.responses.find(
                  (r) => r.questionId === question.id
                );

                return (
                  <div key={question.id} className="rounded-lg border p-3 bg-muted/30">
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium">
                        Question {index + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {question.type}
                        </Badge>
                        <Badge variant="default" className="text-xs">
                          {question.points} pts
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{question.content}</p>

                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Answer</p>
                          <p className="text-sm text-foreground">
                            {response?.answer
                              ? question.type === 'mcq'
                                ? getOptionText(question.options, response.answer)
                                : response.answer
                              : <span className="text-muted-foreground">No answer</span>}
                          </p>
                        </div>

                        {question.type === 'mcq' && question.correctAnswer && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Correct Answer</p>
                            <p className="text-sm text-green-600">
                              {getOptionText(question.options, question.correctAnswer)}
                            </p>
                          </div>
                        )}
                      </div>

                      {response && (
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                          <div className="flex items-center gap-2">
                            {response.isCorrect !== null && (
                              <Badge variant={response.isCorrect ? 'success' : 'danger'} className="text-xs">
                                {response.isCorrect ? 'Correct' : 'Incorrect'}
                              </Badge>
                            )}
                            {response.score !== null && (
                              <span className="text-xs">
                                Score: {response.score}/{question.points}
                              </span>
                            )}
                            {response.timeTakenSeconds !== null && (
                              <span className="text-xs text-muted-foreground">
                                Time: {response.timeTakenSeconds}s
                              </span>
                            )}
                          </div>

                          {(question.type === 'freetext' || question.type === 'timed') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openGradeModal(response, question)}
                              className="h-7"
                            >
                              Grade
                            </Button>
                          )}
                        </div>
                      )}

                      {response?.graderNotes && (
                        <div className="mt-3 p-2 bg-amber-500/10 rounded text-xs">
                          <span className="font-medium">Grader Notes:</span> {response.graderNotes}
                        </div>
                      )}
                    </div>
                  </div>
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
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium text-foreground mb-2">Question</p>
                <p className="text-foreground whitespace-pre-wrap text-sm">
                  {gradingQuestion.content}
                </p>
              </div>

              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium text-foreground mb-2">Candidate Answer</p>
                <p className="text-foreground whitespace-pre-wrap text-sm">
                  {gradingResponse.answer || 'No answer provided'}
                </p>
              </div>
            </div>

            {/* AI Generate Button */}
            <div className="flex justify-center">
              <Button
                variant="secondary"
                onClick={generateAiGrade}
                disabled={generatingAiGrade || !!aiGrade}
              >
                {generatingAiGrade ? 'Generating...' : aiGrade ? '✓ AI Grade Generated' : '🤖 Generate AI Grade'}
              </Button>
            </div>

            {/* Side-by-Side Layout: AI Suggestions + Human Grading */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-border">
              {/* AI Suggestions Panel */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">AI Suggestions</h3>
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
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-sm font-medium text-green-700 mb-1">Suggested Score</p>
                      <p className="text-2xl font-bold text-green-700">
                        {aiGrade.suggestedScore} / {gradingQuestion.points}
                      </p>
                    </div>

                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <p className="text-sm font-medium text-primary mb-2">Strengths</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {aiGrade.strengths}
                      </p>
                    </div>

                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <p className="text-sm font-medium text-amber-700 mb-2">Weaknesses</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {aiGrade.weaknesses}
                      </p>
                    </div>

                    <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <p className="text-sm font-medium text-purple-700 mb-2">Fit Analysis</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {aiGrade.fitAnalysis}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 bg-muted rounded-lg border-2 border-dashed border-border">
                    <div className="text-center px-4">
                      <svg
                        className="mx-auto h-12 w-12 text-muted-foreground"
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
                      <p className="mt-2 text-sm text-muted-foreground">
                        Click "Generate AI Grade" to get AI-powered grading suggestions
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Human Grading Panel */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Your Grade</h3>

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

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
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
                  <Button onClick={handleGrade} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Grade'}
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
