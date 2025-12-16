'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Building2, FileText, User, Lightbulb, Box } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGraphStore } from '@/stores/graph-store';

interface EntityNodeData {
  label: string;
  type: 'entity' | 'concept' | 'document' | 'person' | 'organization';
  properties: Record<string, unknown>;
  dataSource?: string;
  classification?: string;
}

const nodeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  entity: Box,
  concept: Lightbulb,
  document: FileText,
  person: User,
  organization: Building2,
};

const nodeColors: Record<string, string> = {
  entity: 'bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300',
  concept: 'bg-green-500/10 border-green-500 text-green-700 dark:text-green-300',
  document: 'bg-yellow-500/10 border-yellow-500 text-yellow-700 dark:text-yellow-300',
  person: 'bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-300',
  organization: 'bg-cyan-500/10 border-cyan-500 text-cyan-700 dark:text-cyan-300',
};

export const EntityNode = memo(function EntityNode({
  data,
  selected,
}: NodeProps<EntityNodeData>) {
  const showLabels = useGraphStore((state) => state.showLabels);
  const Icon = nodeIcons[data.type] || Box;
  const colorClass = nodeColors[data.type] || nodeColors.entity;

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-muted-foreground"
      />

      <div
        className={cn(
          'rounded-lg border-2 shadow-sm transition-all duration-200',
          showLabels ? 'px-4 py-3 min-w-[120px] max-w-[200px]' : 'p-2',
          colorClass,
          selected && 'ring-2 ring-ring ring-offset-2 ring-offset-background shadow-lg'
        )}
        title={data.label}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn('flex-shrink-0', showLabels ? 'h-4 w-4' : 'h-5 w-5')} />
          {showLabels && (
            <span className="font-medium text-sm truncate">{data.label}</span>
          )}
        </div>

        {showLabels && data.classification && (
          <div className="mt-1">
            <span className="text-xs px-1.5 py-0.5 rounded bg-background/50 text-muted-foreground">
              {data.classification}
            </span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-muted-foreground"
      />
    </>
  );
});
