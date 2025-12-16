'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useAuthStore } from '@/stores/auth-store';
import { Search, Filter, FileText, User, MapPin, Building } from 'lucide-react';

const mockResults = [
  { id: '1', type: 'person', name: 'John Smith', description: 'Intelligence analyst mentioned in multiple reports', relevance: 0.95 },
  { id: '2', type: 'organization', name: 'Acme Corporation', description: 'Technology company with government contracts', relevance: 0.88 },
  { id: '3', type: 'location', name: 'Washington D.C.', description: 'Capital city, mentioned in 234 documents', relevance: 0.82 },
  { id: '4', type: 'document', name: 'Q4 Threat Assessment', description: 'Quarterly threat intelligence report', relevance: 0.79 },
];

const typeIcons: Record<string, typeof User> = {
  person: User,
  organization: Building,
  location: MapPin,
  document: FileText,
};

export default function SearchPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [query, setQuery] = useState('');

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
                  className="w-full pl-10 pr-4 py-3 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-input rounded-lg hover:bg-accent">
                <Filter className="h-4 w-4" />
                Filters
              </button>
            </div>

            <div className="space-y-3">
              {mockResults.map((result) => {
                const Icon = typeIcons[result.type] || FileText;
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
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{result.description}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {Math.round(result.relevance * 100)}% match
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
