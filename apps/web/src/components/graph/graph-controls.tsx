'use client';

import { useState, useMemo } from 'react';
import { useGraphStore } from '@/stores/graph-store';
import {
  LayoutGrid,
  GitBranch,
  Circle,
  Network,
  Tag,
  Map,
  Trash2,
  Search,
  Download,
  Loader2,
  Target,
  Waypoints,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Highlighter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRelationshipColor } from './edges/relationship-edge';

const layouts = [
  { id: 'force', label: 'Force', icon: Network },
  { id: 'hierarchical', label: 'Hierarchical', icon: GitBranch },
  { id: 'radial', label: 'Radial', icon: Circle },
  { id: 'dagre', label: 'Grid', icon: LayoutGrid },
  { id: 'hub', label: 'Hub & Spoke', icon: Target },
  { id: 'cluster', label: 'Clusters', icon: Waypoints },
] as const;

export function GraphControls() {
  const {
    layout,
    setLayout,
    showLabels,
    toggleLabels,
    showMinimap,
    toggleMinimap,
    clearGraph,
    searchAndVisualize,
    isLoading,
    nodes,
    edges,
    relationshipTypes,
    activeRelationshipFilters,
    toggleRelationshipFilter,
    clearRelationshipFilters,
    setSearchHighlight,
    clearSearchHighlight,
    highlightedNodeIds,
    searchHighlightQuery,
  } = useGraphStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [highlightQuery, setHighlightQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Count edges per relationship type
  const edgeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    edges.forEach((edge) => {
      const type = edge.data?.type || 'RELATED_TO';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [edges]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      await searchAndVisualize(searchQuery);
    }
  };

  const loadAllEntities = async () => {
    // Search with empty string or wildcard to get all entities
    await searchAndVisualize('*');
  };

  const handleHighlight = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchHighlight(highlightQuery);
  };

  const handleClearHighlight = () => {
    setHighlightQuery('');
    clearSearchHighlight();
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 space-y-3 min-w-[300px] max-h-[80vh] overflow-y-auto">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !searchQuery.trim()}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
        >
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
        </button>
      </form>

      {/* Quick actions */}
      <div className="flex gap-2">
        <button
          onClick={loadAllEntities}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm border border-input rounded-md hover:bg-accent disabled:opacity-50"
        >
          <Download className="h-3 w-3" />
          Load All
        </button>
        <button
          onClick={clearGraph}
          disabled={nodes.length === 0}
          className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm border border-input rounded-md hover:bg-destructive hover:text-destructive-foreground hover:border-destructive disabled:opacity-50"
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </button>
      </div>

      <div className="h-px bg-border" />

      {/* Layout selection */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Layout</p>
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
      </div>

      {/* Toggle buttons */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Display</p>
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
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Highlight search */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Highlight Nodes</p>
        <form onSubmit={handleHighlight} className="flex gap-2">
          <div className="flex-1 relative">
            <Highlighter className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Highlight matching..."
              value={highlightQuery}
              onChange={(e) => setHighlightQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {searchHighlightQuery ? (
            <button
              type="button"
              onClick={handleClearHighlight}
              className="px-2 py-1.5 text-sm border border-input rounded-md hover:bg-accent"
              title="Clear highlight"
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!highlightQuery.trim()}
              className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-50"
            >
              <Highlighter className="h-3 w-3" />
            </button>
          )}
        </form>
        {highlightedNodeIds.size > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            {highlightedNodeIds.size} node{highlightedNodeIds.size !== 1 ? 's' : ''} highlighted
          </p>
        )}
      </div>

      {/* Relationship filters */}
      {relationshipTypes.length > 0 && (
        <>
          <div className="h-px bg-border" />
          <div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground"
            >
              <span className="flex items-center gap-1">
                <Filter className="h-3 w-3" />
                Relationship Filters
                {activeRelationshipFilters.size > 0 && (
                  <span className="bg-primary text-primary-foreground px-1.5 rounded-full text-[10px]">
                    {activeRelationshipFilters.size}
                  </span>
                )}
              </span>
              {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showFilters && (
              <div className="mt-2 space-y-1">
                {activeRelationshipFilters.size > 0 && (
                  <button
                    onClick={clearRelationshipFilters}
                    className="text-xs text-muted-foreground hover:text-foreground underline mb-1"
                  >
                    Clear all filters
                  </button>
                )}
                {relationshipTypes.map((type) => {
                  const colors = getRelationshipColor(type);
                  const isActive = activeRelationshipFilters.has(type);
                  const count = edgeCounts[type] || 0;

                  return (
                    <button
                      key={type}
                      onClick={() => toggleRelationshipFilter(type)}
                      className={cn(
                        'w-full flex items-center justify-between px-2 py-1 rounded text-xs transition-colors',
                        isActive
                          ? 'bg-primary/10 border border-primary'
                          : 'hover:bg-accent border border-transparent'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-0.5 rounded"
                          style={{ backgroundColor: colors.stroke }}
                        />
                        <span className={isActive ? 'font-medium' : ''}>{type}</span>
                      </span>
                      <span className="text-muted-foreground">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Stats */}
      {nodes.length > 0 && (
        <>
          <div className="h-px bg-border" />
          <div className="text-xs text-muted-foreground">
            {nodes.length} nodes, {edges.length} edges
            {activeRelationshipFilters.size > 0 && (
              <span className="text-primary ml-1">
                (filtered)
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
