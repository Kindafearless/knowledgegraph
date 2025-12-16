'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ChatPanel } from '@/components/chat/chat-panel';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import {
  Database,
  Search,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Table as TableIcon,
  Filter,
  X,
  Eye,
} from 'lucide-react';
import Link from 'next/link';

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: string;
  entity_count?: number;
}

interface Entity {
  id: string;
  name: string;
  type: string;
  properties: Record<string, unknown>;
  data_source?: string;
  classification?: string;
  created_at?: string;
  updated_at?: string;
}

interface EntityType {
  name: string;
  count: number;
}

export default function DataExplorerPage() {
  const { isAuthenticated, isLoading: authLoading, accessToken } = useAuthStore();
  const { isChatOpen } = useUIStore();

  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

  // Fetch data sources
  const fetchDataSources = useCallback(async () => {
    if (!accessToken) return;

    setIsLoadingSources(true);
    try {
      const response = await fetch('/api/datasources', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data sources');
      }

      const data = await response.json();
      setDataSources(data.datasources || data || []);
    } catch (err) {
      console.error('Error fetching data sources:', err);
    } finally {
      setIsLoadingSources(false);
    }
  }, [accessToken]);

  // Fetch entities for a data source
  const fetchEntities = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      });

      if (selectedSource) {
        params.set('data_source_id', selectedSource);
      }

      if (selectedType) {
        params.set('type', selectedType);
      }

      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }

      const response = await fetch(`/api/entities?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch entities');
      }

      const data = await response.json();
      setEntities(data.entities || []);
      setTotalCount(data.total || data.entities?.length || 0);

      // Extract unique entity types
      const typeMap = new Map<string, number>();
      (data.entities || []).forEach((e: Entity) => {
        const current = typeMap.get(e.type) || 0;
        typeMap.set(e.type, current + 1);
      });

      if (data.entity_types) {
        setEntityTypes(data.entity_types);
      } else {
        setEntityTypes(
          Array.from(typeMap.entries()).map(([name, count]) => ({ name, count }))
        );
      }
    } catch (err) {
      console.error('Error fetching entities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load entities');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, selectedSource, selectedType, searchQuery, page]);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchDataSources();
    }
  }, [isAuthenticated, accessToken, fetchDataSources]);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchEntities();
    }
  }, [isAuthenticated, accessToken, selectedSource, selectedType, page, fetchEntities]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEntities();
  };

  const clearFilters = () => {
    setSelectedSource(null);
    setSelectedType(null);
    setSearchQuery('');
    setPage(1);
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatProperties = (props: Record<string, unknown>) => {
    const entries = Object.entries(props || {}).slice(0, 3);
    if (entries.length === 0) return '-';
    return entries.map(([k, v]) => `${k}: ${String(v).slice(0, 30)}`).join(', ');
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Data Explorer</h1>
                  <p className="text-muted-foreground">Browse and search entities across data sources</p>
                </div>
                <Link
                  href="/graph"
                  className="flex items-center gap-2 px-4 py-2 border border-input rounded-md hover:bg-accent"
                >
                  <ExternalLink className="h-4 w-4" />
                  View in Graph
                </Link>
              </div>

              {/* Filters */}
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Data Source Filter */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Data Source</label>
                    <select
                      value={selectedSource || ''}
                      onChange={(e) => {
                        setSelectedSource(e.target.value || null);
                        setPage(1);
                      }}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                    >
                      <option value="">All Data Sources</option>
                      {dataSources.map((ds) => (
                        <option key={ds.id} value={ds.id}>
                          {ds.name} {ds.entity_count ? `(${ds.entity_count})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Entity Type Filter */}
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Entity Type</label>
                    <select
                      value={selectedType || ''}
                      onChange={(e) => {
                        setSelectedType(e.target.value || null);
                        setPage(1);
                      }}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                    >
                      <option value="">All Types</option>
                      {entityTypes.map((et) => (
                        <option key={et.name} value={et.name}>
                          {et.name} ({et.count})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search */}
                  <div className="flex-[2] min-w-[250px]">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Search</label>
                    <form onSubmit={handleSearch} className="flex gap-2">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search by name or properties..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-input rounded-md bg-background text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
                      >
                        Search
                      </button>
                    </form>
                  </div>

                  {/* Clear Filters */}
                  {(selectedSource || selectedType || searchQuery) && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <p className="text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              {/* Results Table */}
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TableIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {isLoading ? 'Loading...' : `${totalCount.toLocaleString()} entities`}
                    </span>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2 text-sm">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-2 py-1 border border-input rounded hover:bg-accent disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="text-muted-foreground">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-2 py-1 border border-input rounded hover:bg-accent disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : entities.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No entities found</p>
                    <p className="text-sm mt-2">Try adjusting your filters or search query</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Data Source
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Properties
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {entities.map((entity) => (
                          <tr key={entity.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <span className="font-medium">{entity.name}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                {entity.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {entity.data_source || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground max-w-[300px] truncate">
                              {formatProperties(entity.properties)}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {formatDate(entity.created_at)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => setSelectedEntity(entity)}
                                className="p-1 hover:bg-accent rounded"
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </main>

          {isChatOpen && (
            <aside className="w-96 border-l border-border flex flex-col bg-card">
              <ChatPanel />
            </aside>
          )}
        </div>
      </div>

      {/* Entity Details Modal */}
      {selectedEntity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg w-full max-w-2xl mx-4 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold">{selectedEntity.name}</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary mt-1">
                  {selectedEntity.type}
                </span>
              </div>
              <button
                onClick={() => setSelectedEntity(null)}
                className="p-1 hover:bg-accent rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 overflow-auto flex-1">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">ID</label>
                    <p className="text-sm font-mono">{selectedEntity.id}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Data Source</label>
                    <p className="text-sm">{selectedEntity.data_source || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Classification</label>
                    <p className="text-sm">{selectedEntity.classification || 'Unclassified'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Created</label>
                    <p className="text-sm">{formatDate(selectedEntity.created_at)}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Properties</label>
                  <div className="mt-2 bg-muted/50 rounded-lg p-3 overflow-auto max-h-[300px]">
                    <pre className="text-sm font-mono whitespace-pre-wrap">
                      {JSON.stringify(selectedEntity.properties, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-border">
              <button
                onClick={() => setSelectedEntity(null)}
                className="px-4 py-2 border border-input rounded-md hover:bg-accent"
              >
                Close
              </button>
              <Link
                href={`/graph?entity=${selectedEntity.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                <ExternalLink className="h-4 w-4" />
                View in Graph
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
