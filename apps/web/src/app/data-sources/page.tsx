'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useAuthStore } from '@/stores/auth-store';
import { Database, Plus, RefreshCw, Settings } from 'lucide-react';

const mockDataSources = [
  { id: '1', name: 'Intelligence Reports', type: 'documents', status: 'active', entities: 1250, lastSync: '2 hours ago' },
  { id: '2', name: 'OSINT Feed', type: 'api', status: 'active', entities: 3420, lastSync: '5 minutes ago' },
  { id: '3', name: 'Threat Database', type: 'database', status: 'syncing', entities: 890, lastSync: 'In progress' },
  { id: '4', name: 'Partner Intel', type: 'documents', status: 'inactive', entities: 450, lastSync: '3 days ago' },
];

export default function DataSourcesPage() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
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
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Add Source
              </button>
            </div>

            <div className="grid gap-4">
              {mockDataSources.map((source) => (
                <div key={source.id} className="p-4 bg-card border border-border rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Database className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{source.name}</h3>
                      <p className="text-sm text-muted-foreground">{source.type} - {source.entities} entities</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      source.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                      source.status === 'syncing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {source.status}
                    </span>
                    <span className="text-sm text-muted-foreground">{source.lastSync}</span>
                    <button className="p-2 hover:bg-accent rounded-md">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button className="p-2 hover:bg-accent rounded-md">
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
