'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
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

  useEffect(() => {
    fetchCandidates();
  }, [search, statusFilter]);

  const fetchCandidates = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);

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
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-500 mt-1">Manage applicants and track their assessments</p>
        </div>
        <Button onClick={openCreateModal}>Add Candidate</Button>
      </div>

      <Card className="mb-6">
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
      </Card>

      {candidates.length === 0 ? (
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No candidates found</h3>
          <p className="mt-2 text-gray-500">
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
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell>
                    <Link
                      href={`/candidates/${candidate.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {candidate.name}
                    </Link>
                    <p className="text-sm text-gray-500">{candidate.email}</p>
                  </TableCell>
                  <TableCell>{candidate.position || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[candidate.status] || 'default'}>
                      {candidate.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {candidate.assignments.length > 0 ? (
                      <div className="space-y-1">
                        {candidate.assignments.slice(0, 2).map((a) => (
                          <div key={a.id} className="text-sm">
                            <span>{a.test.title}</span>
                            <Badge
                              variant={
                                a.status === 'completed'
                                  ? 'success'
                                  : a.status === 'in_progress'
                                  ? 'warning'
                                  : 'default'
                              }
                              className="ml-2"
                            >
                              {a.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        ))}
                        {candidate.assignments.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{candidate.assignments.length - 2} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(candidate.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/candidates/${candidate.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(candidate)}>
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(candidate.id)}
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
            <Button type="submit" loading={saving}>
              {editingCandidate ? 'Save Changes' : 'Add Candidate'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
