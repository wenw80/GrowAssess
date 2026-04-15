'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/SelectSimple';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import TagFilter from '@/components/ui/TagFilter';
import { formatDate } from '@/lib/utils';
import { AssessmentSectionCards } from '@/components/dashboard/assessment-section-cards';

interface Test {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  durationMinutes: number | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
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

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedTest, setGeneratedTest] = useState<any>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [reassigningTest, setReassigningTest] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [durationFilter, setDurationFilter] = useState('all');
  const [viewFilter, setViewFilter] = useState<'all' | 'my'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    fetchTests();
    fetchCurrentUser();
  }, [viewFilter]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);

        if (data.user.role === 'admin') {
          const usersRes = await fetch('/api/users');
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            setAllUsers(usersData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchTests();
      }
    };

    const handleFocus = () => {
      fetchTests();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [viewFilter]);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tests?filter=${viewFilter}`);
      const data = await res.json();
      setTests(data);
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    tests.forEach(test => {
      test.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [tests]);

  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          test.title.toLowerCase().includes(query) ||
          test.description?.toLowerCase().includes(query) ||
          test.tags.some(tag => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      if (selectedTags.length > 0) {
        const hasMatchingTag = test.tags.some(tag => selectedTags.includes(tag));
        if (!hasMatchingTag) return false;
      }

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
  }, [tests, searchQuery, selectedTags, durationFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTests.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTests = filteredTests.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTags, durationFilter, viewFilter, pageSize]);

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

  const openGenerateModal = () => {
    setShowGenerateModal(true);
    setGeneratePrompt('');
    setGenerateError(null);
    setGeneratedTest(null);
  };

  const handleGenerate = async () => {
    if (!generatePrompt.trim()) {
      setGenerateError('Please enter a prompt describing the test you want to create');
      return;
    }

    setGenerating(true);
    setGenerateError(null);
    setGeneratedTest(null);

    try {
      const res = await fetch('/api/tests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: generatePrompt }),
      });

      const data = await res.json();

      if (res.ok && data.test) {
        setGeneratedTest(data.test);
        setGenerateError(null);
      } else {
        setGenerateError(data.error || 'Failed to generate test');
      }
    } catch (error) {
      setGenerateError('An error occurred while generating the test');
      console.error('Error generating test:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleImportGenerated = async () => {
    if (!generatedTest) return;

    setImporting(true);
    setGenerateError(null);

    try {
      const res = await fetch('/api/tests/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generatedTest),
      });

      const data = await res.json();

      if (res.ok) {
        setImportSuccess(data.message);
        fetchTests();
        setTimeout(() => {
          setShowGenerateModal(false);
          setGeneratedTest(null);
          setGeneratePrompt('');
          setImportSuccess(null);
        }, 2000);
      } else {
        setGenerateError(data.error || 'Failed to import generated test');
      }
    } catch (error) {
      setGenerateError('An error occurred during import');
      console.error('Error importing generated test:', error);
    } finally {
      setImporting(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setDurationFilter('all');
  };

  const handleReassignTest = async (testId: string, newUserId: string) => {
    setReassigningTest(testId);
    try {
      const res = await fetch(`/api/tests/${testId}/reassign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: newUserId || null }),
      });

      if (res.ok) {
        fetchTests();
      } else {
        const data = await res.json();
        alert(`Failed to reassign test: ${data.error}`);
      }
    } catch (error) {
      console.error('Error reassigning test:', error);
      alert('Failed to reassign test');
    } finally {
      setReassigningTest(null);
    }
  };

  const hasActiveFilters = searchQuery || selectedTags.length > 0 || durationFilter !== 'all';
  const isAdmin = currentUser?.role === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Dashboard Stats */}
      <AssessmentSectionCards />

      <div className="mx-auto max-w-[1400px] px-6 py-6">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl font-bold text-foreground">Test Library</h1>
          <p className="text-muted-foreground mt-1">Manage your cognitive tests and assessments</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button variant="secondary" onClick={openGenerateModal} className="w-full sm:w-auto">
            Generate from Prompt
          </Button>
          <Button variant="secondary" onClick={openImportModal} className="w-full sm:w-auto">
            Import JSON
          </Button>
          <Link href="/tests/new" className="w-full sm:w-auto">
            <Button className="w-full">Create Test</Button>
          </Link>
        </div>
      </div>

      {/* View Tabs */}
      <div className="mb-6">
        <div className="border-b border-border">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setViewFilter('all')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                viewFilter === 'all'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              All Tests
            </button>
            <button
              onClick={() => setViewFilter('my')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                viewFilter === 'my'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              My Tests
            </button>
          </nav>
        </div>
      </div>

      {/* Filters */}
      {tests.length > 0 && (
        <Card className="mb-6 flex flex-col gap-4 overflow-hidden rounded-xl py-4">
          <div className="px-4">
            <h2 className="text-base font-medium leading-snug">Search & Filter</h2>
            <p className="text-sm text-muted-foreground mt-1">Find tests by name, tags, or duration</p>
          </div>
          <div className="px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
              <TagFilter
                tags={allTags}
                selectedTags={selectedTags}
                onChange={setSelectedTags}
                placeholder="Filter by tags..."
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
              <div className="mt-3 text-sm text-muted-foreground">
                Showing {filteredTests.length} of {tests.length} tests
              </div>
            )}
          </div>
        </Card>
      )}

      {tests.length === 0 ? (
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
          <h3 className="mt-4 text-lg font-medium text-foreground">No tests yet</h3>
          <p className="mt-2 text-muted-foreground">Get started by creating a test manually, generating one with AI, or importing from JSON.</p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Button variant="secondary" onClick={openGenerateModal}>
              Generate from Prompt
            </Button>
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
            className="mx-auto h-12 w-12 text-muted-foreground"
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
          <h3 className="mt-4 text-lg font-medium text-foreground">No tests found</h3>
          <p className="mt-2 text-muted-foreground">Try adjusting your search or filters.</p>
          <div className="mt-6">
            <Button variant="secondary" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Assignments</TableHead>
                <TableHead>Duration</TableHead>
                {viewFilter === 'all' && (
                  <TableHead>Created By</TableHead>
                )}
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell>
                    <Link href={`/tests/${test.id}`} className="text-primary hover:underline font-medium block">
                      {test.title}
                    </Link>
                    {test.description && (
                      <p className="text-sm text-muted-foreground truncate max-w-xs mt-1">{test.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {test.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {test.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{test._count.questions}</TableCell>
                  <TableCell>
                    {test._count.assignments > 0 ? (
                      <Link
                        href={`/tests/${test.id}/instances`}
                        className="text-primary hover:underline font-medium"
                      >
                        {test._count.assignments}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {test.durationMinutes ? `${test.durationMinutes} min` : '-'}
                  </TableCell>
                  {viewFilter === 'all' && (
                    <TableCell className="whitespace-nowrap">
                      {test.user ? test.user.name : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                  )}
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(test.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 items-center">
                      {isAdmin && viewFilter === 'all' && (
                        <div className="relative" title="Reassign owner">
                          <select
                            value={test.user?.id || ''}
                            onChange={(e) => handleReassignTest(test.id, e.target.value)}
                            disabled={reassigningTest === test.id}
                            className="h-8 w-8 opacity-0 absolute inset-0 cursor-pointer z-10"
                          >
                            <option value="">(No Owner)</option>
                            {allUsers.map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 pointer-events-none">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </Button>
                        </div>
                      )}
                      <a href={`/api/tests/${test.id}/export`} download title="Export">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </Button>
                      </a>
                      <Link href={`/tests/${test.id}`} title="Edit">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(test.id)}
                        disabled={deleting === test.id}
                        title="Delete"
                      >
                        {deleting === test.id ? (
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
          {filteredTests.length > 0 && (
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
                  {startIndex + 1}-{Math.min(endIndex, filteredTests.length)} of {filteredTests.length}
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

      {/* Import JSON Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Test from JSON"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">JSON Format</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Upload a JSON file or paste JSON content below. The format supports multiple choice,
              free text, and timed questions. Multiple choice questions can assign different point values
              to each answer option for partial credit and nuanced scoring.
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <a
                href="/sample-test.json"
                download
                className="text-primary hover:underline font-medium"
              >
                Download Sample JSON
              </a>
              <span className="text-muted-foreground">|</span>
              <a
                href="/test-format.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
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
  "tags": ["Cognitive", "Analytical"],
  "questions": [
    {
      "type": "mcq",
      "content": "Question text",
      "options": [
        {"text": "Excellent answer", "points": 10},
        {"text": "Good answer", "points": 7},
        {"text": "Partial answer", "points": 3},
        {"text": "Wrong answer", "points": 0}
      ],
      "correctAnswer": 0,
      "points": 10
    }
  ]
}'
              className="font-mono text-sm [field-sizing:fixed] max-h-80 resize-y"
            />
          </div>

          {importError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {importError}
            </div>
          )}

          {importSuccess && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-700 dark:text-green-400 text-sm">
              {importSuccess}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border sticky bottom-0 bg-background">
            <Button variant="secondary" onClick={() => setShowImportModal(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={importing || !jsonInput.trim()} className="w-full sm:w-auto">
              {importing ? 'Importing...' : 'Import Test'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Generate from Prompt Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate Test from Prompt"
        className="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">AI Test Generation</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Describe the test you want to create and our AI will generate it for you. Be specific about:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>The topic or skills to assess</li>
              <li>Target role or candidate level</li>
              <li>Number and types of questions desired</li>
              <li>Difficulty level</li>
            </ul>
          </div>

          {!generatedTest ? (
            <>
              <div>
                <label htmlFor="generate-prompt" className="block text-sm font-medium text-foreground mb-2">
                  Describe your test
                </label>
                <Textarea
                  id="generate-prompt"
                  rows={6}
                  value={generatePrompt}
                  onChange={(e) => {
                    setGeneratePrompt(e.target.value);
                    setGenerateError(null);
                  }}
                  placeholder="Example: Create a test for junior software developers with 10 questions about JavaScript fundamentals, including arrays, functions, and async programming. Mix multiple choice and short answer questions."
                  className="w-full"
                />
              </div>

              {generateError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {generateError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border">
                <Button
                  variant="secondary"
                  onClick={() => setShowGenerateModal(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !generatePrompt.trim()}
                  className="w-full sm:w-auto"
                >
                  {generating ? 'Generating...' : 'Generate Test'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">Test Generated Successfully!</h4>
                <p className="text-sm text-green-600 dark:text-green-500">
                  Review the generated test below. You can import it directly or close this dialog and try again.
                </p>
              </div>

              <div className="bg-muted border border-border rounded-lg p-4 max-h-96 overflow-y-auto">
                <h5 className="font-semibold text-foreground mb-2">{generatedTest.title}</h5>
                {generatedTest.description && (
                  <p className="text-sm text-muted-foreground mb-3">{generatedTest.description}</p>
                )}
                <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                  {generatedTest.category && (
                    <span><strong>Category:</strong> {generatedTest.category}</span>
                  )}
                  {generatedTest.durationMinutes && (
                    <span><strong>Duration:</strong> {generatedTest.durationMinutes} min</span>
                  )}
                  <span><strong>Questions:</strong> {generatedTest.questions.length}</span>
                </div>
                <div className="space-y-3">
                  {generatedTest.questions.map((q: any, idx: number) => (
                    <div key={idx} className="bg-card p-3 rounded border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-foreground">Q{idx + 1}. {q.content}</span>
                        <Badge variant={q.type === 'mcq' ? 'secondary' : q.type === 'timed' ? 'outline' : 'default'}>
                          {q.type}
                        </Badge>
                      </div>
                      {q.type === 'mcq' && q.options && (
                        <ul className="text-sm text-muted-foreground list-disc list-inside ml-2">
                          {q.options.map((opt: string, i: number) => (
                            <li key={i} className={i === q.correctAnswer ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
                              {opt} {i === q.correctAnswer && '✓'}
                            </li>
                          ))}
                        </ul>
                      )}
                      {q.type === 'timed' && q.timeLimitSeconds && (
                        <p className="text-sm text-muted-foreground">Time limit: {q.timeLimitSeconds}s</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Points: {q.points || 1}</p>
                    </div>
                  ))}
                </div>
              </div>

              {generateError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {generateError}
                </div>
              )}

              {importSuccess && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-700 dark:text-green-400 text-sm">
                  {importSuccess}
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setGeneratedTest(null);
                    setGeneratePrompt('');
                  }}
                  disabled={importing}
                  className="w-full sm:w-auto"
                >
                  Generate Another
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowGenerateModal(false)}
                  disabled={importing}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
                <Button
                  onClick={handleImportGenerated}
                  disabled={importing}
                  className="w-full sm:w-auto"
                >
                  {importing ? 'Importing...' : 'Import This Test'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
      </div>
    </>
  );
}
