'use client';

import { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useGraphStore, GraphNode } from '@/stores/graph-store';
import { EntityNode } from './nodes/entity-node';
import { GraphControls } from './graph-controls';
import { NodeDetailsPanel } from './node-details-panel';

const nodeTypes = {
  entity: EntityNode,
  concept: EntityNode,
  document: EntityNode,
  person: EntityNode,
  organization: EntityNode,
};

export function GraphExplorer() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    selectedNodeId,
    setSelectedNode,
    setSelectedEdge,
    showMinimap,
    expandNode,
    isLoading,
  } = useGraphStore();

  const { fitView } = useReactFlow();

  // Auto-fit view when nodes change significantly
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    }
  }, [nodes.length, fitView]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: GraphNode) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: { id: string }) => {
      setSelectedEdge(edge.id);
    },
    [setSelectedEdge]
  );

  const onNodeDoubleClick = useCallback(
    async (_event: React.MouseEvent, node: GraphNode) => {
      await expandNode(node.id, 1);
    },
    [expandNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [setSelectedNode, setSelectedEdge]);

  // Memoize node colors for minimap
  const nodeColor = useCallback((node: GraphNode) => {
    const colors: Record<string, string> = {
      entity: '#3b82f6',
      concept: '#22c55e',
      document: '#eab308',
      person: '#a855f7',
      organization: '#06b6d4',
    };
    return colors[node.data?.type] || '#6b7280';
  }, []);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          animated: false,
          style: { strokeWidth: 2 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls showInteractive={false} />

        {showMinimap && (
          <MiniMap
            nodeColor={nodeColor}
            maskColor="rgba(0, 0, 0, 0.1)"
            className="!bg-card"
          />
        )}

        <Panel position="top-left">
          <GraphControls />
        </Panel>

        {isLoading && (
          <Panel position="top-center">
            <div className="bg-card border border-border rounded-lg px-4 py-2 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                <span className="text-sm">Loading...</span>
              </div>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Node Details Panel */}
      {selectedNode && (
        <div className="absolute right-4 top-4 bottom-4 w-80 z-10">
          <NodeDetailsPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        </div>
      )}
    </div>
  );
}
