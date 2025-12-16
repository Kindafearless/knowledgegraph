'use client';

import { useState } from 'react';
import { useLinkedEntities } from '@/hooks/use-ccv';
import {
  Box,
  FileText,
  User,
  Building2,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Database,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface LinkedEntitiesProps {
  termId: string;
  className?: string;
}

const entityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  entity: Box,
  concept: Lightbulb,
  document: FileText,
  person: User,
  organization: Building2,
};

const mappingTypeLabels: Record<string, { label: string; color: string }> = {
  exact: { label: 'Exact', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  broad: { label: 'Broad', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  narrow: { label: 'Narrow', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  related: { label: 'Related', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300' },
};

export function LinkedEntities({ termId, className }: LinkedEntitiesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, isLoading, error } = useLinkedEntities(termId, { pageSize: 10 });

  if (isLoading) {
    return (
      <div className={cn('border border-border rounded-lg p-4', className)}>
        <div className="animate-pulse flex items-center gap-2">
          <div className="h-4 w-4 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { entities, total } = data;

  if (total === 0) {
    return (
      <div className={cn('border border-border rounded-lg p-4 bg-muted/30', className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Database className="h-4 w-4" />
          <span>No linked entities</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('border border-border rounded-lg overflow-hidden', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-card hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Linked Entities</span>
          <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
            {total}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-border divide-y divide-border">
          {entities.map(({ entity, mapping_type, mapping_confidence, is_verified }) => {
            const Icon = entityIcons[entity.type?.toLowerCase()] || Box;
            const mappingInfo = mappingTypeLabels[mapping_type] || mappingTypeLabels.related;

            return (
              <div
                key={entity.id}
                className="p-3 flex items-start gap-3 hover:bg-accent/30 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{entity.name}</span>
                    {is_verified && (
                      <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground capitalize">
                      {entity.type}
                    </span>
                    {entity.data_source && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        {entity.data_source}
                      </span>
                    )}
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded', mappingInfo.color)}>
                      {mappingInfo.label} ({Math.round(mapping_confidence * 100)}%)
                    </span>
                  </div>
                </div>

                <Link
                  href={`/graph?entity=${entity.id}`}
                  className="flex-shrink-0 p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="View in Graph"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}

          {total > entities.length && (
            <div className="p-3 text-center">
              <Link
                href={`/data-sources/explore?term_id=${termId}`}
                className="text-xs text-primary hover:underline"
              >
                View all {total} linked entities →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
