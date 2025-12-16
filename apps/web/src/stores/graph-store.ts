import { create } from 'zustand';
import { Node, Edge, NodeChange, EdgeChange, applyNodeChanges, applyEdgeChanges } from 'reactflow';

export interface GraphNode extends Node {
  data: {
    label: string;
    type: string;
    properties: Record<string, unknown>;
    dataSource?: string;
    classification?: string;
  };
}

export interface GraphEdge extends Edge {
  data?: {
    label: string;
    type: string;
    properties: Record<string, unknown>;
    weight?: number;
  };
}

// API response types
interface ApiEntity {
  id: string;
  name: string;
  type: string;
  properties: Record<string, unknown>;
  data_source?: string;
  classification?: string;
}

interface ApiRelationship {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  properties: Record<string, unknown>;
  weight?: number;
}

interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isLoading: boolean;
  error: string | null;

  // Layout settings
  layout: 'force' | 'hierarchical' | 'radial' | 'dagre';
  showLabels: boolean;
  showMinimap: boolean;

  // Actions
  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: GraphEdge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addNode: (node: GraphNode) => void;
  addEdge: (edge: GraphEdge) => void;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setSelectedEdge: (edgeId: string | null) => void;
  setLayout: (layout: GraphState['layout']) => void;
  toggleLabels: () => void;
  toggleMinimap: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearGraph: () => void;

  // Query-related
  expandNode: (nodeId: string, depth?: number) => Promise<void>;
  searchAndVisualize: (query: string) => Promise<void>;
}

// Convert API entity to ReactFlow node
function entityToNode(entity: ApiEntity, index: number): GraphNode {
  // Position nodes in a grid pattern initially
  const cols = 5;
  const spacing = 200;
  const row = Math.floor(index / cols);
  const col = index % cols;

  return {
    id: entity.id,
    type: entity.type?.toLowerCase() || 'entity',
    position: { x: col * spacing + Math.random() * 50, y: row * spacing + Math.random() * 50 },
    data: {
      label: entity.name,
      type: entity.type || 'Unknown',
      properties: entity.properties || {},
      dataSource: entity.data_source,
      classification: entity.classification,
    },
  };
}

// Convert API relationship to ReactFlow edge
function relationshipToEdge(rel: ApiRelationship): GraphEdge {
  return {
    id: rel.id,
    source: rel.source_id,
    target: rel.target_id,
    label: rel.type,
    animated: false,
    style: { strokeWidth: 2 },
    data: {
      label: rel.type || 'RELATED_TO',
      type: rel.type || 'RELATED_TO',
      properties: rel.properties || {},
      weight: rel.weight,
    },
  };
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  isLoading: false,
  error: null,
  layout: 'force',
  showLabels: true,
  showMinimap: true,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as GraphNode[],
    })),

  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges) as GraphEdge[],
    })),

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
    })),

  addEdge: (edge) =>
    set((state) => ({
      edges: [...state.edges, edge],
    })),

  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    })),

  removeEdge: (edgeId) =>
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
    })),

  setSelectedNode: (selectedNodeId) => set({ selectedNodeId, selectedEdgeId: null }),
  setSelectedEdge: (selectedEdgeId) => set({ selectedEdgeId, selectedNodeId: null }),
  setLayout: (layout) => set({ layout }),
  toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
  toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  clearGraph: () =>
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
    }),

  expandNode: async (nodeId: string, depth = 1) => {
    const { setLoading, setError, nodes, edges, setNodes, setEdges } = get();
    setLoading(true);
    setError(null);

    try {
      const authStore = await import('./auth-store').then(m => m.useAuthStore.getState());
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (authStore.accessToken) {
        headers['Authorization'] = `Bearer ${authStore.accessToken}`;
      }

      const response = await fetch(`/api/graph/expand/${nodeId}?depth=${depth}`, { headers });
      if (!response.ok) throw new Error('Failed to expand node');

      const data = await response.json();

      // Convert API response to ReactFlow format
      const existingNodeIds = new Set(nodes.map((n) => n.id));
      const existingEdgeIds = new Set(edges.map((e) => e.id));

      const newNodes = (data.nodes || [])
        .filter((n: ApiEntity) => !existingNodeIds.has(n.id))
        .map((n: ApiEntity, i: number) => entityToNode(n, nodes.length + i));

      const newEdges = (data.edges || [])
        .filter((e: ApiRelationship) => !existingEdgeIds.has(e.id))
        .map(relationshipToEdge);

      setNodes([...nodes, ...newNodes]);
      setEdges([...edges, ...newEdges]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  },

  searchAndVisualize: async (query: string) => {
    const { setLoading, setError, setNodes, setEdges } = get();
    setLoading(true);
    setError(null);

    try {
      const authStore = await import('./auth-store').then(m => m.useAuthStore.getState());
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (authStore.accessToken) {
        headers['Authorization'] = `Bearer ${authStore.accessToken}`;
      }

      const response = await fetch('/api/graph/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, limit: 100 }),
      });

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();

      // Convert API response to ReactFlow format
      const graphNodes = (data.nodes || []).map((n: ApiEntity, i: number) => entityToNode(n, i));
      const graphEdges = (data.edges || []).map(relationshipToEdge);

      setNodes(graphNodes);
      setEdges(graphEdges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  },
}));
