'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import Select from '@/components/ui/SelectSimple';
import { Badge } from '@/components/ui/Badge';

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
  const [debugMode, setDebugMode] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [debugRunning, setDebugRunning] = useState(false);
  const [workingModel, setWorkingModel] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
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
        setAvailableModels([]);
      }
    } catch (error) {
      console.error('Error fetching available models:', error);
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSaveApiKey = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
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

  const handleRunDebug = async () => {
    setDebugRunning(true);
    setDebugLogs([]);
    setWorkingModel(null);
    setDebugMode(true);

    try {
      const response = await fetch('/api/gemini/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiApiKey || undefined }),
      });

      const data = await response.json();

      setDebugLogs(data.steps || []);
      setWorkingModel(data.workingModel || null);

      if (data.workingModel) {
        setGeminiModel(data.workingModel);

        if (data.availableModels && data.availableModels.length > 0) {
          const formattedModels = data.availableModels.map((model: any) => ({
            value: model.name,
            label: model.displayName || model.name,
            description: model.description || '',
            category: model.name.includes('flash') ? 'recommended' : 'quality',
          }));
          setAvailableModels(formattedModels);
        }
      }
    } catch (error) {
      console.error('Debug error:', error);
      setDebugLogs(['Fatal error running debug: ' + String(error)]);
    } finally {
      setDebugRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const isApiKeyConfigured = geminiApiKey.trim().length > 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage application settings and integrations</p>
        </div>

        {currentUser && (
        <Card className="mb-6 flex flex-col gap-4 overflow-hidden rounded-xl py-4">
          <div className="px-4">
            <h2 className="text-base font-medium leading-snug">User Profile</h2>
            <p className="text-sm text-muted-foreground mt-1">Your account information</p>
          </div>
          <div className="px-4">
            <div className="rounded-lg border p-3 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Name</span>
                <span className="text-sm font-medium text-foreground">{currentUser.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Email</span>
                <span className="text-sm font-medium text-foreground">{currentUser.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Role</span>
                <Badge variant={currentUser.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                  {currentUser.role}
                </Badge>
              </div>
              {currentUser.email === 'wen.wei@gmail.com' && currentUser.role !== 'admin' && (
                <div className="pt-3 border-t border-border">
                  <Button
                    size="sm"
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

      <Card className="mb-6 flex flex-col gap-4 overflow-hidden rounded-xl py-4">
        <div className="px-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium leading-snug">AI Integration</h2>
            {isApiKeyConfigured && (
              <Badge variant="default" className="text-xs">Configured</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configure AI services for test generation features
          </p>
        </div>

        <div className="px-4 space-y-4">
          <div>
            <label htmlFor="gemini-api-key" className="block text-sm font-medium text-foreground mb-2">
              Google Gemini API Key
            </label>
            <p className="text-sm text-muted-foreground mb-3">
              Required for AI-powered features. Get your free API key from{' '}
              <a
                href="https://ai.google.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
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
            <label htmlFor="gemini-model" className="block text-sm font-medium text-foreground mb-2">
              Gemini Model
            </label>
            <p className="text-sm text-muted-foreground mb-3">
              Select which Gemini model to use for AI grading and test generation
            </p>
            {loadingModels ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded border border-border">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                <span className="text-sm text-muted-foreground">Loading available models...</span>
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
                    <div key={model.value} className="text-xs text-muted-foreground">
                      <span className="font-semibold">{model.label}:</span> {model.description}
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <span className="text-xs text-muted-foreground">
                    {availableModels.length} models available
                  </span>
                </div>
              </>
            ) : (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-sm text-yellow-700 dark:text-yellow-400">
                Unable to load models. Using default model (gemini-1.5-flash).
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-3">
              <Button
                variant="secondary"
                onClick={handleRunDebug}
                disabled={debugRunning || !geminiApiKey.trim()}
                className="w-full"
              >
                {debugRunning ? 'Running Debug...' : 'Test API Connection & Find Working Model'}
              </Button>
              {!geminiApiKey.trim() && (
                <p className="text-xs text-muted-foreground mt-2">
                  Enter an API key above to test the connection
                </p>
              )}
            </div>

            {debugMode && debugLogs.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-foreground">Debug Console</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDebugMode(false)}
                  >
                    Close
                  </Button>
                </div>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-auto max-h-96">
                  {debugLogs.map((log, idx) => (
                    <div key={idx} className="mb-1">
                      {log}
                    </div>
                  ))}
                </div>

                {workingModel && (
                  <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-1">
                      Working Model Found!
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-500">
                      Model: <code className="bg-green-500/20 px-2 py-1 rounded">{workingModel}</code>
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-500 mt-2">
                      This model has been automatically selected. Click &quot;Save API Key&quot; below to use it.
                    </p>
                  </div>
                )}

                {!workingModel && !debugRunning && (
                  <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm font-semibold text-destructive mb-1">
                      No Working Model Found
                    </p>
                    <p className="text-sm text-destructive/80">
                      Please check the debug logs above for details. Your API key may be invalid or you may not have access to Gemini models.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {saveError && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {saveError}
            </div>
          )}

          {saveSuccess && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-700 dark:text-green-400 text-sm">
              Settings saved successfully!
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleSaveApiKey}
              disabled={saving || !geminiApiKey.trim()}
            >
              {saving ? 'Saving...' : 'Save API Key'}
            </Button>
            {isApiKeyConfigured && (
              <Button
                variant="destructive"
                onClick={handleDeleteApiKey}
                disabled={saving}
              >
                Delete Key
              </Button>
            )}
          </div>
        </div>
      </Card>

      {currentUser?.role === 'admin' && (
        <Card className="mb-6 flex flex-col gap-4 overflow-hidden rounded-xl py-4">
          <div className="px-4">
            <h2 className="text-base font-medium leading-snug">Database Management</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Backup and manage your application data
            </p>
          </div>

          <div className="px-4 space-y-4">
            <div className="rounded-lg border p-3 bg-muted/30">
              <h3 className="text-sm font-medium text-foreground mb-2">Export Database</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Download a complete backup of your database in JSON format. This includes all tests,
                candidates, assignments, responses, and settings.
              </p>
              <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-3">
                <svg
                  className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5"
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
                <div className="text-xs text-yellow-700 dark:text-yellow-300">
                  <p className="font-medium mb-1">Important Notes:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>API keys are redacted in the export for security</li>
                    <li>User passwords are excluded from the export</li>
                    <li>Store the backup file securely as it contains sensitive data</li>
                    <li>The file is in JSON format and can be used for backup or migration</li>
                  </ul>
                </div>
              </div>
              <Button
                onClick={handleExportDatabase}
                disabled={exporting}
                variant="secondary"
                size="sm"
              >
                {exporting ? 'Exporting...' : 'Export Database'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="flex flex-col gap-4 overflow-hidden rounded-xl py-4">
        <div className="px-4">
          <h3 className="text-base font-medium leading-snug">
            How to get a Gemini API Key
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Follow these steps to set up AI features
          </p>
        </div>
        <div className="px-4">
          <div className="rounded-lg border p-3 bg-muted/30">
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>
                Visit{' '}
                <a
                  href="https://ai.google.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google AI Studio
                </a>
              </li>
              <li>Click &quot;Get API Key&quot; in the top navigation</li>
              <li>Create a new API key or use an existing one</li>
              <li>Copy the API key and paste it above</li>
              <li>Click &quot;Save API Key&quot; to enable AI test generation</li>
            </ol>
          </div>

          <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm text-foreground">
              <strong>Note:</strong> The API key is stored securely in your database and will be
              used for all AI-powered test generation features. You can update or delete it at any time.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
