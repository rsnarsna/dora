'use client';

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { KnowledgeNode, KnowledgeRelation, KnowledgeCluster } from '@/types/knowledge';
import { KnowledgeNodeCard2D } from './knowledge-node-card-2d';
import { Plus, Move, ZoomIn, ZoomOut, RotateCcw, Sparkles, Layers, Maximize2, Link as LinkIcon, Compass, Info } from 'lucide-react';

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

  // Touch Gesture Tracker
  const touchStateRef = useRef<{
    initialPinchDist: number;
    initialZoom: number;
    initialPan: { x: number; y: number };
    startMidpoint: { x: number; y: number };
    touchStartTime: number;
    touchStartPos: { x: number; y: number };
    activeTouches: number;
  } | null>(null);

  // Last tap time for double-tap detection
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });

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

  // -------------------------------------------------------------
  // MOUSE HANDLERS
  // -------------------------------------------------------------
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
    if (isPanning) setIsPanning(false);
    if (draggingNodeId) {
      onUpdatePositions(activeCluster?.id || null, positions);
      setDraggingNodeId(null);
    }
  };

  const startDraggingNode = (clientX: number, clientY: number, nodeId: string) => {
    const pos = positions[nodeId] || { x: 0, y: 0 };
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const canvasMouseX = (clientX - containerRect.left - containerRect.width / 2 - pan.x) / zoom;
    const canvasMouseY = (clientY - containerRect.top - containerRect.height / 2 - pan.y) / zoom;

    setDragOffset({
      x: canvasMouseX - pos.x,
      y: canvasMouseY - pos.y,
    });
    setDraggingNodeId(nodeId);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (connectingSourceId && connectingSourceId !== nodeId) {
      onConnectNodes(connectingSourceId, nodeId);
      setConnectingSourceId(null);
      return;
    }
    startDraggingNode(e.clientX, e.clientY, nodeId);
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

  // -------------------------------------------------------------
  // TOUCH SCREEN HANDLERS (Pinch-to-Zoom, Two-Finger Pan, Touch Drag)
  // -------------------------------------------------------------
  const handleTouchStart = (e: React.TouchEvent) => {
    const touches = e.touches;
    const now = Date.now();

    if (touches.length === 1) {
      const touch = touches[0];
      const target = e.target as HTMLElement;
      const isCanvasBg = target === containerRef.current || target.tagName === 'svg';

      // Check for double-tap on canvas
      const timeDiff = now - lastTapRef.current.time;
      const distDiff = Math.hypot(touch.clientX - lastTapRef.current.x, touch.clientY - lastTapRef.current.y);
      if (isCanvasBg && timeDiff < 300 && distDiff < 25 && onCreateNodeAt) {
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          const canvasX = Math.round((touch.clientX - containerRect.left - containerRect.width / 2 - pan.x) / zoom);
          const canvasY = Math.round((touch.clientY - containerRect.top - containerRect.height / 2 - pan.y) / zoom);
          onCreateNodeAt(canvasX, canvasY);
        }
      }
      lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };

      if (isCanvasBg) {
        setIsPanning(true);
        setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
        onSelectNode(null);
      }

      touchStateRef.current = {
        initialPinchDist: 0,
        initialZoom: zoom,
        initialPan: { ...pan },
        startMidpoint: { x: touch.clientX, y: touch.clientY },
        touchStartTime: now,
        touchStartPos: { x: touch.clientX, y: touch.clientY },
        activeTouches: 1,
      };
    } else if (touches.length === 2) {
      // Pinch-to-zoom & two-finger pan initiated
      e.preventDefault();
      const t1 = touches[0];
      const t2 = touches[1];
      const pinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      setIsPanning(false);
      if (draggingNodeId) {
        setDraggingNodeId(null);
      }

      touchStateRef.current = {
        initialPinchDist: pinchDist,
        initialZoom: zoom,
        initialPan: { ...pan },
        startMidpoint: { x: midX, y: midY },
        touchStartTime: now,
        touchStartPos: { x: midX, y: midY },
        activeTouches: 2,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touches = e.touches;
    const touchState = touchStateRef.current;
    if (!touchState) return;

    if (touches.length === 2 && touchState.initialPinchDist > 0) {
      e.preventDefault();
      const t1 = touches[0];
      const t2 = touches[1];
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const currentMidX = (t1.clientX + t2.clientX) / 2;
      const currentMidY = (t1.clientY + t2.clientY) / 2;

      // Calculate pinch zoom
      const pinchFactor = currentDist / touchState.initialPinchDist;
      const nextZoom = Math.min(Math.max(touchState.initialZoom * pinchFactor, 0.35), 2.8);
      setZoom(nextZoom);

      // Two-finger midpoint pan
      const deltaX = currentMidX - touchState.startMidpoint.x;
      const deltaY = currentMidY - touchState.startMidpoint.y;
      setPan({
        x: touchState.initialPan.x + deltaX,
        y: touchState.initialPan.y + deltaY,
      });
    } else if (touches.length === 1) {
      const touch = touches[0];

      if (draggingNodeId) {
        e.preventDefault();
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;

        const canvasTouchX = (touch.clientX - containerRect.left - containerRect.width / 2 - pan.x) / zoom;
        const canvasTouchY = (touch.clientY - containerRect.top - containerRect.height / 2 - pan.y) / zoom;

        setPositions((prev) => ({
          ...prev,
          [draggingNodeId]: {
            x: Math.round(canvasTouchX - dragOffset.x),
            y: Math.round(canvasTouchY - dragOffset.y),
          },
        }));
      } else if (isPanning) {
        e.preventDefault();
        setPan({
          x: touch.clientX - panStart.x,
          y: touch.clientY - panStart.y,
        });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (draggingNodeId) {
      onUpdatePositions(activeCluster?.id || null, positions);
      setDraggingNodeId(null);
    }
    if (isPanning) setIsPanning(false);

    if (e.touches.length === 0) {
      touchStateRef.current = null;
    }
  };

  const handleNodeTouchStart = (e: React.TouchEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (connectingSourceId && connectingSourceId !== nodeId) {
        onConnectNodes(connectingSourceId, nodeId);
        setConnectingSourceId(null);
        return;
      }
      startDraggingNode(touch.clientX, touch.clientY, nodeId);
    }
  };

  // Reset zoom & pan
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
      className="relative w-full h-full overflow-hidden bg-dot-grid cursor-default select-none touch-none"
      style={{
        backgroundImage: `radial-gradient(circle, var(--border) 1px, transparent 1px)`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* Interactive Controls Overlay with Touch-Friendly Hit Targets */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-card/95 backdrop-blur-md p-2 rounded-xl border border-border shadow-lg">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.2, 2.8))}
          className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors active:scale-95"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono text-muted-foreground w-12 text-center font-bold">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.2, 0.35))}
          className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors active:scale-95"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-5 bg-border mx-1" />
        <button
          onClick={handleResetView}
          className="px-2.5 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-semibold transition-colors active:scale-95"
          title="Reset View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
        <div className="w-[1px] h-5 bg-border mx-1" />
        <span className="text-[10px] text-muted-foreground/80 font-mono hidden md:inline px-1">
          Pinch to zoom • Drag to pan
        </span>
      </div>

      {/* Selected Node Floating Details Pill (Interactive HUD) */}
      {selectedNode && (
        <div 
          className="absolute top-4 left-4 z-20 bg-card/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-primary/30 shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2"
          style={{ borderLeft: `4px solid ${selectedNode.visualColor || '#326ce5'}` }}
        >
          <div className="flex flex-col min-w-0 max-w-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {selectedNode.type}
              </span>
              <span className="text-foreground font-bold text-xs truncate">
                {selectedNode.title}
              </span>
            </div>
            {selectedNode.summary && (
              <span className="text-[11px] text-muted-foreground truncate">
                {selectedNode.summary}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 border-l border-border pl-2.5">
            {onMorphTo3D && (
              <button
                onClick={() => onMorphTo3D(selectedNode)}
                className="px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary text-xs font-semibold flex items-center gap-1 transition-colors"
                title="View in 3D Space"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>3D View</span>
              </button>
            )}
            <button
              onClick={() => setConnectingSourceId(selectedNode.id)}
              className="px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Connect to another concept"
            >
              <LinkIcon className="w-3 h-3" />
              <span>Connect</span>
            </button>
          </div>
        </div>
      )}

      {/* Connecting status banner */}
      {connectingSourceId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-500 text-amber-950 px-4 py-2 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce">
          <span>Tap any target concept to establish relationship</span>
          <button
            onClick={() => setConnectingSourceId(null)}
            className="underline font-normal text-xs ml-2"
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
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--primary)" opacity="0.75" />
          </marker>
        </defs>

        {visibleRelations.map((rel) => {
          const sourcePos = positions[rel.sourceNodeId] || { x: 0, y: 0 };
          const targetPos = positions[rel.targetNodeId] || { x: 0, y: 0 };

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
              {/* Outer Glow / Tap Path */}
              <path
                d={`M ${sourcePos.x} ${sourcePos.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${targetPos.x} ${targetPos.y}`}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="5"
                strokeOpacity="0.15"
              />

              {/* Main Line with animated flow */}
              <path
                d={`M ${sourcePos.x} ${sourcePos.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${targetPos.x} ${targetPos.y}`}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeOpacity="0.75"
                strokeDasharray={rel.animated ? '6,4' : 'none'}
                markerEnd="url(#arrowhead)"
              />

              {/* Relationship Type Pill */}
              {rel.label && (
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x="-45"
                    y="-11"
                    width="90"
                    height="22"
                    rx="11"
                    fill="var(--card)"
                    stroke="var(--border)"
                    strokeWidth="1.2"
                    className="shadow-sm"
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--foreground)"
                    fontSize="9.5"
                    fontWeight="700"
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
              className="pointer-events-auto touch-manipulation"
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onTouchStart={(e) => handleNodeTouchStart(e, node.id)}
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
