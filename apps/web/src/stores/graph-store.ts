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

// Layout algorithms
function applyGridLayout(nodes: GraphNode[]): GraphNode[] {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const spacing = 200;
  return nodes.map((node, i) => ({
    ...node,
    position: {
      x: (i % cols) * spacing,
      y: Math.floor(i / cols) * spacing,
    },
  }));
}

function applyRadialLayout(nodes: GraphNode[]): GraphNode[] {
  if (nodes.length === 0) return nodes;
  const centerX = 400;
  const centerY = 300;
  const radius = Math.max(150, nodes.length * 20);
  const angleStep = (2 * Math.PI) / nodes.length;

  return nodes.map((node, i) => ({
    ...node,
    position: {
      x: centerX + radius * Math.cos(i * angleStep - Math.PI / 2),
      y: centerY + radius * Math.sin(i * angleStep - Math.PI / 2),
    },
  }));
}

function applyHierarchicalLayout(nodes: GraphNode[]): GraphNode[] {
  // Group nodes by type
  const typeGroups: Record<string, GraphNode[]> = {};
  nodes.forEach((node) => {
    const type = node.data.type || 'Unknown';
    if (!typeGroups[type]) typeGroups[type] = [];
    typeGroups[type].push(node);
  });

  const types = Object.keys(typeGroups);
  const rowHeight = 150;
  const colSpacing = 180;
  const result: GraphNode[] = [];

  types.forEach((type, rowIndex) => {
    const group = typeGroups[type];
    const startX = -(group.length * colSpacing) / 2 + 400;
    group.forEach((node, colIndex) => {
      result.push({
        ...node,
        position: {
          x: startX + colIndex * colSpacing,
          y: rowIndex * rowHeight + 50,
        },
      });
    });
  });

  return result;
}

function applyForceLayout(nodes: GraphNode[]): GraphNode[] {
  // Simple force-directed approximation without d3-force
  // Spread nodes out with some randomness
  const centerX = 400;
  const centerY = 300;
  const spread = Math.max(200, nodes.length * 30);

  return nodes.map((node, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI + Math.random() * 0.5;
    const distance = (spread / 2) * (0.5 + Math.random() * 0.5);
    return {
      ...node,
      position: {
        x: centerX + distance * Math.cos(angle),
        y: centerY + distance * Math.sin(angle),
      },
    };
  });
}

function applyLayout(
  nodes: GraphNode[],
  layout: 'force' | 'hierarchical' | 'radial' | 'dagre'
): GraphNode[] {
  switch (layout) {
    case 'radial':
      return applyRadialLayout(nodes);
    case 'hierarchical':
      return applyHierarchicalLayout(nodes);
    case 'force':
      return applyForceLayout(nodes);
    case 'dagre':
    default:
      return applyGridLayout(nodes);
  }
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
  setLayout: (layout) =>
    set((state) => ({
      layout,
      nodes: applyLayout(state.nodes, layout),
    })),
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
      const { layout } = get();

      // Convert API response to ReactFlow format
      const graphNodes = (data.nodes || []).map((n: ApiEntity, i: number) => entityToNode(n, i));
      const graphEdges = (data.edges || []).map(relationshipToEdge);

      // Apply current layout to nodes
      setNodes(applyLayout(graphNodes, layout));
      setEdges(graphEdges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  },
}));
