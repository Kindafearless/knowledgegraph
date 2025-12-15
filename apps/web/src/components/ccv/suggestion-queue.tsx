'use client';

import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  GitMerge,
  FileText,
} from 'lucide-react';
import {
  usePendingSuggestions,
  useReviewSuggestion,
  useBatchReviewSuggestions,
} from '@/hooks/use-ccv';
import { CCVSuggestion } from '@/lib/api/ccv';

const SUGGESTION_TYPE_LABELS: Record<string, { label: string; icon: typeof Tag }> = {
  new_term: { label: 'New Term', icon: Tag },
  synonym: { label: 'Synonym', icon: GitMerge },
  hierarchy: { label: 'Hierarchy', icon: ChevronDown },
  merge: { label: 'Merge', icon: GitMerge },
  definition: { label: 'Definition', icon: FileText },
};

interface SuggestionQueueProps {
  onViewTerm?: (termId: string) => void;
}

export function SuggestionQueue({ onViewTerm }: SuggestionQueueProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: suggestions, isLoading, refetch } = usePendingSuggestions();
  const reviewSuggestion = useReviewSuggestion();
  const batchReview = useBatchReviewSuggestions();

  const handleSelectAll = () => {
    if (selectedIds.size === suggestions?.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(suggestions?.map((s) => s.id)));
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    await reviewSuggestion.mutateAsync({ suggestionId: id, action });
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleBatchReview = async (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0) return;
    await batchReview.mutateAsync({
      suggestionIds: Array.from(selectedIds),
      action,
    });
    setSelectedIds(new Set());
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Suggestions
            </h2>
            {suggestions && suggestions.length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">
                {suggestions.length} pending
              </span>
            )}
          </div>
          <button
            onClick={() => refetch()}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Refresh
          </button>
        </div>

        {/* Batch Actions */}
        {suggestions && suggestions.length > 0 && (
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={selectedIds.size === suggestions.length}
                onChange={handleSelectAll}
                className="rounded border-gray-300"
              />
              Select all ({selectedIds.size} selected)
            </label>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBatchReview('approve')}
                  disabled={batchReview.isPending}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="w-3 h-3" />
                  Approve All
                </button>
                <button
                  onClick={() => handleBatchReview('reject')}
                  disabled={batchReview.isPending}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="w-3 h-3" />
                  Reject All
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suggestion List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading suggestions...</div>
        ) : suggestions?.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">All caught up!</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              No pending suggestions to review
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {suggestions?.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                isSelected={selectedIds.has(suggestion.id)}
                isExpanded={expandedId === suggestion.id}
                onSelect={() => handleSelect(suggestion.id)}
                onToggleExpand={() =>
                  setExpandedId(expandedId === suggestion.id ? null : suggestion.id)
                }
                onApprove={() => handleReview(suggestion.id, 'approve')}
                onReject={() => handleReview(suggestion.id, 'reject')}
                onViewTerm={onViewTerm}
                isReviewing={reviewSuggestion.isPending}
                getConfidenceColor={getConfidenceColor}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface SuggestionCardProps {
  suggestion: CCVSuggestion;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onApprove: () => void;
  onReject: () => void;
  onViewTerm?: (termId: string) => void;
  isReviewing: boolean;
  getConfidenceColor: (confidence: number) => string;
}

function SuggestionCard({
  suggestion,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onApprove,
  onReject,
  onViewTerm,
  isReviewing,
  getConfidenceColor,
}: SuggestionCardProps) {
  const typeConfig = SUGGESTION_TYPE_LABELS[suggestion.suggestion_type] || {
    label: suggestion.suggestion_type,
    icon: AlertCircle,
  };
  const TypeIcon = typeConfig.icon;

  return (
    <li className={`${isSelected ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
      <div className="p-3">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="mt-1 rounded border-gray-300"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <TypeIcon className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {typeConfig.label}
              </span>
              <span
                className={`px-1.5 py-0.5 text-xs rounded ${getConfidenceColor(
                  suggestion.confidence
                )}`}
              >
                {Math.round(suggestion.confidence * 100)}% confidence
              </span>
            </div>

            <p className="font-medium text-gray-900 dark:text-white">
              {suggestion.suggested_value}
            </p>

            {suggestion.context && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {suggestion.context}
              </p>
            )}

            {/* Expanded Details */}
            {isExpanded && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-sm">
                {suggestion.llm_reasoning && (
                  <div className="mb-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      LLM Reasoning:
                    </span>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {suggestion.llm_reasoning}
                    </p>
                  </div>
                )}

                {suggestion.source_text && (
                  <div className="mb-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Source Text:
                    </span>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 italic">
                      "{suggestion.source_text}"
                    </p>
                  </div>
                )}

                {suggestion.alternative_suggestions &&
                  suggestion.alternative_suggestions.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Alternatives:
                      </span>
                      <ul className="mt-1 flex flex-wrap gap-1">
                        {suggestion.alternative_suggestions.map((alt, i) => (
                          <li
                            key={i}
                            className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
                          >
                            {alt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {suggestion.term_id && onViewTerm && (
                  <button
                    onClick={() => onViewTerm(suggestion.term_id!)}
                    className="mt-2 text-blue-600 hover:underline"
                  >
                    View related term
                  </button>
                )}
              </div>
            )}

            <button
              onClick={onToggleExpand}
              className="flex items-center gap-1 mt-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" /> Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" /> More
                </>
              )}
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1">
            <button
              onClick={onApprove}
              disabled={isReviewing}
              className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded disabled:opacity-50"
              title="Approve"
            >
              <CheckCircle className="w-5 h-5" />
            </button>
            <button
              onClick={onReject}
              disabled={isReviewing}
              className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded disabled:opacity-50"
              title="Reject"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
