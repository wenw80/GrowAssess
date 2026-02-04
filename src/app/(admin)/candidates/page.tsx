'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Select from '@/components/ui/SelectSimple';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { formatDate } from '@/lib/utils';

interface TestAssignment {
  id: string;
  status: string;
  test: { title: string };
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
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  assignments: TestAssignment[];
}

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
];

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  active: 'info',
  pending: 'warning',
  hired: 'success',
  rejected: 'danger',
};

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewFilter, setViewFilter] = useState<'all' | 'my'>('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    status: 'active',
    notes: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    fetchCandidates();
  }, [search, statusFilter, viewFilter]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('filter', viewFilter);

      const res = await fetch(`/api/candidates?${params}`);
      const data = await res.json();
      setCandidates(data);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCandidate(null);
    setForm({ name: '', email: '', phone: '', position: '', status: 'active', notes: '' });
    setShowModal(true);
  };

  const openEditModal = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setForm({
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone || '',
      position: candidate.position || '',
      status: candidate.status,
      notes: candidate.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingCandidate
        ? `/api/candidates/${editingCandidate.id}`
        : '/api/candidates';
      const method = editingCandidate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setShowModal(false);
        fetchCandidates();
      }
    } catch (error) {
      console.error('Error saving candidate:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return;

    try {
      await fetch(`/api/candidates/${id}`, { method: 'DELETE' });
      setCandidates(candidates.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Error deleting candidate:', error);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(candidates.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCandidates = candidates.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, viewFilter, pageSize]);

  if (loading) {
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
          <h1 className="text-2xl font-bold text-foreground">Candidates</h1>
          <p className="text-muted-foreground mt-1">Manage applicants and track their assessments</p>
        </div>
        <Button onClick={openCreateModal}>Add Candidate</Button>
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
              All Candidates
            </button>
            <button
              onClick={() => setViewFilter('my')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                viewFilter === 'my'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              My Candidates
            </button>
          </nav>
        </div>
      </div>

      <Card className="mb-6 flex flex-col gap-4 overflow-hidden rounded-xl py-4">
        <div className="px-4">
          <h2 className="text-base font-medium leading-snug">Search & Filter</h2>
          <p className="text-sm text-muted-foreground mt-1">Find candidates by name, email, or status</p>
        </div>
        <div className="px-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search by name, email, or position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-48"
            />
          </div>
        </div>
      </Card>

      {candidates.length === 0 ? (
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-foreground">No candidates found</h3>
          <p className="mt-2 text-muted-foreground">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'Get started by adding your first candidate.'}
          </p>
          {!search && statusFilter === 'all' && (
            <div className="mt-6">
              <Button onClick={openCreateModal}>Add Candidate</Button>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tests Assigned</TableHead>
                {viewFilter === 'all' && (
                  <TableHead>Created By</TableHead>
                )}
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCandidates.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell>
                    <Link
                      href={`/candidates/${candidate.id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {candidate.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{candidate.email}</p>
                  </TableCell>
                  <TableCell>{candidate.position || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[candidate.status] || 'default'}>
                      {candidate.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {candidate.assignments.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const completed = candidate.assignments.filter(a => a.status === 'completed').length;
                          const inProgress = candidate.assignments.filter(a => a.status === 'in_progress').length;
                          const notStarted = candidate.assignments.filter(a => a.status === 'not_started').length;
                          return (
                            <>
                              {completed > 0 && (
                                <Badge variant="success" className="text-xs">
                                  {completed} done
                                </Badge>
                              )}
                              {inProgress > 0 && (
                                <Badge variant="warning" className="text-xs">
                                  {inProgress} active
                                </Badge>
                              )}
                              {notStarted > 0 && (
                                <Badge variant="default" className="text-xs">
                                  {notStarted} pending
                                </Badge>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  {viewFilter === 'all' && (
                    <TableCell>
                      {candidate.user ? candidate.user.name : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                  )}
                  <TableCell className="text-xs text-muted-foreground">{formatDate(candidate.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/candidates/${candidate.id}`} title="View">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditModal(candidate)} title="Edit">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(candidate.id)}
                        title="Delete"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {candidates.length > 0 && (
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
                  {startIndex + 1}-{Math.min(endIndex, candidates.length)} of {candidates.length}
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

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCandidate ? 'Edit Candidate' : 'Add Candidate'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label="Phone"
            id="phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="Position Applied"
            id="position"
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
          />
          <Select
            label="Status"
            id="status"
            options={statusOptions.slice(1)}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          />
          <Textarea
            label="Notes"
            id="notes"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingCandidate ? 'Save Changes' : 'Add Candidate'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
