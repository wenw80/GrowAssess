'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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

  // Pagination calculations
  const totalPages = Math.ceil(instances.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedInstances = instances.slice(startIndex, endIndex);

  // Reset to page 1 when page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-6">
        <Link href={`/tests/${testId}`} className="text-primary hover:underline text-sm">
          ← Back to Test
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Test Instances</h1>
            <p className="text-muted-foreground mt-1">{testTitle}</p>
          </div>
        </div>
      </div>

      {instances.length === 0 ? (
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-foreground">No instances found</h3>
          <p className="mt-2 text-muted-foreground">No one has been assigned this test yet.</p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <p className="text-sm text-muted-foreground">
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
              {paginatedInstances.map((instance) => (
                <TableRow key={instance.id}>
                  <TableCell>
                    <Link
                      href={`/candidates/${instance.candidate.id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {instance.candidate.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{instance.candidate.email}</p>
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
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
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
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {instance.progress.answeredQuestions}/{instance.progress.totalQuestions}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(instance.assignedAt)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {instance.startedAt ? formatDateTime(instance.startedAt) : '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {instance.completedAt ? formatDateTime(instance.completedAt) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => copyLink(instance.uniqueLink)}
                        title="Copy test link"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </Button>
                      <Link href={`/reports?assignment=${instance.id}`} title="View Results">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(instance.id, instance.candidate.name)}
                        disabled={deleting === instance.id}
                        title="Delete"
                      >
                        {deleting === instance.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {instances.length > 0 && (
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
                  {startIndex + 1}-{Math.min(endIndex, instances.length)} of {instances.length}
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
    </div>
  );
}
