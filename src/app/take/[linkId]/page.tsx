'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Test {
  title: string;
  description: string | null;
  durationMinutes: number | null;
  questions: Array<{ id: string }>;
}

interface Assignment {
  id: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  candidate: {
    name: string;
    email: string;
  };
  test: Test;
}

export default function TestLandingPage({
  params,
}: {
  params: Promise<{ linkId: string }>;
}) {
  const { linkId } = use(params);
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignment();
  }, [linkId]);

  const fetchAssignment = async () => {
    try {
      const res = await fetch(`/api/assignments/link/${linkId}`);
      if (res.ok) {
        const data = await res.json();
        setAssignment(data);
      } else {
        setError('Test not found or link has expired');
      }
    } catch {
      setError('Failed to load test');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!assignment) return;

    setStarting(true);
    try {
      const res = await fetch(`/api/assignments/link/${linkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });

      if (res.ok) {
        router.push(`/take/${linkId}/test`);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to start test');
      }
    } catch {
      setError('Failed to start test');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center p-6">
          <svg
            className="mx-auto h-12 w-12 text-destructive"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-foreground">
            {error || 'Test not found'}
          </h2>
          <p className="mt-2 text-muted-foreground">
            The test link may be invalid or expired. Please contact the administrator.
          </p>
        </Card>
      </div>
    );
  }

  if (assignment.status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center p-6">
          <svg
            className="mx-auto h-12 w-12 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-foreground">Test Completed</h2>
          <p className="mt-2 text-muted-foreground">
            You have already completed this test. Thank you for your submission.
          </p>
        </Card>
      </div>
    );
  }

  if (assignment.status === 'in_progress') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center p-6">
          <h2 className="text-xl font-semibold text-foreground">Test in Progress</h2>
          <p className="mt-2 text-muted-foreground mb-6">
            You have already started this test. Continue where you left off.
          </p>
          <Button onClick={() => router.push(`/take/${linkId}/test`)}>
            Continue Test
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">{assignment.test.title}</h1>
          {assignment.test.description && (
            <p className="mt-2 text-muted-foreground">{assignment.test.description}</p>
          )}
        </div>

        <div className="border-t border-b border-border py-4 my-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Questions</p>
              <p className="text-2xl font-semibold text-foreground">{assignment.test.questions.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-2xl font-semibold text-foreground">
                {assignment.test.durationMinutes
                  ? `${assignment.test.durationMinutes} min`
                  : 'Untimed'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-muted rounded-lg p-4 mb-6">
          <h3 className="font-medium text-foreground mb-2">Candidate</h3>
          <p className="text-foreground">{assignment.candidate.name}</p>
          <p className="text-sm text-muted-foreground">{assignment.candidate.email}</p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-amber-700 mb-2">Instructions</h3>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• Read each question carefully before answering</li>
            <li>• Some questions may have time limits</li>
            <li>• Your progress is saved automatically</li>
            <li>• Once submitted, you cannot change your answers</li>
          </ul>
        </div>

        <Button onClick={handleStart} disabled={starting} className="w-full" size="lg">
          {starting ? 'Starting...' : 'Start Test'}
        </Button>
      </Card>
    </div>
  );
}
