'use client';

import { useGraphStore } from '@/stores/graph-store';
import {
  LayoutGrid,
  GitBranch,
  Circle,
  Network,
  Tag,
  Map,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const layouts = [
  { id: 'force', label: 'Force', icon: Network },
  { id: 'hierarchical', label: 'Hierarchical', icon: GitBranch },
  { id: 'radial', label: 'Radial', icon: Circle },
  { id: 'dagre', label: 'DAG', icon: LayoutGrid },
] as const;

export function GraphControls() {
  const { layout, setLayout, showLabels, toggleLabels, showMinimap, toggleMinimap, clearGraph } =
    useGraphStore();

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-2 space-y-2">
      {/* Layout selection */}
      <div className="flex gap-1">
        {layouts.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setLayout(id)}
            className={cn(
              'p-2 rounded-md transition-colors',
              layout === id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent text-muted-foreground hover:text-foreground'
            )}
            title={label}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      <div className="h-px bg-border" />

      {/* Toggle buttons */}
      <div className="flex gap-1">
        <button
          onClick={toggleLabels}
          className={cn(
            'p-2 rounded-md transition-colors',
            showLabels
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent text-muted-foreground hover:text-foreground'
          )}
          title="Toggle labels"
        >
          <Tag className="h-4 w-4" />
        </button>

        <button
          onClick={toggleMinimap}
          className={cn(
            'p-2 rounded-md transition-colors',
            showMinimap
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent text-muted-foreground hover:text-foreground'
          )}
          title="Toggle minimap"
        >
          <Map className="h-4 w-4" />
        </button>

        <button
          onClick={clearGraph}
          className="p-2 rounded-md transition-colors hover:bg-destructive hover:text-destructive-foreground text-muted-foreground"
          title="Clear graph"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
