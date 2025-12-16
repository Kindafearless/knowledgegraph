'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Save, Tag, ChevronRight, AlertTriangle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  useTerm,
  useCreateTerm,
  useUpdateTerm,
  useAddSynonym,
  useRemoveSynonym,
  useAncestors,
  useSearchTerms,
  useSimilarTerms,
} from '@/hooks/use-ccv';
import { CCVTerm, CCVSynonym, SimilarTerm } from '@/lib/api/ccv';

interface TermEditorProps {
  termId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (term: CCVTerm) => void;
}

export function TermEditor({ termId, isOpen, onClose, onSaved }: TermEditorProps) {
  const [canonicalName, setCanonicalName] = useState('');
  const [definition, setDefinition] = useState('');
  const [domain, setDomain] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [newSynonym, setNewSynonym] = useState('');
  const [parentSearch, setParentSearch] = useState('');
  const [showParentSearch, setShowParentSearch] = useState(false);

  const { data: term, isLoading } = useTerm(termId || '');
  const { data: ancestors } = useAncestors(termId || '');
  const { data: parentSearchResults } = useSearchTerms(parentSearch);

  const createTerm = useCreateTerm();
  const updateTerm = useUpdateTerm();
  const addSynonym = useAddSynonym();
  const removeSynonym = useRemoveSynonym();

  // Check for similar terms (potential collisions)
  const { data: similarTerms, isLoading: isSimilarLoading } = useSimilarTerms(
    canonicalName,
    {
      excludeId: termId || undefined,
      threshold: 0.3,
      limit: 5,
    }
  );

  // Filter out exact matches if we're editing (they would be the same term)
  const potentialCollisions = useMemo(() => {
    if (!similarTerms) return [];
    return similarTerms.filter(
      (t) => t.id !== termId && (t.match_type === 'exact' || t.similarity >= 0.5)
    );
  }, [similarTerms, termId]);

  const hasExactMatch = potentialCollisions.some((t) => t.match_type === 'exact');

  const isEditing = !!termId;

  // Reset form when term changes
  useEffect(() => {
    if (term) {
      setCanonicalName(term.canonical_name || '');
      setDefinition(term.definition || '');
      setDomain(term.domain || '');
      setParentId(term.parent_id || null);
    } else if (!termId) {
      setCanonicalName('');
      setDefinition('');
      setDomain('');
      setParentId(null);
    }
  }, [term, termId]);

  const handleSave = async () => {
    if (!canonicalName.trim()) return;

    let savedTerm: CCVTerm;

    if (isEditing && termId) {
      savedTerm = await updateTerm.mutateAsync({
        termId,
        data: {
          canonical_name: canonicalName,
          definition: definition || undefined,
          domain: domain || undefined,
          parent_id: parentId,
        },
      });
    } else {
      savedTerm = await createTerm.mutateAsync({
        canonical_name: canonicalName,
        definition: definition || undefined,
        domain: domain || undefined,
        parent_id: parentId || undefined,
      });
    }

    onSaved?.(savedTerm);
    onClose();
  };

  const handleAddSynonym = async () => {
    if (!termId || !newSynonym.trim()) return;
    await addSynonym.mutateAsync({ termId, synonym: newSynonym.trim() });
    setNewSynonym('');
  };

  const handleRemoveSynonym = async (synonymId: string) => {
    if (!termId) return;
    await removeSynonym.mutateAsync({ termId, synonymId });
  };

  const handleSelectParent = (parent: CCVTerm) => {
    setParentId(parent.id);
    setParentSearch(parent.canonical_name || '');
    setShowParentSearch(false);
  };

  const isSaving = createTerm.isPending || updateTerm.isPending;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-lg shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Tag className="w-5 h-5" />
              {isEditing ? 'Edit Term' : 'Create Term'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </Dialog.Close>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Breadcrumb */}
              {isEditing && ancestors && ancestors.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 overflow-x-auto pb-2">
                  {ancestors.reverse().map((ancestor, i) => (
                    <span key={ancestor.id} className="flex items-center gap-1">
                      {i > 0 && <ChevronRight className="w-3 h-3" />}
                      <span className="whitespace-nowrap">{ancestor.canonical_name}</span>
                    </span>
                  ))}
                  <ChevronRight className="w-3 h-3" />
                  <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {canonicalName}
                  </span>
                </div>
              )}

              {/* Canonical Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Canonical Name *
                </label>
                <input
                  type="text"
                  value={canonicalName}
                  onChange={(e) => setCanonicalName(e.target.value)}
                  placeholder="Enter the canonical term name"
                  className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    hasExactMatch
                      ? 'border-red-500 focus:ring-red-500'
                      : potentialCollisions.length > 0
                      ? 'border-amber-500 focus:ring-amber-500'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                />

                {/* Collision Warning */}
                {potentialCollisions.length > 0 && (
                  <div
                    className={`mt-2 p-3 rounded-md ${
                      hasExactMatch
                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          hasExactMatch ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            hasExactMatch
                              ? 'text-red-800 dark:text-red-300'
                              : 'text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {hasExactMatch
                            ? 'Duplicate term detected!'
                            : 'Similar terms found'}
                        </p>
                        <p
                          className={`text-xs mt-0.5 ${
                            hasExactMatch
                              ? 'text-red-700 dark:text-red-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {hasExactMatch
                            ? 'A term with this exact name already exists.'
                            : 'Consider using an existing term or adding this as a synonym.'}
                        </p>
                        <ul className="mt-2 space-y-1">
                          {potentialCollisions.map((collision) => (
                            <li
                              key={collision.id}
                              className={`text-xs p-1.5 rounded flex items-center justify-between ${
                                collision.match_type === 'exact'
                                  ? 'bg-red-100 dark:bg-red-900/30'
                                  : 'bg-amber-100 dark:bg-amber-900/30'
                              }`}
                            >
                              <span className="font-medium truncate">{collision.canonical_name}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  collision.match_type === 'exact'
                                    ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
                                    : collision.match_type === 'synonym'
                                    ? 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200'
                                    : 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200'
                                }`}
                              >
                                {collision.match_type === 'exact'
                                  ? 'exact'
                                  : collision.match_type === 'synonym'
                                  ? `via: ${collision.matched_synonym}`
                                  : `${Math.round(collision.similarity * 100)}% similar`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Definition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Definition
                </label>
                <textarea
                  value={definition}
                  onChange={(e) => setDefinition(e.target.value)}
                  placeholder="Describe what this term means"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Domain */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Domain
                </label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select domain...</option>
                  <option value="security">Security</option>
                  <option value="compliance">Compliance</option>
                  <option value="technical">Technical</option>
                  <option value="business">Business</option>
                  <option value="general">General</option>
                </select>
              </div>

              {/* Parent Term */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Parent Term
                </label>
                <input
                  type="text"
                  value={parentSearch}
                  onChange={(e) => {
                    setParentSearch(e.target.value);
                    setShowParentSearch(true);
                  }}
                  onFocus={() => setShowParentSearch(true)}
                  placeholder="Search for parent term..."
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {parentId && (
                  <button
                    onClick={() => {
                      setParentId(null);
                      setParentSearch('');
                    }}
                    className="absolute right-2 top-8 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {showParentSearch &&
                  parentSearchResults &&
                  parentSearchResults.length > 0 && (
                    <ul className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg">
                      {parentSearchResults
                        .filter((t) => t.id !== termId)
                        .map((t) => (
                          <li key={t.id}>
                            <button
                              onClick={() => handleSelectParent(t)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              {t.canonical_name}
                              {t.domain && (
                                <span className="ml-2 text-xs text-gray-500">
                                  ({t.domain})
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                    </ul>
                  )}
              </div>

              {/* Synonyms (only when editing) */}
              {isEditing && term && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Synonyms
                  </label>
                  <div className="space-y-2">
                    {term.synonyms?.map((syn: CCVSynonym) => (
                      <div
                        key={syn.id}
                        className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-md"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {syn.synonym}
                        </span>
                        <button
                          onClick={() => handleRemoveSynonym(syn.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSynonym}
                        onChange={(e) => setNewSynonym(e.target.value)}
                        placeholder="Add synonym..."
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSynonym()}
                      />
                      <button
                        onClick={handleAddSynonym}
                        disabled={!newSynonym.trim() || addSynonym.isPending}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !canonicalName.trim() || hasExactMatch}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              title={hasExactMatch ? 'Cannot save: a term with this name already exists' : undefined}
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
