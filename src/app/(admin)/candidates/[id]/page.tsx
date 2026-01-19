'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
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
  category: string | null;
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
  status: string;
  notes: string | null;
  createdAt: string;
  assignments: Assignment[];
}

interface TestOption {
  id: string;
  title: string;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="px-4 sm:px-0">
        <Card className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Candidate not found</h3>
          <Link href="/candidates" className="text-blue-600 hover:underline mt-2 block">
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

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <Link href="/candidates" className="text-blue-600 hover:underline text-sm">
          ← Back to Candidates
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <h2 className="text-xl font-semibold mb-4">{candidate.name}</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{candidate.email}</p>
            </div>
            {candidate.phone && (
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{candidate.phone}</p>
              </div>
            )}
            {candidate.position && (
              <div>
                <p className="text-sm text-gray-500">Position</p>
                <p className="font-medium">{candidate.position}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <Badge variant={statusVariants[candidate.status] || 'default'}>
                {candidate.status}
              </Badge>
            </div>
            {candidate.notes && (
              <div>
                <p className="text-sm text-gray-500">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{candidate.notes}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Added</p>
              <p className="font-medium">{formatDate(candidate.createdAt)}</p>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Assigned Tests</h2>
            {availableTests.length > 0 && (
              <Button onClick={() => setShowAssignModal(true)}>Assign Test</Button>
            )}
          </div>

          {candidate.assignments.length === 0 ? (
            <Card className="text-center py-8 text-gray-500">
              No tests assigned yet.
              {availableTests.length > 0 && (
                <div className="mt-4">
                  <Button onClick={() => setShowAssignModal(true)}>Assign First Test</Button>
                </div>
              )}
            </Card>
          ) : (
            candidate.assignments.map((assignment) => {
              const score =
                assignment.status === 'completed'
                  ? calculateScore(assignment.responses)
                  : null;

              return (
                <Card key={assignment.id}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{assignment.test.title}</h3>
                      {assignment.test.description && (
                        <p className="text-sm text-gray-500">{assignment.test.description}</p>
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
                    >
                      {assignment.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-500">Assigned</p>
                      <p className="font-medium">{formatDateTime(assignment.assignedAt)}</p>
                    </div>
                    {assignment.startedAt && (
                      <div>
                        <p className="text-gray-500">Started</p>
                        <p className="font-medium">{formatDateTime(assignment.startedAt)}</p>
                      </div>
                    )}
                    {assignment.completedAt && (
                      <div>
                        <p className="text-gray-500">Completed</p>
                        <p className="font-medium">{formatDateTime(assignment.completedAt)}</p>
                      </div>
                    )}
                    {score && (
                      <div>
                        <p className="text-gray-500">Score</p>
                        <p className="font-medium">
                          {score.obtained}/{score.total} ({score.percentage}%)
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyTestLink(assignment.uniqueLink)}
                    >
                      {copiedLink === assignment.uniqueLink ? 'Copied!' : 'Copy Link'}
                    </Button>
                    {assignment.status === 'completed' && (
                      <Link href={`/reports?assignment=${assignment.id}`}>
                        <Button variant="ghost" size="sm">View Results</Button>
                      </Link>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteAssignment(assignment.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

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
            <Button onClick={handleAssignTest} loading={assigning} disabled={!selectedTest}>
              Assign Test
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
