'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';

export default function PublicTestPage({
  params,
}: {
  params: Promise<{ publicLink: string }>;
}) {
  const { publicLink } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTest();
  }, [publicLink]);

  const fetchTest = async () => {
    try {
      const res = await fetch(`/api/public-test/${publicLink}`);
      if (res.ok) {
        const data = await res.json();
        setTest(data);
      } else {
        setError('Test not found or no longer available');
      }
    } catch (err) {
      setError('Failed to load test');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/public-test/${publicLink}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (res.ok) {
        // Redirect to the test taking page
        router.push(`/take/${data.assignmentLink}`);
      } else {
        setError(data.error || 'Failed to start test');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error && !test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-red-400"
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
          <h3 className="mt-4 text-lg font-medium text-gray-900">Test Not Found</h3>
          <p className="mt-2 text-gray-500">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{test?.title}</h1>
          {test?.description && (
            <p className="mt-2 text-gray-600">{test.description}</p>
          )}
          <div className="mt-4 flex justify-center gap-4 text-sm text-gray-500">
            {test?.questionCount > 0 && (
              <span>{test.questionCount} questions</span>
            )}
            {test?.durationMinutes && (
              <span>{test.durationMinutes} minutes</span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              label="Email Address"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              required
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter your email to begin the assessment
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            loading={submitting}
            disabled={!email.trim()}
            className="w-full"
          >
            Start Assessment
          </Button>
        </form>
      </Card>
    </div>
  );
}
