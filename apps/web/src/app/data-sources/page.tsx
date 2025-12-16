'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ChatPanel } from '@/components/chat/chat-panel';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { Database, Plus, RefreshCw, Settings, Loader2, AlertCircle, Trash2, X, FileText, Globe, Server } from 'lucide-react';

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'syncing' | 'inactive' | 'error';
  entity_count?: number;
  last_sync?: string;
  created_at?: string;
  config?: Record<string, unknown>;
}

const DATA_SOURCE_TYPES = [
  { id: 'documents', name: 'Documents', icon: FileText, description: 'Import from PDF, Word, or text files' },
  { id: 'api', name: 'API', icon: Globe, description: 'Connect to external REST APIs' },
  { id: 'database', name: 'Database', icon: Server, description: 'Import from SQL or NoSQL databases' },
];

export default function DataSourcesPage() {
  const { isAuthenticated, isLoading: authLoading, accessToken } = useAuthStore();
  const { isChatOpen } = useUIStore();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', type: 'documents', url: '' });
  const [isCreating, setIsCreating] = useState(false);

  const fetchDataSources = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/datasources', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data sources: ${response.status}`);
      }

      const data = await response.json();
      setDataSources(data.datasources || data || []);
    } catch (err) {
      console.error('Error fetching data sources:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data sources');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  const createDataSource = async () => {
    if (!accessToken || !newSource.name.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/datasources', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newSource.name,
          type: newSource.type,
          config: newSource.url ? { url: newSource.url } : {},
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create data source');
      }

      setShowAddModal(false);
      setNewSource({ name: '', type: 'documents', url: '' });
      fetchDataSources();
    } catch (err) {
      console.error('Error creating data source:', err);
      setError(err instanceof Error ? err.message : 'Failed to create data source');
    } finally {
      setIsCreating(false);
    }
  };

  const triggerSync = async (sourceId: string) => {
    if (!accessToken) return;

    setSyncingIds(prev => new Set([...prev, sourceId]));

    try {
      const response = await fetch(`/api/datasources/${sourceId}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to trigger sync');
      }

      setTimeout(() => {
        fetchDataSources();
        setSyncingIds(prev => {
          const next = new Set(prev);
          next.delete(sourceId);
          return next;
        });
      }, 2000);
    } catch (err) {
      console.error('Error triggering sync:', err);
      setSyncingIds(prev => {
        const next = new Set(prev);
        next.delete(sourceId);
        return next;
      });
    }
  };

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchDataSources();
    }
  }, [isAuthenticated, accessToken, fetchDataSources]);

  const formatLastSync = (date?: string) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'syncing':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'error':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Data Sources</h1>
                <p className="text-muted-foreground">Manage your knowledge graph data sources</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchDataSources}
                  className="flex items-center gap-2 px-4 py-2 border border-input rounded-md hover:bg-accent"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Add Source
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-4">
                {dataSources.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No data sources configured</p>
                    <p className="text-sm mt-2">Add a data source to start building your knowledge graph</p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                      <Plus className="h-4 w-4" />
                      Add Your First Source
                    </button>
                  </div>
                ) : (
                  dataSources.map((source) => (
                    <div key={source.id} className="p-4 bg-card border border-border rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Database className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{source.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {source.type} {source.entity_count !== undefined && `- ${source.entity_count.toLocaleString()} entities`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(source.status)}`}>
                          {syncingIds.has(source.id) ? 'syncing' : source.status}
                        </span>
                        <span className="text-sm text-muted-foreground min-w-[100px]">
                          {formatLastSync(source.last_sync)}
                        </span>
                        <button
                          onClick={() => triggerSync(source.id)}
                          disabled={syncingIds.has(source.id) || source.status === 'syncing'}
                          className="p-2 hover:bg-accent rounded-md disabled:opacity-50"
                          title="Sync data source"
                        >
                          <RefreshCw className={`h-4 w-4 ${syncingIds.has(source.id) ? 'animate-spin' : ''}`} />
                        </button>
                        <button className="p-2 hover:bg-accent rounded-md" title="Configure">
                          <Settings className="h-4 w-4" />
                        </button>
                        <button className="p-2 hover:bg-red-50 dark:hover:bg-red-950 rounded-md text-red-500" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </main>
          {isChatOpen && (
            <aside className="w-96 border-l border-border flex flex-col bg-card">
              <ChatPanel />
            </aside>
          )}
        </div>
      </div>

      {/* Add Data Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg w-full max-w-lg mx-4 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Add Data Source</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-accent rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  placeholder="My Data Source"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {DATA_SOURCE_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setNewSource({ ...newSource, type: type.id })}
                      className={`p-3 border rounded-lg text-center transition-colors ${
                        newSource.type === type.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <type.icon className="h-6 w-6 mx-auto mb-1" />
                      <p className="text-sm font-medium">{type.name}</p>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {DATA_SOURCE_TYPES.find(t => t.id === newSource.type)?.description}
                </p>
              </div>

              {(newSource.type === 'api' || newSource.type === 'database') && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {newSource.type === 'api' ? 'API URL' : 'Connection String'}
                  </label>
                  <input
                    type="text"
                    value={newSource.url}
                    onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                    placeholder={newSource.type === 'api' ? 'https://api.example.com/data' : 'postgresql://...'}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background font-mono text-sm"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-border">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-input rounded-md hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={createDataSource}
                disabled={!newSource.name.trim() || isCreating}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add Source
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
