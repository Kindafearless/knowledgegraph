'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ccvApi from '@/lib/api/ccv';

// Query Keys
export const ccvKeys = {
  all: ['ccv'] as const,
  terms: () => [...ccvKeys.all, 'terms'] as const,
  term: (id: string) => [...ccvKeys.terms(), id] as const,
  termSearch: (query: string) => [...ccvKeys.terms(), 'search', query] as const,
  suggestions: () => [...ccvKeys.all, 'suggestions'] as const,
  pendingSuggestions: () => [...ccvKeys.suggestions(), 'pending'] as const,
  hierarchy: () => [...ccvKeys.all, 'hierarchy'] as const,
  hierarchyStats: () => [...ccvKeys.hierarchy(), 'stats'] as const,
};

// Terms Hooks
export function useTerms(params?: {
  domain?: string;
  status?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: [...ccvKeys.terms(), params],
    queryFn: () => ccvApi.listTerms(params),
  });
}

export function useTerm(termId: string) {
  return useQuery({
    queryKey: ccvKeys.term(termId),
    queryFn: () => ccvApi.getTerm(termId),
    enabled: !!termId,
  });
}

export function useSearchTerms(query: string, domain?: string) {
  return useQuery({
    queryKey: ccvKeys.termSearch(query),
    queryFn: () => ccvApi.searchTerms(query, domain),
    enabled: query.length >= 2,
  });
}

export function useSimilarTerms(
  query: string,
  options?: {
    threshold?: number;
    limit?: number;
    excludeId?: string;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: [...ccvKeys.terms(), 'similar', query, options?.excludeId],
    queryFn: () => ccvApi.findSimilarTerms(query, {
      threshold: options?.threshold,
      limit: options?.limit,
      excludeId: options?.excludeId,
    }),
    enabled: (options?.enabled ?? true) && query.length >= 2,
    staleTime: 5000, // Keep results for 5 seconds while typing
  });
}

export function useCreateTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ccvApi.createTerm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ccvKeys.terms() });
      queryClient.invalidateQueries({ queryKey: ccvKeys.hierarchy() });
    },
  });
}

export function useUpdateTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ termId, data }: { termId: string; data: Parameters<typeof ccvApi.updateTerm>[1] }) =>
      ccvApi.updateTerm(termId, data),
    onSuccess: (_, { termId }) => {
      queryClient.invalidateQueries({ queryKey: ccvKeys.term(termId) });
      queryClient.invalidateQueries({ queryKey: ccvKeys.terms() });
      queryClient.invalidateQueries({ queryKey: ccvKeys.hierarchy() });
    },
  });
}

export function useDeleteTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ccvApi.deleteTerm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ccvKeys.terms() });
      queryClient.invalidateQueries({ queryKey: ccvKeys.hierarchy() });
    },
  });
}

// Synonym Hooks
export function useAddSynonym() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ termId, synonym }: { termId: string; synonym: string }) =>
      ccvApi.addSynonym(termId, synonym),
    onSuccess: (_, { termId }) => {
      queryClient.invalidateQueries({ queryKey: ccvKeys.term(termId) });
    },
  });
}

export function useRemoveSynonym() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ termId, synonymId }: { termId: string; synonymId: string }) =>
      ccvApi.removeSynonym(termId, synonymId),
    onSuccess: (_, { termId }) => {
      queryClient.invalidateQueries({ queryKey: ccvKeys.term(termId) });
    },
  });
}

// Suggestions Hooks
export function useSuggestions(params?: {
  status?: string;
  suggestion_type?: string;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: [...ccvKeys.suggestions(), params],
    queryFn: () => ccvApi.listSuggestions(params),
  });
}

export function usePendingSuggestions() {
  return useQuery({
    queryKey: ccvKeys.pendingSuggestions(),
    queryFn: ccvApi.getPendingSuggestions,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useReviewSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      suggestionId,
      action,
      notes,
      modified_value,
    }: {
      suggestionId: string;
      action: 'approve' | 'reject';
      notes?: string;
      modified_value?: string;
    }) => ccvApi.reviewSuggestion(suggestionId, action, notes, modified_value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ccvKeys.suggestions() });
      queryClient.invalidateQueries({ queryKey: ccvKeys.terms() });
      queryClient.invalidateQueries({ queryKey: ccvKeys.hierarchy() });
    },
  });
}

export function useBatchReviewSuggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      suggestionIds,
      action,
    }: {
      suggestionIds: string[];
      action: 'approve' | 'reject';
    }) => ccvApi.batchReviewSuggestions(suggestionIds, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ccvKeys.suggestions() });
      queryClient.invalidateQueries({ queryKey: ccvKeys.terms() });
      queryClient.invalidateQueries({ queryKey: ccvKeys.hierarchy() });
    },
  });
}

// Hierarchy Hooks
export function useHierarchy(params?: { domain?: string; max_depth?: number }) {
  return useQuery({
    queryKey: [...ccvKeys.hierarchy(), params],
    queryFn: () => ccvApi.getHierarchy(params),
  });
}

export function useHierarchyStats() {
  return useQuery({
    queryKey: ccvKeys.hierarchyStats(),
    queryFn: ccvApi.getHierarchyStats,
  });
}

export function useMoveTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ termId, newParentId }: { termId: string; newParentId: string | null }) =>
      ccvApi.moveTerm(termId, newParentId),
    onSuccess: (_, { termId }) => {
      queryClient.invalidateQueries({ queryKey: ccvKeys.term(termId) });
      queryClient.invalidateQueries({ queryKey: ccvKeys.hierarchy() });
    },
  });
}

export function useAncestors(termId: string) {
  return useQuery({
    queryKey: [...ccvKeys.term(termId), 'ancestors'],
    queryFn: () => ccvApi.getAncestors(termId),
    enabled: !!termId,
  });
}

export function useDescendants(termId: string) {
  return useQuery({
    queryKey: [...ccvKeys.term(termId), 'descendants'],
    queryFn: () => ccvApi.getDescendants(termId),
    enabled: !!termId,
  });
}

// Extraction Hooks
export function useExtractTerms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ccvApi.extractTermsFromText,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ccvKeys.suggestions() });
    },
  });
}

export function useAnalyzeCoverage() {
  return useMutation({
    mutationFn: ccvApi.analyzeVocabularyCoverage,
  });
}
