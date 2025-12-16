'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useAuthStore } from '@/stores/auth-store';
import { Database, Plus, RefreshCw, Settings, Loader2, AlertCircle, Trash2 } from 'lucide-react';

const GRAPH_SERVICE_URL = process.env.NEXT_PUBLIC_GRAPH_SERVICE_URL || 'http://localhost:8001';

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

export default function DataSourcesPage() {
  const { isAuthenticated, isLoading: authLoading, accessToken } = useAuthStore();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());

  const fetchDataSources = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${GRAPH_SERVICE_URL}/api/v1/datasources`, {
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

  const triggerSync = async (sourceId: string) => {
    if (!accessToken) return;

    setSyncingIds(prev => new Set([...prev, sourceId]));

    try {
      const response = await fetch(`${GRAPH_SERVICE_URL}/api/v1/datasources/${sourceId}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to trigger sync');
      }

      // Refresh data sources after a short delay
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
        <Header onToggleChat={() => {}} isChatOpen={false} />
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
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
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
      </div>
    </div>
  );
}
