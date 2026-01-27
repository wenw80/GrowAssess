'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { formatDateTime } from '@/lib/utils';

interface Candidate {
  id: string;
  name: string;
  email: string;
}

interface TestInstance {
  id: string;
  status: string;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  uniqueLink: string;
  candidate: Candidate;
  progress: {
    answeredQuestions: number;
    totalQuestions: number;
  };
}

export default function TestInstancesPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.id as string;

  const [instances, setInstances] = useState<TestInstance[]>([]);
  const [testTitle, setTestTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchTestInfo();
    fetchInstances();
  }, [testId]);

  const fetchTestInfo = async () => {
    try {
      const res = await fetch(`/api/tests/${testId}`);
      if (res.ok) {
        const data = await res.json();
        setTestTitle(data.title);
      }
    } catch (error) {
      console.error('Error fetching test info:', error);
    }
  };

  const fetchInstances = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tests/${testId}/instances`);
      if (res.ok) {
        const data = await res.json();
        setInstances(data);
      } else {
        console.error('Failed to fetch instances');
      }
    } catch (error) {
      console.error('Error fetching instances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (instanceId: string, candidateName: string) => {
    if (!confirm(`Are you sure you want to delete the test instance for ${candidateName}? This will delete all their responses for this test.`)) {
      return;
    }

    setDeleting(instanceId);
    try {
      const res = await fetch(`/api/assignments/${instanceId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setInstances(instances.filter((i) => i.id !== instanceId));
      } else {
        alert('Failed to delete instance');
      }
    } catch (error) {
      console.error('Error deleting instance:', error);
      alert('Failed to delete instance');
    } finally {
      setDeleting(null);
    }
  };

  const copyLink = (uniqueLink: string) => {
    const fullUrl = `${window.location.origin}/test/${uniqueLink}`;
    navigator.clipboard.writeText(fullUrl);
    alert('Test link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <Link href={`/tests/${testId}`} className="text-blue-600 hover:underline text-sm">
          ← Back to Test
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Test Instances</h1>
            <p className="text-gray-500 mt-1">{testTitle}</p>
          </div>
        </div>
      </div>

      {instances.length === 0 ? (
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No instances found</h3>
          <p className="mt-2 text-gray-500">No one has been assigned this test yet.</p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              Total instances: <span className="font-semibold">{instances.length}</span>
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instances.map((instance) => (
                <TableRow key={instance.id}>
                  <TableCell>
                    <Link
                      href={`/candidates/${instance.candidate.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {instance.candidate.name}
                    </Link>
                    <p className="text-sm text-gray-500">{instance.candidate.email}</p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        instance.status === 'completed'
                          ? 'success'
                          : instance.status === 'in_progress'
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {instance.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{
                              width: `${
                                instance.progress.totalQuestions > 0
                                  ? (instance.progress.answeredQuestions /
                                      instance.progress.totalQuestions) *
                                    100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-sm text-gray-600 whitespace-nowrap">
                        {instance.progress.answeredQuestions}/{instance.progress.totalQuestions}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDateTime(instance.assignedAt)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {instance.startedAt ? formatDateTime(instance.startedAt) : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {instance.completedAt ? formatDateTime(instance.completedAt) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyLink(instance.uniqueLink)}
                        title="Copy test link"
                      >
                        Copy Link
                      </Button>
                      <Link href={`/reports?assignment=${instance.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(instance.id, instance.candidate.name)}
                        loading={deleting === instance.id}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
