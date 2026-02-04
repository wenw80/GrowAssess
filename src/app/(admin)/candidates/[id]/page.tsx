'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/SelectSimple';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { formatDate, formatDateTime, calculateScore } from '@/lib/utils';

interface Question {
  id: string;
  type: string;
  content: string;
  points: number;
}

interface Response {
  id: string;
  answer: string | null;
  isCorrect: boolean | null;
  score: number | null;
  timeTakenSeconds: number | null;
  graderNotes: string | null;
  question: Question;
}

interface Test {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  durationMinutes: number | null;
}

interface Assignment {
  id: string;
  uniqueLink: string;
  status: string;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  test: Test;
  responses: Response[];
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
  jobDescription: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  assignments: Assignment[];
}

interface TestOption {
  id: string;
  title: string;
}

interface FitAnalysis {
  overallFitScore: number;
  fitLevel: string;
  summary: string;
  strengths: string[];
  concerns: string[];
  skillMatch: {
    matched: string[];
    missing: string[];
    exceeded: string[];
  };
  recommendation: string;
  detailedAnalysis: string;
  interviewSuggestions: string[];
}

export default function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [tests, setTests] = useState<TestOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    status: 'active',
    notes: '',
    jobDescription: '',
  });
  const [saving, setSaving] = useState(false);

  // AI Analysis state
  const [fitAnalysis, setFitAnalysis] = useState<FitAnalysis | null>(null);
  const [analyzingFit, setAnalyzingFit] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [candidateRes, testsRes] = await Promise.all([
        fetch(`/api/candidates/${id}`),
        fetch('/api/tests'),
      ]);

      const candidateData = await candidateRes.json();
      const testsData = await testsRes.json();

      setCandidate(candidateData);
      setTests(testsData);

      // Initialize edit form
      setEditForm({
        name: candidateData.name || '',
        email: candidateData.email || '',
        phone: candidateData.phone || '',
        position: candidateData.position || '',
        status: candidateData.status || 'active',
        notes: candidateData.notes || '',
        jobDescription: candidateData.jobDescription || '',
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTest = async () => {
    if (!selectedTest) return;

    setAssigning(true);
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: id,
          testId: selectedTest,
        }),
      });

      if (res.ok) {
        setShowAssignModal(false);
        setSelectedTest('');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to assign test');
      }
    } catch (error) {
      console.error('Error assigning test:', error);
    } finally {
      setAssigning(false);
    }
  };

  const copyTestLink = (link: string) => {
    const fullUrl = `${window.location.origin}/take/${link}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const deleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this test assignment?')) return;

    try {
      await fetch(`/api/assignments/${assignmentId}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  const handleSaveCandidate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/candidates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        const updatedCandidate = await res.json();
        setCandidate((prev) => prev ? { ...prev, ...updatedCandidate } : null);
        setIsEditing(false);
      } else {
        alert('Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving candidate:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyzeFit = async () => {
    setAnalyzingFit(true);
    setAnalysisError(null);
    setFitAnalysis(null);

    try {
      const res = await fetch(`/api/candidates/${id}/fit-analysis`, {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFitAnalysis(data.analysis);
      } else {
        setAnalysisError(data.error || 'Failed to generate analysis');
      }
    } catch (error) {
      console.error('Error analyzing fit:', error);
      setAnalysisError('Failed to connect to AI service');
    } finally {
      setAnalyzingFit(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <Card className="text-center py-12">
          <h3 className="text-lg font-medium text-foreground">Candidate not found</h3>
          <Link href="/candidates" className="text-primary hover:underline mt-2 block">
            Back to Candidates
          </Link>
        </Card>
      </div>
    );
  }

  const availableTests = tests.filter(
    (t) => !candidate.assignments.some((a) => a.test.id === t.id)
  );

  const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    active: 'info',
    pending: 'warning',
    hired: 'success',
    rejected: 'danger',
  };

  const hasCompletedTests = candidate.assignments.some((a) => a.status === 'completed');

  const getFitScoreColor = (score: number) => {
    if (score > 90) return 'bg-green-500';
    if (score >= 80) return 'bg-yellow-500';
    if (score >= 70) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getRecommendationBadge = (recommendation: string) => {
    const variants: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      'Highly Recommend': 'success',
      'Recommend': 'info',
      'Consider with Reservations': 'warning',
      'Do Not Recommend': 'danger',
    };
    return variants[recommendation] || 'default';
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/candidates" className="text-primary hover:underline text-sm">
          ← Back to Candidates
        </Link>
        {!isEditing && (
          <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
            Edit Candidate
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Candidate Info Card */}
        <Card className="lg:col-span-1 flex flex-col gap-4 overflow-hidden rounded-xl py-4">
          <div className="px-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium leading-snug">{candidate.name}</h2>
              <Badge variant={statusVariants[candidate.status] || 'default'} className="text-xs">
                {candidate.status}
              </Badge>
            </div>
            {candidate.position && (
              <p className="text-sm text-muted-foreground mt-1">{candidate.position}</p>
            )}
          </div>

          <div className="px-4 space-y-3">
            <div className="rounded-lg border p-3 bg-muted/30 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{candidate.email}</p>
              </div>
              {candidate.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{candidate.phone}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Added</p>
                <p className="text-xs font-medium">{formatDate(candidate.createdAt)}</p>
              </div>
            </div>

            {candidate.jobDescription && (
              <div className="rounded-lg border p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Job Description</p>
                <p className="text-sm whitespace-pre-wrap">{candidate.jobDescription}</p>
              </div>
            )}

            {candidate.notes && (
              <div className="rounded-lg border p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{candidate.notes}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Assigned Tests Card */}
        <Card className="lg:col-span-2 flex flex-col gap-4 overflow-hidden rounded-xl py-4">
          <div className="px-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium leading-snug">Assigned Tests ({candidate.assignments.length})</h2>
              {availableTests.length > 0 && (
                <Button size="sm" onClick={() => setShowAssignModal(true)}>Assign Test</Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Tests assigned to this candidate
            </p>
          </div>

          <div className="px-4 space-y-3">
            {candidate.assignments.length === 0 ? (
              <div className="rounded-lg border p-6 bg-muted/30 text-center text-muted-foreground">
                No tests assigned yet.
                {availableTests.length > 0 && (
                  <div className="mt-4">
                    <Button onClick={() => setShowAssignModal(true)}>Assign First Test</Button>
                  </div>
                )}
              </div>
            ) : (
              candidate.assignments.map((assignment) => {
                const score =
                  assignment.status === 'completed'
                    ? calculateScore(assignment.responses)
                    : null;

                return (
                  <div key={assignment.id} className="rounded-lg border p-3 bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-medium">{assignment.test.title}</h3>
                        {assignment.test.description && (
                          <p className="text-sm text-muted-foreground mt-1">{assignment.test.description}</p>
                        )}
                      </div>
                      <Badge
                        variant={
                          assignment.status === 'completed'
                            ? 'success'
                            : assignment.status === 'in_progress'
                            ? 'warning'
                            : 'default'
                        }
                        className="text-xs"
                      >
                        {assignment.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3 pt-3 border-t border-border">
                      <div>
                        <p className="text-muted-foreground text-xs">Assigned</p>
                        <p className="font-medium text-xs">{formatDateTime(assignment.assignedAt)}</p>
                      </div>
                      {assignment.startedAt && (
                        <div>
                          <p className="text-muted-foreground text-xs">Started</p>
                          <p className="font-medium text-xs">{formatDateTime(assignment.startedAt)}</p>
                        </div>
                      )}
                      {assignment.completedAt && (
                        <div>
                          <p className="text-muted-foreground text-xs">Completed</p>
                          <p className="font-medium text-xs">{formatDateTime(assignment.completedAt)}</p>
                        </div>
                      )}
                      {score && (
                        <div>
                          <p className="text-muted-foreground text-xs">Score</p>
                          <p className="font-medium text-xs">
                            {score.obtained}/{score.total} ({score.percentage}%)
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyTestLink(assignment.uniqueLink)}
                        className="h-7"
                      >
                        {copiedLink === assignment.uniqueLink ? 'Copied!' : 'Copy Link'}
                      </Button>
                      {assignment.status === 'completed' && (
                        <Link href={`/reports?assignment=${assignment.id}`}>
                          <Button variant="ghost" size="sm" className="h-7">View Results</Button>
                        </Link>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteAssignment(assignment.id)}
                        className="h-7"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* AI Fit Analysis Section */}
      <Card className="mt-6 flex flex-col gap-4 overflow-hidden rounded-xl py-4">
        <div className="px-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium leading-snug">AI Fit Analysis</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Generate an AI-powered analysis of the candidate's fit for the role
              </p>
            </div>
            <Button
              onClick={handleAnalyzeFit}
              disabled={analyzingFit || !hasCompletedTests}
              title={!hasCompletedTests ? 'Candidate must complete at least one test' : ''}
            >
              {analyzingFit ? 'Analyzing...' : fitAnalysis ? 'Re-analyze' : 'Generate Analysis'}
            </Button>
          </div>
        </div>

        <div className="px-4">
          {!hasCompletedTests && (
            <div className="rounded-lg border p-6 bg-muted/30 text-center text-muted-foreground">
              The candidate must complete at least one assessment before generating a fit analysis.
            </div>
          )}

          {analysisError && (
            <div className="rounded-lg border border-destructive/50 p-4 bg-destructive/10 text-destructive">
              {analysisError}
            </div>
          )}

          {analyzingFit && (
            <div className="rounded-lg border p-6 bg-muted/30 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Analyzing candidate fit...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
            </div>
          )}

          {fitAnalysis && !analyzingFit && (
            <div className="space-y-4">
              {/* Score Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4 bg-muted/30 text-center">
                  <p className="text-xs text-muted-foreground mb-2">Overall Fit Score</p>
                  <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-xl font-bold text-white ${getFitScoreColor(fitAnalysis.overallFitScore)}`}>
                    {fitAnalysis.overallFitScore}%
                  </div>
                </div>
                <div className="rounded-lg border p-4 bg-muted/30 text-center">
                  <p className="text-xs text-muted-foreground mb-2">Fit Level</p>
                  <p className="text-lg font-bold">{fitAnalysis.fitLevel}</p>
                </div>
                <div className="rounded-lg border p-4 bg-muted/30 text-center">
                  <p className="text-xs text-muted-foreground mb-2">Recommendation</p>
                  <Badge variant={getRecommendationBadge(fitAnalysis.recommendation)} className="text-sm">
                    {fitAnalysis.recommendation}
                  </Badge>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-lg border p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-2">Summary</p>
                <p className="text-sm">{fitAnalysis.summary}</p>
              </div>

              {/* Strengths & Concerns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 bg-green-500/5">
                  <p className="text-xs text-green-700 font-medium mb-2">Strengths</p>
                  <ul className="space-y-1">
                    {fitAnalysis.strengths.map((s, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border p-4 bg-amber-500/5">
                  <p className="text-xs text-amber-700 font-medium mb-2">Concerns</p>
                  <ul className="space-y-1">
                    {fitAnalysis.concerns.map((c, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">!</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Skill Match */}
              <div className="rounded-lg border p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-3">Skill Match Analysis</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {fitAnalysis.skillMatch.matched.length > 0 && (
                    <div>
                      <p className="text-[10px] text-green-700 font-medium mb-1">Matched Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {fitAnalysis.skillMatch.matched.map((s, i) => (
                          <Badge key={i} variant="success" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {fitAnalysis.skillMatch.missing.length > 0 && (
                    <div>
                      <p className="text-[10px] text-amber-700 font-medium mb-1">Missing Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {fitAnalysis.skillMatch.missing.map((s, i) => (
                          <Badge key={i} variant="warning" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {fitAnalysis.skillMatch.exceeded.length > 0 && (
                    <div>
                      <p className="text-[10px] text-purple-700 font-medium mb-1">Exceeded Expectations</p>
                      <div className="flex flex-wrap gap-1">
                        {fitAnalysis.skillMatch.exceeded.map((s, i) => (
                          <Badge key={i} variant="info" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Analysis */}
              <div className="rounded-lg border p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-2">Detailed Analysis</p>
                <p className="text-sm whitespace-pre-wrap">{fitAnalysis.detailedAnalysis}</p>
              </div>

              {/* Interview Suggestions */}
              {fitAnalysis.interviewSuggestions && fitAnalysis.interviewSuggestions.length > 0 && (
                <div className="rounded-lg border p-4 bg-primary/5">
                  <p className="text-xs text-primary font-medium mb-2">Suggested Interview Topics</p>
                  <ul className="space-y-1">
                    {fitAnalysis.interviewSuggestions.map((s, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-0.5">→</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Assign Test Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Test"
      >
        <div className="space-y-4">
          <Select
            label="Select Test"
            id="test"
            options={[
              { value: '', label: 'Choose a test...' },
              ...availableTests.map((t) => ({ value: t.id, label: t.title })),
            ]}
            value={selectedTest}
            onChange={(e) => setSelectedTest(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignTest} disabled={assigning || !selectedTest}>
              {assigning ? 'Assigning...' : 'Assign Test'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Candidate Modal */}
      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title="Edit Candidate"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              id="name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
            />
            <Input
              label="Email"
              id="email"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              required
            />
            <Input
              label="Phone"
              id="phone"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
            <Input
              label="Position Applied"
              id="position"
              value={editForm.position}
              onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
            />
          </div>

          <Select
            label="Status"
            id="status"
            value={editForm.status}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'pending', label: 'Pending' },
              { value: 'hired', label: 'Hired' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />

          <Textarea
            label="Job Description"
            id="jobDescription"
            value={editForm.jobDescription}
            onChange={(e) => setEditForm({ ...editForm, jobDescription: e.target.value })}
            rows={6}
            placeholder="Paste the job description for the position this candidate is applying for. This will be used for AI fit analysis."
          />

          <Textarea
            label="Notes"
            id="notes"
            value={editForm.notes}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
            rows={3}
            placeholder="Internal notes about this candidate"
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCandidate} disabled={saving || !editForm.name || !editForm.email}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
