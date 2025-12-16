'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useAuthStore } from '@/stores/auth-store';
import { Settings, Database, Brain, Bell, Shield, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const GRAPH_SERVICE_URL = process.env.NEXT_PUBLIC_GRAPH_SERVICE_URL || 'http://localhost:8001';
const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:8080';

interface DatabaseStats {
  entities: number;
  relationships: number;
  storage_mb: number;
  last_backup?: string;
}

export default function SettingsPage() {
  const { isAuthenticated, isLoading: authLoading, accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    general: {
      appName: 'Knowledge Graph',
      defaultClassification: 'Unclassified',
      darkMode: true,
    },
    llm: {
      provider: 'mock',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2048,
    },
    notifications: {
      emailAlerts: true,
      syncNotifications: true,
      securityAlerts: true,
      weeklyDigest: false,
    },
    security: {
      sessionTimeout: 30,
      enforceStrongPasswords: true,
      mfaRequired: false,
      auditLogging: true,
    },
  });

  const fetchDatabaseStats = useCallback(async () => {
    if (!accessToken) return;

    setLoadingStats(true);
    try {
      const response = await fetch(`${GRAPH_SERVICE_URL}/api/v1/stats`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setDbStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch database stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (isAuthenticated && accessToken && activeTab === 'database') {
      fetchDatabaseStats();
    }
  }, [isAuthenticated, accessToken, activeTab, fetchDatabaseStats]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      // In a real implementation, this would save to the backend
      await new Promise(resolve => setTimeout(resolve, 500));
      setSaveMessage({ type: 'success', text: 'Settings saved successfully' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'llm', label: 'LLM Settings', icon: Brain },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onToggleChat={() => {}} isChatOpen={false} />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-muted-foreground">Configure your Knowledge Graph application</p>
            </div>

            <div className="flex gap-6">
              <nav className="w-48 space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>

              <div className="flex-1 bg-card border border-border rounded-lg p-6">
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold">General Settings</h2>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Application Name</label>
                        <input
                          type="text"
                          value={settings.general.appName}
                          onChange={(e) => setSettings({
                            ...settings,
                            general: { ...settings.general, appName: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Default Classification</label>
                        <select
                          value={settings.general.defaultClassification}
                          onChange={(e) => setSettings({
                            ...settings,
                            general: { ...settings.general, defaultClassification: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        >
                          <option value="Unclassified">Unclassified</option>
                          <option value="Confidential">Confidential</option>
                          <option value="Secret">Secret</option>
                          <option value="Top Secret">Top Secret</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Enable Dark Mode</p>
                          <p className="text-sm text-muted-foreground">Use dark theme by default</p>
                        </div>
                        <button
                          onClick={() => setSettings({
                            ...settings,
                            general: { ...settings.general, darkMode: !settings.general.darkMode }
                          })}
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            settings.general.darkMode ? 'bg-primary' : 'bg-muted'
                          }`}
                        >
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            settings.general.darkMode ? 'right-1' : 'left-1'
                          }`} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'database' && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold">Database Settings</h2>

                    {loadingStats ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Total Entities</p>
                            <p className="text-2xl font-bold">{dbStats?.entities?.toLocaleString() || '—'}</p>
                          </div>
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Relationships</p>
                            <p className="text-2xl font-bold">{dbStats?.relationships?.toLocaleString() || '—'}</p>
                          </div>
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Storage Used</p>
                            <p className="text-2xl font-bold">{dbStats?.storage_mb ? `${dbStats.storage_mb} MB` : '—'}</p>
                          </div>
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Last Backup</p>
                            <p className="text-2xl font-bold">{dbStats?.last_backup || 'Never'}</p>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-border">
                          <h3 className="font-medium mb-3">Database Actions</h3>
                          <div className="flex gap-2">
                            <button className="px-4 py-2 border border-input rounded-md hover:bg-accent text-sm">
                              Create Backup
                            </button>
                            <button className="px-4 py-2 border border-input rounded-md hover:bg-accent text-sm">
                              Optimize Indexes
                            </button>
                            <button className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950 text-sm">
                              Clear Cache
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'llm' && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold">LLM Settings</h2>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">LLM Provider</label>
                        <select
                          value={settings.llm.provider}
                          onChange={(e) => setSettings({
                            ...settings,
                            llm: { ...settings.llm, provider: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        >
                          <option value="mock">Mock (Development)</option>
                          <option value="openai">OpenAI</option>
                          <option value="anthropic">Anthropic</option>
                          <option value="bedrock">AWS Bedrock</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Model</label>
                        <input
                          type="text"
                          value={settings.llm.model}
                          onChange={(e) => setSettings({
                            ...settings,
                            llm: { ...settings.llm, model: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Temperature: {settings.llm.temperature}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={settings.llm.temperature}
                          onChange={(e) => setSettings({
                            ...settings,
                            llm: { ...settings.llm, temperature: parseFloat(e.target.value) }
                          })}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Max Tokens</label>
                        <input
                          type="number"
                          value={settings.llm.maxTokens}
                          onChange={(e) => setSettings({
                            ...settings,
                            llm: { ...settings.llm, maxTokens: parseInt(e.target.value) }
                          })}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold">Notification Settings</h2>

                    <div className="space-y-4">
                      {[
                        { key: 'emailAlerts', label: 'Email Alerts', description: 'Receive important alerts via email' },
                        { key: 'syncNotifications', label: 'Sync Notifications', description: 'Get notified when data sources finish syncing' },
                        { key: 'securityAlerts', label: 'Security Alerts', description: 'Receive alerts for security-related events' },
                        { key: 'weeklyDigest', label: 'Weekly Digest', description: 'Receive a weekly summary of activity' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between py-2">
                          <div>
                            <p className="font-medium">{item.label}</p>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                          <button
                            onClick={() => setSettings({
                              ...settings,
                              notifications: {
                                ...settings.notifications,
                                [item.key]: !settings.notifications[item.key as keyof typeof settings.notifications]
                              }
                            })}
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                              settings.notifications[item.key as keyof typeof settings.notifications] ? 'bg-primary' : 'bg-muted'
                            }`}
                          >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              settings.notifications[item.key as keyof typeof settings.notifications] ? 'right-1' : 'left-1'
                            }`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold">Security Settings</h2>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Session Timeout (minutes)</label>
                        <input
                          type="number"
                          value={settings.security.sessionTimeout}
                          onChange={(e) => setSettings({
                            ...settings,
                            security: { ...settings.security, sessionTimeout: parseInt(e.target.value) }
                          })}
                          className="w-full px-3 py-2 border border-input rounded-md bg-background"
                          min="5"
                          max="120"
                        />
                      </div>

                      {[
                        { key: 'enforceStrongPasswords', label: 'Enforce Strong Passwords', description: 'Require passwords with minimum complexity' },
                        { key: 'mfaRequired', label: 'Require MFA', description: 'Require multi-factor authentication for all users' },
                        { key: 'auditLogging', label: 'Audit Logging', description: 'Log all user actions for security auditing' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between py-2">
                          <div>
                            <p className="font-medium">{item.label}</p>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                          <button
                            onClick={() => setSettings({
                              ...settings,
                              security: {
                                ...settings.security,
                                [item.key]: !settings.security[item.key as keyof typeof settings.security]
                              }
                            })}
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                              settings.security[item.key as keyof typeof settings.security] ? 'bg-primary' : 'bg-muted'
                            }`}
                          >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              settings.security[item.key as keyof typeof settings.security] ? 'right-1' : 'left-1'
                            }`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {saveMessage && (
                  <div className={`flex items-center gap-2 mt-4 p-3 rounded-md ${
                    saveMessage.type === 'success'
                      ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                      : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                  }`}>
                    {saveMessage.type === 'success' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    {saveMessage.text}
                  </div>
                )}

                <div className="flex justify-end mt-6 pt-6 border-t border-border">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
