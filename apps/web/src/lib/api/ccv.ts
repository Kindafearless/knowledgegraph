/**
 * CCV API client for interacting with the CCV service through Next.js proxy routes.
 */

export interface CCVTerm {
  id: string;
  canonical_name: string;
  definition: string | null;
  domain: string | null;
  parent_id: string | null;
  status: 'pending' | 'approved' | 'deprecated' | 'rejected';
  source: string | null;
  confidence: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CCVSynonym {
  id: string;
  term_id: string;
  synonym: string;
  source: string | null;
  data_source_id: string | null;
  confidence: number;
  status: string;
  created_at: string;
}

export interface CCVSuggestion {
  id: string;
  suggestion_type: 'new_term' | 'synonym' | 'hierarchy' | 'merge' | 'definition';
  status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
  confidence: number;
  suggested_value: string;
  context: string | null;
  term_id: string | null;
  parent_term_id: string | null;
  source_entity_id: string | null;
  source_data_source: string | null;
  source_text: string | null;
  llm_reasoning: string | null;
  alternative_suggestions: string[];
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
}

export interface HierarchyNode {
  term: CCVTerm;
  children: HierarchyNode[];
  synonym_count: number;
  usage_count: number;
}

export interface TermWithDetails extends CCVTerm {
  synonyms: CCVSynonym[];
  children: CCVTerm[];
  parent: CCVTerm | null;
}

// Terms API
export async function listTerms(params?: {
  domain?: string;
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<CCVTerm[]> {
  const searchParams = new URLSearchParams();
  if (params?.domain) searchParams.set('domain', params.domain);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.page_size) searchParams.set('page_size', params.page_size.toString());

  const response = await fetch(`/api/ccv/terms?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch terms');
  return response.json();
}

export async function getTerm(termId: string): Promise<TermWithDetails> {
  const response = await fetch(`/api/ccv/terms/${termId}`);
  if (!response.ok) throw new Error('Failed to fetch term');
  return response.json();
}

export async function createTerm(data: {
  canonical_name: string;
  definition?: string;
  domain?: string;
  parent_id?: string;
}): Promise<CCVTerm> {
  const response = await fetch('/api/ccv/terms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create term');
  return response.json();
}

export async function updateTerm(
  termId: string,
  data: Partial<{
    canonical_name: string;
    definition: string;
    domain: string;
    parent_id: string | null;
    status: string;
  }>
): Promise<CCVTerm> {
  const response = await fetch(`/api/ccv/terms/${termId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update term');
  return response.json();
}

export async function deleteTerm(termId: string): Promise<void> {
  const response = await fetch(`/api/ccv/terms/${termId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete term');
}

export async function searchTerms(query: string, domain?: string): Promise<CCVTerm[]> {
  const searchParams = new URLSearchParams({ q: query });
  if (domain) searchParams.set('domain', domain);

  const response = await fetch(`/api/ccv/terms/search?${searchParams}`);
  if (!response.ok) throw new Error('Failed to search terms');
  return response.json();
}

// Synonyms API
export async function addSynonym(
  termId: string,
  synonym: string
): Promise<CCVSynonym> {
  const response = await fetch(`/api/ccv/terms/${termId}/synonyms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ synonym }),
  });
  if (!response.ok) throw new Error('Failed to add synonym');
  return response.json();
}

export async function removeSynonym(termId: string, synonymId: string): Promise<void> {
  const response = await fetch(
    `/api/ccv/terms/${termId}/synonyms/${synonymId}`,
    { method: 'DELETE' }
  );
  if (!response.ok) throw new Error('Failed to remove synonym');
}

// Suggestions API
export async function listSuggestions(params?: {
  status?: string;
  suggestion_type?: string;
  page?: number;
  page_size?: number;
}): Promise<CCVSuggestion[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.suggestion_type) searchParams.set('suggestion_type', params.suggestion_type);
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.page_size) searchParams.set('page_size', params.page_size.toString());

  const response = await fetch(`/api/ccv/suggestions?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch suggestions');
  return response.json();
}

export async function getPendingSuggestions(): Promise<CCVSuggestion[]> {
  const response = await fetch('/api/ccv/suggestions/pending');
  if (!response.ok) throw new Error('Failed to fetch pending suggestions');
  return response.json();
}

export async function reviewSuggestion(
  suggestionId: string,
  action: 'approve' | 'reject',
  notes?: string,
  modified_value?: string
): Promise<CCVSuggestion> {
  const response = await fetch(`/api/ccv/suggestions/${suggestionId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, notes, modified_value }),
  });
  if (!response.ok) throw new Error('Failed to review suggestion');
  return response.json();
}

export async function batchReviewSuggestions(
  suggestionIds: string[],
  action: 'approve' | 'reject'
): Promise<{ reviewed: number; total: number }> {
  const response = await fetch('/api/ccv/suggestions/batch-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suggestion_ids: suggestionIds, action }),
  });
  if (!response.ok) throw new Error('Failed to batch review suggestions');
  return response.json();
}

// Hierarchy API
export async function getHierarchy(params?: {
  domain?: string;
  max_depth?: number;
}): Promise<HierarchyNode[]> {
  const searchParams = new URLSearchParams();
  if (params?.domain) searchParams.set('domain', params.domain);
  if (params?.max_depth) searchParams.set('max_depth', params.max_depth.toString());

  const response = await fetch(`/api/ccv/hierarchy?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch hierarchy');
  return response.json();
}

export async function getHierarchyStats(): Promise<{
  total_terms: number;
  root_terms: number;
  max_depth: number;
  domains: string[];
}> {
  const response = await fetch('/api/ccv/hierarchy/stats');
  if (!response.ok) throw new Error('Failed to fetch hierarchy stats');
  return response.json();
}

export async function moveTerm(termId: string, newParentId: string | null): Promise<CCVTerm> {
  const response = await fetch(`/api/ccv/hierarchy/${termId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_parent_id: newParentId }),
  });
  if (!response.ok) throw new Error('Failed to move term');
  return response.json();
}

export async function getAncestors(termId: string): Promise<CCVTerm[]> {
  const response = await fetch(`/api/ccv/hierarchy/${termId}/ancestors`);
  if (!response.ok) throw new Error('Failed to fetch ancestors');
  return response.json();
}

export async function getDescendants(termId: string): Promise<CCVTerm[]> {
  const response = await fetch(`/api/ccv/hierarchy/${termId}/descendants`);
  if (!response.ok) throw new Error('Failed to fetch descendants');
  return response.json();
}

// Extraction API
export async function extractTermsFromText(data: {
  text: string;
  context?: string;
  domain?: string;
}): Promise<{ suggestion_count: number; suggestions: CCVSuggestion[] }> {
  const response = await fetch('/api/ccv/extraction/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to extract terms');
  return response.json();
}

export async function analyzeVocabularyCoverage(data: {
  text: string;
  domain?: string;
}): Promise<{
  total_unique_words: number;
  matched_terms: number;
  unmatched_words: number;
  coverage_percentage: number;
  matched_examples: string[];
  unmatched_examples: string[];
}> {
  const response = await fetch('/api/ccv/extraction/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to analyze coverage');
  return response.json();
}
