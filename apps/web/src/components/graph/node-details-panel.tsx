'use client';

import { X, ExternalLink, GitFork, Trash2, Edit2 } from 'lucide-react';
import { GraphNode } from '@/stores/graph-store';
import { useAuthStore } from '@/stores/auth-store';

interface NodeDetailsPanelProps {
  node: GraphNode;
  onClose: () => void;
}

export function NodeDetailsPanel({ node, onClose }: NodeDetailsPanelProps) {
  const { hasPermission } = useAuthStore();
  const canEdit = hasPermission('graph:entity:update');
  const canDelete = hasPermission('graph:entity:delete');

  return (
    <div className="bg-card border border-border rounded-lg shadow-xl h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
            {node.data.type}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
        <div>
          <h3 className="text-lg font-semibold">{node.data.label}</h3>
          {node.data.dataSource && (
            <p className="text-sm text-muted-foreground">Source: {node.data.dataSource}</p>
          )}
        </div>

        {/* Classification */}
        {node.data.classification && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Classification
            </label>
            <p className="text-sm mt-1">
              <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 font-medium">
                {node.data.classification}
              </span>
            </p>
          </div>
        )}

        {/* Properties */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Properties
          </label>
          <div className="mt-2 space-y-2">
            {Object.entries(node.data.properties || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{key}</span>
                <span className="font-medium truncate ml-2 max-w-[60%]">
                  {String(value)}
                </span>
              </div>
            ))}
            {Object.keys(node.data.properties || {}).length === 0 && (
              <p className="text-sm text-muted-foreground italic">No properties</p>
            )}
          </div>
        </div>

        {/* Node ID */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Node ID
          </label>
          <p className="text-sm font-mono mt-1 text-muted-foreground">{node.id}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
          <GitFork className="h-4 w-4" />
          Expand Relationships
        </button>

        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors">
            <ExternalLink className="h-4 w-4" />
            View Details
          </button>

          {canEdit && (
            <button className="flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors">
              <Edit2 className="h-4 w-4" />
            </button>
          )}

          {canDelete && (
            <button className="flex items-center justify-center gap-2 px-4 py-2 border border-destructive text-destructive rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
