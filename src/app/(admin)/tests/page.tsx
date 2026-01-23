'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [durationFilter, setDurationFilter] = useState('all');

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

  // Extract unique categories from tests
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(tests.map(t => t.category).filter(Boolean))];
    return uniqueCategories.sort();
  }, [tests]);

  // Filter tests based on search and filters
  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          test.title.toLowerCase().includes(query) ||
          test.description?.toLowerCase().includes(query) ||
          test.category?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && test.category !== categoryFilter) {
        return false;
      }

      // Duration filter
      if (durationFilter !== 'all') {
        const duration = test.durationMinutes || 0;
        switch (durationFilter) {
          case 'short':
            if (duration > 15) return false;
            break;
          case 'medium':
            if (duration <= 15 || duration > 45) return false;
            break;
          case 'long':
            if (duration <= 45) return false;
            break;
        }
      }

      return true;
    });
  }, [tests, searchQuery, categoryFilter, durationFilter]);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonInput(content);
      setImportError(null);
    };
    reader.onerror = () => {
      setImportError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      setImportError('Please paste JSON or upload a file');
      return;
    }

    setImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const parsed = JSON.parse(jsonInput);

      const res = await fetch('/api/tests/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();

      if (res.ok) {
        setImportSuccess(data.message);
        setJsonInput('');
        fetchTests();
        setTimeout(() => {
          setShowImportModal(false);
          setImportSuccess(null);
        }, 2000);
      } else {
        setImportError(data.error || 'Failed to import test');
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        setImportError('Invalid JSON format. Please check your syntax.');
      } else {
        setImportError('An error occurred during import');
      }
    } finally {
      setImporting(false);
    }
  };

  const loadSample = async () => {
    try {
      const res = await fetch('/sample-test.json');
      const text = await res.text();
      setJsonInput(text);
      setImportError(null);
    } catch {
      setImportError('Failed to load sample');
    }
  };

  const openImportModal = () => {
    setShowImportModal(true);
    setJsonInput('');
    setImportError(null);
    setImportSuccess(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setDurationFilter('all');
  };

  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || durationFilter !== 'all';

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
          <h1 className="text-2xl font-bold text-gray-900">Test Library</h1>
          <p className="text-gray-500 mt-1">Manage your cognitive tests and assessments</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button variant="secondary" onClick={openImportModal} className="w-full sm:w-auto">
            Import JSON
          </Button>
          <Link href="/tests/new" className="w-full sm:w-auto">
            <Button className="w-full">Create Test</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      {tests.length > 0 && (
        <Card className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Search tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
            <Select
              options={[
                { value: 'all', label: 'All Categories' },
                ...categories.map(cat => ({ value: cat as string, label: cat as string }))
              ]}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full"
            />
            <Select
              options={[
                { value: 'all', label: 'All Durations' },
                { value: 'short', label: 'Short (≤15 min)' },
                { value: 'medium', label: 'Medium (15-45 min)' },
                { value: 'long', label: 'Long (>45 min)' },
              ]}
              value={durationFilter}
              onChange={(e) => setDurationFilter(e.target.value)}
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
          {hasActiveFilters && (
            <div className="mt-3 text-sm text-gray-600">
              Showing {filteredTests.length} of {tests.length} tests
            </div>
          )}
        </Card>
      )}

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
          <p className="mt-2 text-gray-500">Get started by creating your first test or importing from JSON.</p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Button variant="secondary" onClick={openImportModal}>
              Import JSON
            </Button>
            <Link href="/tests/new">
              <Button>Create Test</Button>
            </Link>
          </div>
        </Card>
      ) : filteredTests.length === 0 ? (
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
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No tests found</h3>
          <p className="mt-2 text-gray-500">Try adjusting your search or filters.</p>
          <div className="mt-6">
            <Button variant="secondary" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Title</TableHead>
                  <TableHead className="min-w-[120px]">Category</TableHead>
                  <TableHead className="min-w-[100px]">Questions</TableHead>
                  <TableHead className="min-w-[120px]">Assignments</TableHead>
                  <TableHead className="min-w-[100px]">Duration</TableHead>
                  <TableHead className="min-w-[120px]">Created</TableHead>
                  <TableHead className="min-w-[200px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="min-w-[200px]">
                      <Link href={`/tests/${test.id}`} className="text-blue-600 hover:underline font-medium block">
                        {test.title}
                      </Link>
                      {test.description && (
                        <p className="text-sm text-gray-500 truncate max-w-xs mt-1">{test.description}</p>
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
                    <TableCell className="whitespace-nowrap">{formatDate(test.createdAt)}</TableCell>
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
          </div>
        </Card>
      )}

      {/* Import JSON Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Test from JSON"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">JSON Format</h4>
            <p className="text-sm text-blue-700 mb-3">
              Upload a JSON file or paste JSON content below. The format supports multiple choice,
              free text, and timed questions.
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <a
                href="/sample-test.json"
                download
                className="text-blue-600 hover:underline font-medium"
              >
                Download Sample JSON
              </a>
              <span className="text-blue-400">|</span>
              <a
                href="/test-format.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                View Format Specification
              </a>
            </div>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto"
              >
                Upload JSON File
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadSample}
                className="w-full sm:w-auto"
              >
                Load Sample
              </Button>
            </div>

            <Textarea
              id="json-input"
              rows={12}
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setImportError(null);
              }}
              placeholder='Paste your JSON here or upload a file...

{
  "title": "My Test",
  "description": "Test description",
  "category": "Cognitive",
  "questions": [
    {
      "type": "mcq",
      "content": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "points": 1
    }
  ]
}'
              className="font-mono text-sm"
            />
          </div>

          {importError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {importError}
            </div>
          )}

          {importSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {importSuccess}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowImportModal(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleImport} loading={importing} disabled={!jsonInput.trim()} className="w-full sm:w-auto">
              Import Test
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
