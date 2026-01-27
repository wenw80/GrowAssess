'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';

interface TestHeaderProps {
  testId: string;
  testTitle: string;
}

export default function TestHeader({ testId, testTitle }: TestHeaderProps) {
  const [exporting, setExporting] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (showLinkModal) {
      fetchPublicLink();
    }
  }, [showLinkModal]);

  const fetchPublicLink = async () => {
    setLoadingLink(true);
    try {
      const res = await fetch(`/api/tests/${testId}/public-link`);
      if (res.ok) {
        const data = await res.json();
        setPublicLink(data.publicLink);
      }
    } catch (error) {
      console.error('Error fetching public link:', error);
    } finally {
      setLoadingLink(false);
    }
  };

  const generatePublicLink = async () => {
    setLoadingLink(true);
    try {
      const res = await fetch(`/api/tests/${testId}/public-link`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setPublicLink(data.publicLink);
      } else {
        alert('Failed to generate public link');
      }
    } catch (error) {
      console.error('Error generating public link:', error);
      alert('Failed to generate public link');
    } finally {
      setLoadingLink(false);
    }
  };

  const deletePublicLink = async () => {
    if (!confirm('Are you sure you want to disable the public link? This will prevent new candidates from accessing the test via this link.')) {
      return;
    }

    setLoadingLink(true);
    try {
      const res = await fetch(`/api/tests/${testId}/public-link`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPublicLink(null);
      } else {
        alert('Failed to delete public link');
      }
    } catch (error) {
      console.error('Error deleting public link:', error);
      alert('Failed to delete public link');
    } finally {
      setLoadingLink(false);
    }
  };

  const copyToClipboard = () => {
    if (!publicLink) return;
    const fullUrl = `${window.location.origin}/public-test/${publicLink}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch(`/api/tests/${testId}/export`);
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${testTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting test:', error);
      alert('Failed to export test');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <Link href="/tests" className="text-blue-600 hover:underline text-sm">
          ← Back to Tests
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Test</h1>
            <p className="text-gray-500 mt-1">Update test details and questions</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowLinkModal(true)}
            >
              Public Link
            </Button>
            <Button
              variant="secondary"
              onClick={handleExport}
              loading={exporting}
            >
              Export JSON
            </Button>
          </div>
        </div>
      </div>

      {/* Public Link Modal */}
      <Modal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        title="Public Test Link"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">How Public Links Work</h4>
            <p className="text-sm text-blue-700">
              Share this link with candidates to allow them to take the test. When they access the link:
            </p>
            <ul className="text-sm text-blue-700 list-disc list-inside mt-2 space-y-1">
              <li>They'll be prompted to enter their email address</li>
              <li>If they're a new candidate, they'll be created automatically</li>
              <li>If they've already started the test, they can resume where they left off</li>
              <li>Completed tests cannot be retaken</li>
            </ul>
          </div>

          {loadingLink ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : publicLink ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Public Link
                </label>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}/public-test/${publicLink}`}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="secondary"
                    onClick={copyToClipboard}
                  >
                    {copiedLink ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button
                  variant="danger"
                  onClick={deletePublicLink}
                >
                  Disable Public Link
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowLinkModal(false)}
                >
                  Close
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-600">
                This test doesn't have a public link yet. Generate one to allow candidates to self-register and take the test.
              </p>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="secondary"
                  onClick={() => setShowLinkModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={generatePublicLink}
                >
                  Generate Public Link
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
