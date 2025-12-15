'use client';

import { useState, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Tag,
  FolderTree,
  GripVertical,
  BarChart3,
} from 'lucide-react';
import { useHierarchy, useHierarchyStats, useMoveTerm } from '@/hooks/use-ccv';
import { HierarchyNode, CCVTerm } from '@/lib/api/ccv';

interface HierarchyTreeProps {
  onSelectTerm: (term: CCVTerm) => void;
  selectedTermId?: string;
}

export function HierarchyTree({ onSelectTerm, selectedTermId }: HierarchyTreeProps) {
  const [domain, setDomain] = useState<string | undefined>();
  const [maxDepth, setMaxDepth] = useState(5);
  const [draggedTermId, setDraggedTermId] = useState<string | null>(null);

  const { data: hierarchy, isLoading } = useHierarchy({ domain, max_depth: maxDepth });
  const { data: stats } = useHierarchyStats();
  const moveTerm = useMoveTerm();

  const handleDragStart = useCallback((termId: string) => {
    setDraggedTermId(termId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTermId(null);
  }, []);

  const handleDrop = useCallback(
    async (targetTermId: string | null) => {
      if (!draggedTermId || draggedTermId === targetTermId) return;

      await moveTerm.mutateAsync({
        termId: draggedTermId,
        newParentId: targetTermId,
      });
      setDraggedTermId(null);
    },
    [draggedTermId, moveTerm]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Term Hierarchy
            </h2>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-4 mb-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              {stats.total_terms} terms
            </span>
            <span>{stats.root_terms} root</span>
            <span>Depth: {stats.max_depth}</span>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={domain || ''}
            onChange={(e) => setDomain(e.target.value || undefined)}
            className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All Domains</option>
            {stats?.domains.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={maxDepth}
            onChange={(e) => setMaxDepth(Number(e.target.value))}
            className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value={3}>Depth: 3</option>
            <option value={5}>Depth: 5</option>
            <option value={10}>Depth: 10</option>
          </select>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading hierarchy...</div>
        ) : hierarchy?.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No terms in hierarchy</div>
        ) : (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(null)}
            className="min-h-[100px]"
          >
            {hierarchy?.map((node) => (
              <TreeNode
                key={node.term.id}
                node={node}
                depth={0}
                selectedTermId={selectedTermId}
                draggedTermId={draggedTermId}
                onSelect={onSelectTerm}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TreeNodeProps {
  node: HierarchyNode;
  depth: number;
  selectedTermId?: string;
  draggedTermId: string | null;
  onSelect: (term: CCVTerm) => void;
  onDragStart: (termId: string) => void;
  onDragEnd: () => void;
  onDrop: (targetTermId: string | null) => void;
}

function TreeNode({
  node,
  depth,
  selectedTermId,
  draggedTermId,
  onSelect,
  onDragStart,
  onDragEnd,
  onDrop,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const [isDragOver, setIsDragOver] = useState(false);

  const hasChildren = node.children.length > 0;
  const isSelected = selectedTermId === node.term.id;
  const isDragging = draggedTermId === node.term.id;

  return (
    <div
      className={`${isDragging ? 'opacity-50' : ''}`}
      style={{ marginLeft: depth * 16 }}
    >
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', node.term.id);
          onDragStart(node.term.id);
        }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          onDrop(node.term.id);
        }}
        className={`group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
          isSelected
            ? 'bg-blue-100 dark:bg-blue-900/30'
            : isDragOver
            ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-400'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        {/* Drag Handle */}
        <GripVertical className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab" />

        {/* Expand/Collapse */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )
          ) : (
            <span className="w-4 h-4" />
          )}
        </button>

        {/* Term Icon */}
        <Tag className="w-4 h-4 text-gray-400" />

        {/* Term Name */}
        <button
          onClick={() => onSelect(node.term)}
          className="flex-1 text-left text-sm text-gray-900 dark:text-white truncate"
        >
          {node.term.canonical_name}
        </button>

        {/* Stats */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {node.synonym_count > 0 && <span>{node.synonym_count} syn</span>}
          {node.usage_count > 0 && <span>{node.usage_count} uses</span>}
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.term.id}
              node={child}
              depth={depth + 1}
              selectedTermId={selectedTermId}
              draggedTermId={draggedTermId}
              onSelect={onSelect}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}
