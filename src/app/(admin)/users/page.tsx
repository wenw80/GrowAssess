'use client';

import { useEffect, useState, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
  _count?: {
    tests: number;
    candidates: number;
  };
}

interface Test {
  id: string;
  title: string;
  tags: string[];
  createdAt: string;
  _count: {
    questions: number;
    assignments: number;
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'user', password: '' });
  const [saving, setSaving] = useState(false);
  const [viewingTestsUser, setViewingTestsUser] = useState<User | null>(null);
  const [userTests, setUserTests] = useState<Test[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [reassignTestId, setReassignTestId] = useState<string | null>(null);
  const [reassignUserId, setReassignUserId] = useState<string>('');

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        if (response.status === 403) {
          setError('Admin access required');
          return;
        }
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openEditModal = async (user: User) => {
    // Fetch detailed user info
    try {
      const response = await fetch(`/api/users/${user.id}`);
      if (response.ok) {
        const detailedUser = await response.json();
        setEditingUser(detailedUser);
        setEditForm({
          name: detailedUser.name || '',
          email: detailedUser.email,
          role: detailedUser.role,
          password: '',
        });
      } else {
        setEditingUser(user);
        setEditForm({
          name: user.name || '',
          email: user.email,
          role: user.role,
          password: '',
        });
      }
    } catch {
      setEditingUser(user);
      setEditForm({
        name: user.name || '',
        email: user.email,
        role: user.role,
        password: '',
      });
    }
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setEditForm({ name: '', email: '', role: 'user', password: '' });
  };

  const handleSave = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      const updateData: Record<string, string> = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
      };
      if (editForm.password) {
        updateData.password = editForm.password;
      }

      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update user');
      }

      await fetchUsers();
      closeEditModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to delete user "${user.name || user.email}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      await fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const openTestsModal = async (user: User) => {
    setViewingTestsUser(user);
    setLoadingTests(true);
    try {
      const response = await fetch(`/api/users/${user.id}/tests`);
      if (response.ok) {
        const tests = await response.json();
        setUserTests(tests);
      }
    } catch {
      setUserTests([]);
    } finally {
      setLoadingTests(false);
    }
  };

  const closeTestsModal = () => {
    setViewingTestsUser(null);
    setUserTests([]);
    setReassignTestId(null);
    setReassignUserId('');
  };

  const handleReassignTest = async (testId: string) => {
    if (!reassignUserId) return;

    try {
      const response = await fetch(`/api/tests/${testId}/reassign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: reassignUserId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reassign test');
      }

      // Refresh the tests list
      if (viewingTestsUser) {
        openTestsModal(viewingTestsUser);
      }
      await fetchUsers();
      setReassignTestId(null);
      setReassignUserId('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reassign test');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">
            Manage user accounts and roles ({users.length} users)
          </p>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stats
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.name || 'No name'}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={user.role === 'admin' ? 'success' : 'default'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user._count ? (
                      <>
                        {user._count.tests} tests, {user._count.candidates} candidates
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    {user._count && user._count.tests > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openTestsModal(user)}
                      >
                        Tests ({user._count.tests})
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEditModal(user)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(user)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new password..."
                />
              </div>
              {editingUser._count && (
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                  <p>Tests created: {editingUser._count.tests}</p>
                  <p>Candidates created: {editingUser._count.candidates}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={closeEditModal} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Tests Modal */}
      {viewingTestsUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Tests by {viewingTestsUser.name || viewingTestsUser.email}
              </h3>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              {loadingTests ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : userTests.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No tests found</p>
              ) : (
                <div className="space-y-3">
                  {userTests.map((test) => (
                    <div
                      key={test.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{test.title}</h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {test.tags.map((tag) => (
                              <Badge key={tag} variant="default" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {test._count.questions} questions, {test._count.assignments} assignments
                          </p>
                        </div>
                        <div className="ml-4">
                          {reassignTestId === test.id ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={reassignUserId}
                                onChange={(e) => setReassignUserId(e.target.value)}
                                className="text-sm border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="">Select user...</option>
                                {users
                                  .filter((u) => u.id !== viewingTestsUser.id)
                                  .map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.name || u.email}
                                    </option>
                                  ))}
                              </select>
                              <Button
                                size="sm"
                                onClick={() => handleReassignTest(test.id)}
                                disabled={!reassignUserId}
                              >
                                Assign
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setReassignTestId(null);
                                  setReassignUserId('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setReassignTestId(test.id)}
                            >
                              Reassign
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <Button variant="secondary" onClick={closeTestsModal}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
