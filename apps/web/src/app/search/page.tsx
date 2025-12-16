'use client';

import { useState, useCallback } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useAuthStore } from '@/stores/auth-store';
import { Search, Filter, FileText, User, MapPin, Building, Loader2, AlertCircle } from 'lucide-react';

const GRAPH_SERVICE_URL = process.env.NEXT_PUBLIC_GRAPH_SERVICE_URL || 'http://localhost:8001';

interface SearchResult {
  id: string;
  name: string;
  type: string;
  properties?: Record<string, unknown>;
  data_source?: string;
}

const typeIcons: Record<string, typeof User> = {
  person: User,
  organization: Building,
  location: MapPin,
  document: FileText,
  event: FileText,
};

export default function SearchPage() {
  const { isAuthenticated, isLoading: authLoading, accessToken } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setHasSearched(true);

    try {
      // Use the entities endpoint with search parameter
      const response = await fetch(
        `${GRAPH_SERVICE_URL}/api/v1/entities?search=${encodeURIComponent(query)}&page_size=50`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      setResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query, accessToken]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
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
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Search</h1>
              <p className="text-muted-foreground">Search across all entities and documents</p>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search entities, documents, relationships..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-4 py-3 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching || !query.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-input rounded-lg hover:bg-accent">
                <Filter className="h-4 w-4" />
                Filters
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {isSearching && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {!isSearching && hasSearched && results.length === 0 && !error && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No results found for "{query}"</p>
              </div>
            )}

            {!isSearching && !hasSearched && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter a search query to find entities</p>
              </div>
            )}

            <div className="space-y-3">
              {results.map((result) => {
                const Icon = typeIcons[result.type?.toLowerCase()] || FileText;
                return (
                  <div key={result.id} className="p-4 bg-card border border-border rounded-lg hover:border-primary/50 cursor-pointer transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{result.name}</h3>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-accent text-accent-foreground capitalize">
                            {result.type}
                          </span>
                          {result.data_source && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                              {result.data_source}
                            </span>
                          )}
                        </div>
                        {result.properties && Object.keys(result.properties).length > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {Object.entries(result.properties)
                              .slice(0, 3)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(' | ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
