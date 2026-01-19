'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { formatDate } from '@/lib/utils';

interface Test {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  durationMinutes: number | null;
  createdAt: string;
  _count: {
    questions: number;
    assignments: number;
  };
}

export default function TestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const res = await fetch('/api/tests');
      const data = await res.json();
      setTests(data);
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this test?')) return;

    setDeleting(id);
    try {
      await fetch(`/api/tests/${id}`, { method: 'DELETE' });
      setTests(tests.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Error deleting test:', error);
    } finally {
      setDeleting(null);
    }
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Library</h1>
          <p className="text-gray-500 mt-1">Manage your cognitive tests and assessments</p>
        </div>
        <Link href="/tests/new">
          <Button>Create Test</Button>
        </Link>
      </div>

      {tests.length === 0 ? (
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
          <h3 className="mt-4 text-lg font-medium text-gray-900">No tests yet</h3>
          <p className="mt-2 text-gray-500">Get started by creating your first test.</p>
          <div className="mt-6">
            <Link href="/tests/new">
              <Button>Create Test</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Assignments</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell>
                    <Link href={`/tests/${test.id}`} className="text-blue-600 hover:underline font-medium">
                      {test.title}
                    </Link>
                    {test.description && (
                      <p className="text-sm text-gray-500 truncate max-w-xs">{test.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {test.category ? (
                      <Badge variant="info">{test.category}</Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>{test._count.questions}</TableCell>
                  <TableCell>{test._count.assignments}</TableCell>
                  <TableCell>
                    {test.durationMinutes ? `${test.durationMinutes} min` : '-'}
                  </TableCell>
                  <TableCell>{formatDate(test.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/tests/${test.id}`}>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </Link>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(test.id)}
                        loading={deleting === test.id}
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
