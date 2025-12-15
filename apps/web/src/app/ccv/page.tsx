'use client';

import { useState } from 'react';
import { Tag, Sparkles, FolderTree, FileText, Upload } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { TermBrowser } from '@/components/ccv/term-browser';
import { SuggestionQueue } from '@/components/ccv/suggestion-queue';
import { HierarchyTree } from '@/components/ccv/hierarchy-tree';
import { TermEditor } from '@/components/ccv/term-editor';
import { CCVTerm } from '@/lib/api/ccv';
import { useExtractTerms, useAnalyzeCoverage, usePendingSuggestions } from '@/hooks/use-ccv';

export default function CCVPage() {
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

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Tag className="w-6 h-6 text-blue-600" />
                Canonical Control Vocabulary
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Manage standardized vocabulary for your knowledge graph
              </p>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <Tabs.Root
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <Tabs.List className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4">
            <Tabs.Trigger
              value="terms"
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 border-b-2 border-transparent data-[state=active]:text-blue-600 data-[state=active]:border-blue-600"
            >
              <Tag className="w-4 h-4" />
              Terms
            </Tabs.Trigger>
            <Tabs.Trigger
              value="hierarchy"
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 border-b-2 border-transparent data-[state=active]:text-blue-600 data-[state=active]:border-blue-600"
            >
              <FolderTree className="w-4 h-4" />
              Hierarchy
            </Tabs.Trigger>
            <Tabs.Trigger
              value="suggestions"
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 border-b-2 border-transparent data-[state=active]:text-blue-600 data-[state=active]:border-blue-600"
            >
              <Sparkles className="w-4 h-4" />
              Suggestions
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">
                  {pendingCount}
                </span>
              )}
            </Tabs.Trigger>
            <Tabs.Trigger
              value="extract"
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 border-b-2 border-transparent data-[state=active]:text-blue-600 data-[state=active]:border-blue-600"
            >
              <Upload className="w-4 h-4" />
              Extract
            </Tabs.Trigger>
          </Tabs.List>

          {/* Terms Tab */}
          <Tabs.Content value="terms" className="flex-1 overflow-hidden">
            <div className="h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
              <TermBrowser
                onSelectTerm={handleSelectTerm}
                onCreateTerm={handleCreateTerm}
                selectedTermId={selectedTerm?.id}
              />
            </div>
          </Tabs.Content>

          {/* Hierarchy Tab */}
          <Tabs.Content value="hierarchy" className="flex-1 overflow-hidden">
            <div className="h-full bg-white dark:bg-gray-900">
              <HierarchyTree
                onSelectTerm={handleSelectTerm}
                selectedTermId={selectedTerm?.id}
              />
            </div>
          </Tabs.Content>

          {/* Suggestions Tab */}
          <Tabs.Content value="suggestions" className="flex-1 overflow-hidden">
            <div className="h-full bg-white dark:bg-gray-900">
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
            <div className="h-full bg-white dark:bg-gray-900 p-6">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Extract Terms from Text
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Paste text below and our LLM will analyze it to identify potential
                  vocabulary terms, synonyms, and relationships.
                </p>

                <textarea
                  value={extractText}
                  onChange={(e) => setExtractText(e.target.value)}
                  placeholder="Paste your text here to extract vocabulary terms..."
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />

                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-gray-500">
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
                      className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      Analyze Coverage
                    </button>
                    <button
                      onClick={handleExtract}
                      disabled={!extractText.trim() || isExtracting}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      {isExtracting ? 'Extracting...' : 'Extract Terms'}
                    </button>
                  </div>
                </div>

                {/* Coverage Analysis Results */}
                {analyzeCoverage.data && (
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                      Coverage Analysis
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {analyzeCoverage.data.coverage_percentage}%
                        </div>
                        <div className="text-xs text-gray-500">Coverage</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {analyzeCoverage.data.matched_terms}
                        </div>
                        <div className="text-xs text-gray-500">Matched</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {analyzeCoverage.data.unmatched_words}
                        </div>
                        <div className="text-xs text-gray-500">Unmatched</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-600">
                          {analyzeCoverage.data.total_unique_words}
                        </div>
                        <div className="text-xs text-gray-500">Total Words</div>
                      </div>
                    </div>

                    {analyzeCoverage.data.unmatched_examples.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
