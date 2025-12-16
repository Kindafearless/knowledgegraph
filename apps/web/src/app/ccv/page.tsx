'use client';

import { useState } from 'react';
import { Tag, Sparkles, FolderTree, FileText, Upload } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ChatPanel } from '@/components/chat/chat-panel';
import { TermBrowser } from '@/components/ccv/term-browser';
import { SuggestionQueue } from '@/components/ccv/suggestion-queue';
import { HierarchyTree } from '@/components/ccv/hierarchy-tree';
import { TermEditor } from '@/components/ccv/term-editor';
import { CCVTerm } from '@/lib/api/ccv';
import { useExtractTerms, useAnalyzeCoverage, usePendingSuggestions } from '@/hooks/use-ccv';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';

export default function CCVPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { isChatOpen } = useUIStore();

  const [selectedTerm, setSelectedTerm] = useState<CCVTerm | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('terms');
  const [extractText, setExtractText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  const { data: pendingSuggestions } = usePendingSuggestions();
  const extractTerms = useExtractTerms();
  const analyzeCoverage = useAnalyzeCoverage();

  const handleSelectTerm = (term: CCVTerm) => {
    setSelectedTerm(term);
    setEditingTermId(term.id);
    setIsEditorOpen(true);
  };

  const handleCreateTerm = () => {
    setSelectedTerm(null);
    setEditingTermId(null);
    setIsEditorOpen(true);
  };

  const handleExtract = async () => {
    if (!extractText.trim()) return;
    setIsExtracting(true);
    try {
      await extractTerms.mutateAsync({ text: extractText });
      setExtractText('');
      setActiveTab('suggestions');
    } finally {
      setIsExtracting(false);
    }
  };

  const pendingCount = pendingSuggestions?.length || 0;

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
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Page Header */}
            <div className="bg-card border-b border-border px-6 py-4">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Tag className="w-6 h-6 text-primary" />
                Canonical Control Vocabulary
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage standardized vocabulary for your knowledge graph
              </p>
            </div>

            {/* Tabs */}
            <Tabs.Root
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <Tabs.List className="flex border-b border-border bg-card px-4">
                <Tabs.Trigger
                  value="terms"
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground border-b-2 border-transparent data-[state=active]:text-primary data-[state=active]:border-primary"
                >
                  <Tag className="w-4 h-4" />
                  Terms
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="hierarchy"
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground border-b-2 border-transparent data-[state=active]:text-primary data-[state=active]:border-primary"
                >
                  <FolderTree className="w-4 h-4" />
                  Hierarchy
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="suggestions"
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground border-b-2 border-transparent data-[state=active]:text-primary data-[state=active]:border-primary"
                >
                  <Sparkles className="w-4 h-4" />
                  Suggestions
                  {pendingCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="extract"
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground border-b-2 border-transparent data-[state=active]:text-primary data-[state=active]:border-primary"
                >
                  <Upload className="w-4 h-4" />
                  Extract
                </Tabs.Trigger>
              </Tabs.List>

              {/* Terms Tab */}
              <Tabs.Content value="terms" className="flex-1 overflow-hidden">
                <div className="h-full bg-card">
                  <TermBrowser
                    onSelectTerm={handleSelectTerm}
                    onCreateTerm={handleCreateTerm}
                    selectedTermId={selectedTerm?.id}
                  />
                </div>
              </Tabs.Content>

              {/* Hierarchy Tab */}
              <Tabs.Content value="hierarchy" className="flex-1 overflow-hidden">
                <div className="h-full bg-card">
                  <HierarchyTree
                    onSelectTerm={handleSelectTerm}
                    selectedTermId={selectedTerm?.id}
                  />
                </div>
              </Tabs.Content>

              {/* Suggestions Tab */}
              <Tabs.Content value="suggestions" className="flex-1 overflow-hidden">
                <div className="h-full bg-card">
                  <SuggestionQueue
                    onViewTerm={(termId) => {
                      setEditingTermId(termId);
                      setIsEditorOpen(true);
                    }}
                  />
                </div>
              </Tabs.Content>

              {/* Extract Tab */}
              <Tabs.Content value="extract" className="flex-1 overflow-hidden">
                <div className="h-full bg-card p-6 overflow-auto">
                  <div className="max-w-3xl mx-auto">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Extract Terms from Text
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Paste text below and our LLM will analyze it to identify potential
                      vocabulary terms, synonyms, and relationships.
                    </p>

                    <textarea
                      value={extractText}
                      onChange={(e) => setExtractText(e.target.value)}
                      placeholder="Paste your text here to extract vocabulary terms..."
                      rows={12}
                      className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />

                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm text-muted-foreground">
                        {extractText.length} characters
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (extractText.trim()) {
                              analyzeCoverage.mutate({ text: extractText });
                            }
                          }}
                          disabled={!extractText.trim() || analyzeCoverage.isPending}
                          className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-accent disabled:opacity-50"
                        >
                          Analyze Coverage
                        </button>
                        <button
                          onClick={handleExtract}
                          disabled={!extractText.trim() || isExtracting}
                          className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                        >
                          <Sparkles className="w-4 h-4" />
                          {isExtracting ? 'Extracting...' : 'Extract Terms'}
                        </button>
                      </div>
                    </div>

                    {/* Coverage Analysis Results */}
                    {analyzeCoverage.data && (
                      <div className="mt-6 p-4 bg-muted rounded-lg">
                        <h3 className="font-medium mb-3">
                          Coverage Analysis
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {analyzeCoverage.data.coverage_percentage}%
                            </div>
                            <div className="text-xs text-muted-foreground">Coverage</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {analyzeCoverage.data.matched_terms}
                            </div>
                            <div className="text-xs text-muted-foreground">Matched</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-600">
                              {analyzeCoverage.data.unmatched_words}
                            </div>
                            <div className="text-xs text-muted-foreground">Unmatched</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-muted-foreground">
                              {analyzeCoverage.data.total_unique_words}
                            </div>
                            <div className="text-xs text-muted-foreground">Total Words</div>
                          </div>
                        </div>

                        {analyzeCoverage.data.unmatched_examples.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">
                              Potential New Terms:
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {analyzeCoverage.data.unmatched_examples.slice(0, 20).map((word) => (
                                <span
                                  key={word}
                                  className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded"
                                >
                                  {word}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Tabs.Content>
            </Tabs.Root>
          </main>

          {isChatOpen && (
            <aside className="w-96 border-l border-border flex flex-col bg-card">
              <ChatPanel />
            </aside>
          )}
        </div>
      </div>

      {/* Term Editor Dialog */}
      <TermEditor
        termId={editingTermId}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingTermId(null);
        }}
        onSaved={(term) => setSelectedTerm(term)}
      />
    </div>
  );
}
