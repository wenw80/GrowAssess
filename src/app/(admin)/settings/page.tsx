'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface GeminiModel {
  value: string;
  label: string;
  description: string;
  category: string;
}

export default function SettingsPage() {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-1.5-flash-latest');
  const [availableModels, setAvailableModels] = useState<GeminiModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    // Fetch models list (static list from API)
    fetchAvailableModels();
  }, []);

  const fetchSettings = async () => {
    try {
      const [apiKeyRes, modelRes] = await Promise.all([
        fetch('/api/settings?key=gemini_api_key'),
        fetch('/api/settings?key=gemini_model'),
      ]);

      if (apiKeyRes.ok) {
        const data = await apiKeyRes.json();
        setGeminiApiKey(data.value || '');
      }

      if (modelRes.ok) {
        const data = await modelRes.json();
        setGeminiModel(data.value || 'gemini-1.5-flash-latest');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchAvailableModels = async () => {
    setLoadingModels(true);
    try {
      const res = await fetch('/api/gemini/models');
      if (res.ok) {
        const data = await res.json();
        setAvailableModels(data.models || []);
      } else {
        // Use fallback models if API fails
        setAvailableModels([
          {
            value: 'gemini-1.5-flash-latest',
            label: 'Gemini 1.5 Flash',
            description: 'Recommended - Best balance of speed and quality',
            category: 'recommended',
          },
          {
            value: 'gemini-1.5-pro-latest',
            label: 'Gemini 1.5 Pro',
            description: 'Highest quality for complex reasoning',
            category: 'quality',
          },
          {
            value: 'gemini-pro',
            label: 'Gemini Pro',
            description: 'Production-ready general purpose model',
            category: 'quality',
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching available models:', error);
      // Use fallback models on error
      setAvailableModels([
        {
          value: 'gemini-1.5-flash-latest',
          label: 'Gemini 1.5 Flash',
          description: 'Recommended - Best balance of speed and quality',
          category: 'recommended',
        },
        {
          value: 'gemini-1.5-pro-latest',
          label: 'Gemini 1.5 Pro',
          description: 'Highest quality for complex reasoning',
          category: 'quality',
        },
        {
          value: 'gemini-pro',
          label: 'Gemini Pro',
          description: 'Production-ready general purpose model',
          category: 'quality',
        },
      ]);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSaveApiKey = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Save both API key and model
      const [apiKeyRes, modelRes] = await Promise.all([
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'gemini_api_key',
            value: geminiApiKey,
          }),
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'gemini_model',
            value: geminiModel,
          }),
        }),
      ]);

      if (apiKeyRes.ok && modelRes.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const data = await (apiKeyRes.ok ? modelRes : apiKeyRes).json();
        setSaveError(data.error || 'Failed to save settings');
      }
    } catch (error) {
      setSaveError('An error occurred while saving');
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteApiKey = async () => {
    if (!confirm('Are you sure you want to delete the API key?')) return;

    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch('/api/settings?key=gemini_api_key', {
        method: 'DELETE',
      });

      if (res.ok) {
        setGeminiApiKey('');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const data = await res.json();
        setSaveError(data.error || 'Failed to delete API key');
      }
    } catch (error) {
      setSaveError('An error occurred while deleting');
      console.error('Error deleting API key:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleExportDatabase = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/database/export');
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Generate filename with current date
      const timestamp = new Date().toISOString().split('T')[0];
      a.download = `growassess-export-${timestamp}.json`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting database:', error);
      alert('Failed to export database. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const isApiKeyConfigured = geminiApiKey.trim().length > 0;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage application settings and integrations</p>
      </div>

      {/* User Profile Section */}
      {currentUser && (
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">User Profile</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Name</span>
                <span className="text-sm text-gray-900">{currentUser.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Email</span>
                <span className="text-sm text-gray-900">{currentUser.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Role</span>
                <Badge variant={currentUser.role === 'admin' ? 'success' : 'default'}>
                  {currentUser.role}
                </Badge>
              </div>
              {currentUser.email === 'wen.wei@gmail.com' && currentUser.role !== 'admin' && (
                <div className="pt-3 border-t border-gray-200">
                  <Button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/admin/setup', { method: 'POST' });
                        if (res.ok) {
                          alert('Admin role activated! Please refresh the page.');
                          window.location.reload();
                        } else {
                          const data = await res.json();
                          alert(data.error || 'Failed to activate admin role');
                        }
                      } catch {
                        alert('Failed to activate admin role');
                      }
                    }}
                  >
                    Activate Admin Role
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* AI Integration Section */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Integration</h2>
              <p className="text-sm text-gray-500 mt-1">
                Configure AI services for test generation features
              </p>
            </div>
            {isApiKeyConfigured && (
              <Badge variant="success">Configured</Badge>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-4">
            <div>
              <label htmlFor="gemini-api-key" className="block text-sm font-medium text-gray-700 mb-2">
                Google Gemini API Key
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Required for AI-powered features. Get your free API key from{' '}
                <a
                  href="https://ai.google.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    id="gemini-api-key"
                    type={showApiKey ? 'text' : 'password'}
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="AIza..."
                    className="font-mono text-sm"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="whitespace-nowrap"
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </Button>
              </div>
            </div>

            <div>
              <label htmlFor="gemini-model" className="block text-sm font-medium text-gray-700 mb-2">
                Gemini Model
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Select which Gemini model to use for AI grading and test generation
              </p>
              {loadingModels ? (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                  <span className="text-sm text-gray-600">Loading available models...</span>
                </div>
              ) : availableModels.length > 0 ? (
                <>
                  <Select
                    id="gemini-model"
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    options={availableModels.map(model => ({
                      value: model.value,
                      label: `${model.label}${model.description ? ` - ${model.description}` : ''}`,
                    }))}
                  />
                  <div className="mt-3 space-y-2">
                    {availableModels.map((model) => (
                      <div key={model.value} className="text-xs text-gray-600">
                        <span className="font-semibold">{model.label}:</span> {model.description}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">
                      {availableModels.length} models available
                    </span>
                  </div>
                </>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  Unable to load models. Using default model (gemini-1.5-flash).
                </div>
              )}
            </div>

            {saveError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {saveError}
              </div>
            )}

            {saveSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                Settings saved successfully!
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleSaveApiKey}
                loading={saving}
                disabled={!geminiApiKey.trim()}
              >
                Save API Key
              </Button>
              {isApiKeyConfigured && (
                <Button
                  variant="danger"
                  onClick={handleDeleteApiKey}
                  disabled={saving}
                >
                  Delete Key
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Database Management Section */}
      {currentUser?.role === 'admin' && (
        <Card className="mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Database Management</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Backup and manage your application data
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Export Database</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Download a complete backup of your database in JSON format. This includes all tests,
                  candidates, assignments, responses, and settings.
                </p>
                <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                  <svg
                    className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5"
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
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Important Notes:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>API keys are redacted in the export for security</li>
                      <li>User passwords are excluded from the export</li>
                      <li>Store the backup file securely as it contains sensitive data</li>
                      <li>The file is in JSON format and can be used for backup or migration</li>
                    </ul>
                  </div>
                </div>
                <Button
                  onClick={handleExportDatabase}
                  loading={exporting}
                  variant="secondary"
                >
                  {exporting ? 'Exporting...' : 'Export Database'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Instructions Card */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            How to get a Gemini API Key
          </h3>
          <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
            <li>
              Visit{' '}
              <a
                href="https://ai.google.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google AI Studio
              </a>
            </li>
            <li>Click "Get API Key" in the top navigation</li>
            <li>Create a new API key or use an existing one</li>
            <li>Copy the API key and paste it above</li>
            <li>Click "Save API Key" to enable AI test generation</li>
          </ol>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> The API key is stored securely in your database and will be
              used for all AI-powered test generation features. You can update or delete it at any time.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
