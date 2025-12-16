'use client';

import { memo } from 'react';
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from 'reactflow';
import { cn } from '@/lib/utils';
import { useGraphStore } from '@/stores/graph-store';

// Color mapping for relationship types
export const relationshipColors: Record<string, { stroke: string; label: string }> = {
  // Common relationship types
  RELATED_TO: { stroke: '#6b7280', label: 'text-gray-600 dark:text-gray-400' },
  BELONGS_TO: { stroke: '#3b82f6', label: 'text-blue-600 dark:text-blue-400' },
  CONTAINS: { stroke: '#22c55e', label: 'text-green-600 dark:text-green-400' },
  HAS: { stroke: '#8b5cf6', label: 'text-violet-600 dark:text-violet-400' },
  OWNS: { stroke: '#f59e0b', label: 'text-amber-600 dark:text-amber-400' },
  MANAGES: { stroke: '#ef4444', label: 'text-red-600 dark:text-red-400' },
  REPORTS_TO: { stroke: '#ec4899', label: 'text-pink-600 dark:text-pink-400' },
  WORKS_FOR: { stroke: '#14b8a6', label: 'text-teal-600 dark:text-teal-400' },
  CREATED_BY: { stroke: '#f97316', label: 'text-orange-600 dark:text-orange-400' },
  DEPENDS_ON: { stroke: '#06b6d4', label: 'text-cyan-600 dark:text-cyan-400' },
  REFERENCES: { stroke: '#a855f7', label: 'text-purple-600 dark:text-purple-400' },
  PART_OF: { stroke: '#84cc16', label: 'text-lime-600 dark:text-lime-400' },
  INSTANCE_OF: { stroke: '#0ea5e9', label: 'text-sky-600 dark:text-sky-400' },
  CONNECTED_TO: { stroke: '#64748b', label: 'text-slate-600 dark:text-slate-400' },
  LINKS_TO: { stroke: '#78716c', label: 'text-stone-600 dark:text-stone-400' },
};

// Get color for a relationship type (case-insensitive with fallback)
export function getRelationshipColor(type: string): { stroke: string; label: string } {
  const normalizedType = type?.toUpperCase().replace(/[\s-]/g, '_') || 'RELATED_TO';
  return relationshipColors[normalizedType] || relationshipColors.RELATED_TO;
}

interface RelationshipEdgeData {
  label: string;
  type: string;
  properties: Record<string, unknown>;
  weight?: number;
}

export const RelationshipEdge = memo(function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<RelationshipEdgeData>) {
  const showLabels = useGraphStore((state) => state.showLabels);
  const selectedEdgeId = useGraphStore((state) => state.selectedEdgeId);

  const isSelected = selected || selectedEdgeId === id;
  const relationType = data?.type || 'RELATED_TO';
  const colors = getRelationshipColor(relationType);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: colors.stroke,
          strokeWidth: isSelected ? 3 : 2,
          opacity: isSelected ? 1 : 0.7,
        }}
      />

      {/* Hover/selection highlight */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="cursor-pointer"
      />

      {showLabels && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={cn(
              'px-2 py-0.5 rounded text-xs font-medium',
              'bg-background/90 border border-border shadow-sm',
              'transition-all duration-200',
              colors.label,
              isSelected && 'ring-2 ring-ring ring-offset-1 ring-offset-background'
            )}
          >
            {data?.label || relationType}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

// Export list of all known relationship types for filtering
export const RELATIONSHIP_TYPES = Object.keys(relationshipColors);
