'use client';

import { useState } from 'react';
import { Search, Plus, ChevronRight, Tag, FileText, MoreVertical } from 'lucide-react';
import { useTerms, useSearchTerms, useDeleteTerm } from '@/hooks/use-ccv';
import { CCVTerm } from '@/lib/api/ccv';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface TermBrowserProps {
  onSelectTerm: (term: CCVTerm) => void;
  onCreateTerm: () => void;
  selectedTermId?: string;
}

export function TermBrowser({ onSelectTerm, onCreateTerm, selectedTermId }: TermBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>('approved');

  const { data: terms, isLoading } = useTerms({
    domain: domainFilter,
    status: statusFilter,
  });
  const { data: searchResults } = useSearchTerms(searchQuery, domainFilter);
  const deleteTerm = useDeleteTerm();

  const displayTerms = searchQuery.length >= 2 ? searchResults : terms;

  const handleDelete = async (termId: string) => {
    if (confirm('Are you sure you want to delete this term?')) {
      await deleteTerm.mutateAsync(termId);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Vocabulary Terms
          </h2>
          <button
            onClick={onCreateTerm}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Term
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="deprecated">Deprecated</option>
            <option value="">All Status</option>
          </select>
          <select
            value={domainFilter || ''}
            onChange={(e) => setDomainFilter(e.target.value || undefined)}
            className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All Domains</option>
            <option value="security">Security</option>
            <option value="compliance">Compliance</option>
            <option value="technical">Technical</option>
          </select>
        </div>
      </div>

      {/* Term List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : displayTerms?.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No terms found</div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {displayTerms?.map((term) => (
              <li
                key={term.id}
                className={`group hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  selectedTermId === term.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <button
                  onClick={() => onSelectTerm(term)}
                  className="w-full p-3 text-left flex items-start gap-3"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <Tag className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {term.canonical_name}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-xs rounded ${
                          term.status === 'approved'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : term.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {term.status}
                      </span>
                    </div>
                    {term.definition && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {term.definition}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      {term.domain && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {term.domain}
                        </span>
                      )}
                      <span>Used {term.usage_count} times</span>
                    </div>
                  </div>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        className="min-w-[120px] bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1"
                        sideOffset={5}
                      >
                        <DropdownMenu.Item
                          className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer outline-none"
                          onClick={() => onSelectTerm(term)}
                        >
                          Edit
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer outline-none"
                          onClick={() => handleDelete(term.id)}
                        >
                          Delete
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
