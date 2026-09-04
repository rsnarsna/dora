'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { KnowledgeNode, KnowledgeRelation, KnowledgeCluster } from '@/types/knowledge';
import { KnowledgeNodeCard2D } from './knowledge-node-card-2d';
import { Plus, Move, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface KnowledgeCanvas2DProps {
  nodes: KnowledgeNode[];
  relations: KnowledgeRelation[];
  clusters: KnowledgeCluster[];
  activeCluster: KnowledgeCluster | null;
  selectedNodeId: string | null;
  onSelectNode: (node: KnowledgeNode | null) => void;
  onUpdatePositions: (clusterId: string | null, positions: Record<string, { x: number; y: number }>) => void;
  onConnectNodes: (sourceId: string, targetId: string) => void;
  onMorphTo3D?: (node: KnowledgeNode) => void;
  onCreateNodeAt?: (x: number, y: number) => void;
}

export const KnowledgeCanvas2D: React.FC<KnowledgeCanvas2DProps> = ({
  nodes,
  relations,
  clusters,
  activeCluster,
  selectedNodeId,
  onSelectNode,
  onUpdatePositions,
  onConnectNodes,
  onMorphTo3D,
  onCreateNodeAt,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // View transform state (Pan and Zoom)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Connection source state
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);

  // Dragging node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Compute node positions based on active cluster or fallback
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Sync positions from activeCluster or auto-align in circle/grid if missing
  useEffect(() => {
    const saved = activeCluster?.positions2D || {};
    const updated: Record<string, { x: number; y: number }> = { ...saved };

    const nodesToPosition = activeCluster 
      ? nodes.filter(n => activeCluster.nodeIds?.includes(n.id))
      : nodes;

    const count = nodesToPosition.length;
    const radius = Math.max(220, count * 55);

    nodesToPosition.forEach((node, i) => {
      if (!updated[node.id]) {
        const angle = (2 * Math.PI * i) / (count || 1);
        updated[node.id] = {
          x: Math.round(Math.cos(angle) * radius),
          y: Math.round(Math.sin(angle) * radius),
        };
      }
    });

    setPositions(updated);
  }, [activeCluster, nodes]);

  // Nodes to display (filter by active cluster if selected)
  const visibleNodes = useMemo(() => {
    if (!activeCluster) return nodes;
    const ids = new Set(activeCluster.nodeIds || []);
    return nodes.filter((n) => ids.has(n.id));
  }, [nodes, activeCluster]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  // Relations where both source and target are visible
  const visibleRelations = useMemo(() => {
    return relations.filter(
      (r) => visibleNodeIds.has(r.sourceNodeId) && visibleNodeIds.has(r.targetNodeId)
    );
  }, [relations, visibleNodeIds]);

  // Canvas Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      if (connectingSourceId) setConnectingSourceId(null);
      onSelectNode(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (draggingNodeId) {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const mouseX = (e.clientX - containerRect.left - containerRect.width / 2 - pan.x) / zoom;
      const mouseY = (e.clientY - containerRect.top - containerRect.height / 2 - pan.y) / zoom;

      setPositions((prev) => ({
        ...prev,
        [draggingNodeId]: {
          x: Math.round(mouseX - dragOffset.x),
          y: Math.round(mouseY - dragOffset.y),
        },
      }));
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (draggingNodeId) {
      onUpdatePositions(activeCluster?.id || null, positions);
      setDraggingNodeId(null);
    }
  };

  // Node Drag Start Handler
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (connectingSourceId && connectingSourceId !== nodeId) {
      // Connect nodes!
      onConnectNodes(connectingSourceId, nodeId);
      setConnectingSourceId(null);
      return;
    }

    const pos = positions[nodeId] || { x: 0, y: 0 };
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const mouseX = (e.clientX - containerRect.left - containerRect.width / 2 - pan.x) / zoom;
    const mouseY = (e.clientY - containerRect.top - containerRect.height / 2 - pan.y) / zoom;

    setDragOffset({
      x: mouseX - pos.x,
      y: mouseY - pos.y,
    });
    setDraggingNodeId(nodeId);
  };

  // Double click on canvas to create node
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect || !onCreateNodeAt) return;

      const canvasX = Math.round((e.clientX - containerRect.left - containerRect.width / 2 - pan.x) / zoom);
      const canvasY = Math.round((e.clientY - containerRect.top - containerRect.height / 2 - pan.y) / zoom);
      onCreateNodeAt(canvasX, canvasY);
    }
  };

  // Reset zoom & pan
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      className="relative w-full h-full overflow-hidden bg-dot-grid cursor-default select-none"
      style={{
        backgroundImage: `radial-gradient(circle, var(--border) 1px, transparent 1px)`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* Interactive Controls Overlay */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-card/90 backdrop-blur-md p-1.5 rounded-lg border border-border shadow-md">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.15, 2.5))}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-mono text-muted-foreground w-10 text-center font-bold">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-3.5 bg-border mx-0.5" />
        <button
          onClick={handleResetView}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Connecting status banner */}
      {connectingSourceId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-500 text-amber-950 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 animate-bounce">
          <span>Click any target concept to establish connection</span>
          <button
            onClick={() => setConnectingSourceId(null)}
            className="underline font-normal text-[10px] ml-1"
          >
            Cancel
          </button>
        </div>
      )}

      {/* SVG Canvas for Relationship Wires */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '50% 50%',
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--primary)" opacity="0.7" />
          </marker>
        </defs>

        {visibleRelations.map((rel) => {
          const sourcePos = positions[rel.sourceNodeId] || { x: 0, y: 0 };
          const targetPos = positions[rel.targetNodeId] || { x: 0, y: 0 };

          // Offset from center to approximate node border
          const dx = targetPos.x - sourcePos.x;
          const dy = targetPos.y - sourcePos.y;
          const cx1 = sourcePos.x + dx * 0.45;
          const cy1 = sourcePos.y;
          const cx2 = targetPos.x - dx * 0.45;
          const cy2 = targetPos.y;

          const midX = (sourcePos.x + targetPos.x) / 2;
          const midY = (sourcePos.y + targetPos.y) / 2;

          return (
            <g key={rel.id} className="transition-opacity duration-300">
              {/* Outer Glow / Hover Path */}
              <path
                d={`M ${sourcePos.x} ${sourcePos.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${targetPos.x} ${targetPos.y}`}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="4"
                strokeOpacity="0.15"
              />

              {/* Main Line with animated flow */}
              <path
                d={`M ${sourcePos.x} ${sourcePos.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${targetPos.x} ${targetPos.y}`}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="1.8"
                strokeOpacity="0.7"
                strokeDasharray={rel.animated ? '6,4' : 'none'}
                markerEnd="url(#arrowhead)"
                className={rel.animated ? 'animate-[dash_20s_linear_infinite]' : ''}
              />

              {/* Relationship Type Pill */}
              {rel.label && (
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x="-45"
                    y="-10"
                    width="90"
                    height="20"
                    rx="10"
                    fill="var(--card)"
                    stroke="var(--border)"
                    strokeWidth="1"
                    className="shadow-2xs"
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--foreground)"
                    fontSize="9"
                    fontWeight="600"
                    className="font-mono select-none"
                  >
                    {rel.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Nodes Layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '50% 50%',
        }}
      >
        {visibleNodes.map((node) => {
          const pos = positions[node.id] || { x: 0, y: 0 };
          return (
            <div
              key={node.id}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                zIndex: selectedNodeId === node.id ? 10 : 1,
              }}
              className="pointer-events-auto"
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            >
              <KnowledgeNodeCard2D
                node={node}
                clusters={clusters}
                isSelected={selectedNodeId === node.id}
                onSelect={onSelectNode}
                onStartConnect={(id) => setConnectingSourceId(id)}
                onMorphTo3D={onMorphTo3D}
                isConnecting={connectingSourceId === node.id}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
