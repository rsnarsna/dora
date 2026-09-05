'use client';

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { KnowledgeNode, KnowledgeRelation, KnowledgeCluster } from '@/types/knowledge';
import { KnowledgeNodeCard2D } from './knowledge-node-card-2d';
import { Plus, Move, ZoomIn, ZoomOut, RotateCcw, Sparkles, Layers, Maximize2, Minimize2, Box, Link as LinkIcon, Compass, Info, RefreshCw } from 'lucide-react';

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
  onOpenInspector?: (node: KnowledgeNode) => void;
  onResetPlayground?: () => void;
  onDeleteRelation?: (relationId: string) => void;
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
  onOpenInspector,
  onResetPlayground,
  onDeleteRelation,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // View transform state (Pan and Zoom)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Minimal Icons vs Expanded Cards Mode (Defaults to Minimal Icons for clean architecture playground)
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [displayMode, setDisplayMode] = useState<'minimal' | 'expanded'>('minimal');
  const [isFlowSimulating, setIsFlowSimulating] = useState<boolean>(true);

  // Connection source state
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);

  // Dragging node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const hasDraggedRef = useRef<boolean>(false);

  // Compute node positions based on active cluster or fallback
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Container pixel dimensions for centering SVG wires with sub-pixel precision
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 800,
  });

  // Track mouse world position during active connection drawing
  const [mouseWorldPos, setMouseWorldPos] = useState<{ x: number; y: number } | null>(null);

  // Measure container dimensions on mount and window resize
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setContainerSize({ width: rect.width, height: rect.height });
        }
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

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

  // Connection count per node for displaying link badges on minimal icons
  const connectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of visibleRelations) {
      counts[r.sourceNodeId] = (counts[r.sourceNodeId] || 0) + 1;
      counts[r.targetNodeId] = (counts[r.targetNodeId] || 0) + 1;
    }
    return counts;
  }, [visibleRelations]);

  // Toggle expansion of an individual node
  const handleToggleExpandNode = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const isNodeExpanded = useCallback((nodeId: string) => {
    if (displayMode === 'expanded') return true;
    return expandedNodeIds.has(nodeId) || selectedNodeId === nodeId;
  }, [displayMode, expandedNodeIds, selectedNodeId]);

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
    if (connectingSourceId) {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const mouseX = (e.clientX - containerRect.left - containerSize.width / 2 - pan.x) / zoom;
        const mouseY = (e.clientY - containerRect.top - containerSize.height / 2 - pan.y) / zoom;
        setMouseWorldPos({ x: Math.round(mouseX), y: Math.round(mouseY) });
      }
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (draggingNodeId) {
      hasDraggedRef.current = true;
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const mouseX = (e.clientX - containerRect.left - containerSize.width / 2 - pan.x) / zoom;
      const mouseY = (e.clientY - containerRect.top - containerSize.height / 2 - pan.y) / zoom;

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
      if (hasDraggedRef.current) {
        onUpdatePositions(activeCluster?.id || null, positions);
      }
      setDraggingNodeId(null);
    }
  };

  const startDraggingNode = (clientX: number, clientY: number, nodeId: string) => {
    const pos = positions[nodeId] || { x: 0, y: 0 };
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const canvasMouseX = (clientX - containerRect.left - containerRect.width / 2 - pan.x) / zoom;
    const canvasMouseY = (clientY - containerRect.top - containerRect.height / 2 - pan.y) / zoom;

    hasDraggedRef.current = false;
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

      if (connectingSourceId) {
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          const canvasTouchX = (touch.clientX - containerRect.left - containerSize.width / 2 - pan.x) / zoom;
          const canvasTouchY = (touch.clientY - containerRect.top - containerSize.height / 2 - pan.y) / zoom;
          setMouseWorldPos({ x: Math.round(canvasTouchX), y: Math.round(canvasTouchY) });
        }
      }

      if (draggingNodeId) {
        e.preventDefault();
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;

        const canvasTouchX = (touch.clientX - containerRect.left - containerSize.width / 2 - pan.x) / zoom;
        const canvasTouchY = (touch.clientY - containerRect.top - containerSize.height / 2 - pan.y) / zoom;

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

      {/* Interactive Playground Control Bar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-card/95 backdrop-blur-md p-1.5 rounded-xl border border-border shadow-lg">
        {/* Minimal Icons vs Expanded Cards Switcher */}
        <div className="flex items-center bg-muted/70 p-0.5 rounded-lg border border-border/60 mr-1">
          <button
            onClick={() => {
              setDisplayMode('minimal');
              setExpandedNodeIds(new Set());
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 ${
              displayMode === 'minimal'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Show minimal icons (Click any node to expand)"
          >
            <Box className="w-3 h-3 text-blue-500" />
            <span>Minimal Icons</span>
          </button>
          <button
            onClick={() => setDisplayMode('expanded')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 ${
              displayMode === 'expanded'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Expand all concept cards"
          >
            <Maximize2 className="w-3 h-3 text-indigo-500" />
            <span>Expanded Cards</span>
          </button>
        </div>

        {/* Live Flow Toggle */}
        <button
          onClick={() => setIsFlowSimulating(!isFlowSimulating)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
            isFlowSimulating
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
          title="Toggle animated data flow packets"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">Live Flow</span>
        </button>

        {/* Quick Link Mode */}
        <button
          onClick={() => {
            if (selectedNodeId) {
              setConnectingSourceId(selectedNodeId);
            } else if (visibleNodes.length > 0) {
              setConnectingSourceId(visibleNodes[0].id);
            }
          }}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
            connectingSourceId
              ? 'bg-amber-500 text-amber-950 font-bold'
              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
          }`}
          title="Quick Link two concepts"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Connect</span>
        </button>

        {/* Reset Playground Button */}
        {onResetPlayground && (
          <button
            onClick={() => {
              if (confirm('Reset playground to default multi-cluster architecture? Any unsaved edits will be refreshed.')) {
                onResetPlayground();
              }
            }}
            className="px-2 py-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] font-semibold flex items-center gap-1 transition-colors"
            title="Reset playground with initial sample concepts"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden md:inline">Reset Playground</span>
          </button>
        )}
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
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-amber-500 text-amber-950 px-4 py-2 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce">
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
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '50% 50%',
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="12"
            markerHeight="8"
            refX="10"
            refY="4"
            orient="auto"
          >
            <polygon points="0 0, 11 4, 0 8" fill="var(--primary)" opacity="0.9" />
          </marker>
          <marker
            id="arrowhead-highlighted"
            markerWidth="12"
            markerHeight="8"
            refX="10"
            refY="4"
            orient="auto"
          >
            <polygon points="0 0, 11 4, 0 8" fill="#3b82f6" />
          </marker>
          <marker
            id="arrowhead-connecting"
            markerWidth="12"
            markerHeight="8"
            refX="10"
            refY="4"
            orient="auto"
          >
            <polygon points="0 0, 11 4, 0 8" fill="#f59e0b" />
          </marker>
        </defs>

        {/* Center SVG coordinate system with HTML nodes layer */}
        <g transform={`translate(${containerSize.width / 2}, ${containerSize.height / 2})`}>
          {visibleRelations.map((rel) => {
            const sourcePos = positions[rel.sourceNodeId] || { x: 0, y: 0 };
            const targetPos = positions[rel.targetNodeId] || { x: 0, y: 0 };

            const dx = targetPos.x - sourcePos.x;
            const dy = targetPos.y - sourcePos.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 5) return null;

            const ux = dx / dist;
            const uy = dy / dist;

            const isSourceExpanded = isNodeExpanded(rel.sourceNodeId);
            const isTargetExpanded = isNodeExpanded(rel.targetNodeId);

            // Card boundary distances so arrowheads and wires terminate at card edges
            const srcRadius = isSourceExpanded ? 76 : 34;
            const tgtRadius = isTargetExpanded ? 84 : 40;

            const startX = sourcePos.x + ux * srcRadius;
            const startY = sourcePos.y + uy * srcRadius;
            const endX = targetPos.x - ux * tgtRadius;
            const endY = targetPos.y - uy * tgtRadius;

            const cdx = endX - startX;
            const cdy = endY - startY;

            let cx1: number, cy1: number, cx2: number, cy2: number;
            if (Math.abs(cdx) >= Math.abs(cdy)) {
              const bend = Math.max(Math.abs(cdx) * 0.45, 25);
              const dirX = cdx >= 0 ? 1 : -1;
              cx1 = startX + dirX * bend;
              cy1 = startY;
              cx2 = endX - dirX * bend;
              cy2 = endY;
            } else {
              const bend = Math.max(Math.abs(cdy) * 0.45, 25);
              const dirY = cdy >= 0 ? 1 : -1;
              cx1 = startX;
              cy1 = startY + dirY * bend;
              cx2 = endX;
              cy2 = endY - dirY * bend;
            }

            const pathData = `M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`;
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            const isRelHighlighted = selectedNodeId && (rel.sourceNodeId === selectedNodeId || rel.targetNodeId === selectedNodeId);

            return (
              <g key={rel.id} className="transition-opacity duration-300">
                {/* Outer Glow / Tap Path */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={isRelHighlighted ? 'var(--primary)' : 'var(--primary)'}
                  strokeWidth={isRelHighlighted ? '8' : '4'}
                  strokeOpacity={isRelHighlighted ? '0.35' : '0.12'}
                />

                {/* Main Line with animated flow */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={isRelHighlighted ? 'var(--primary)' : 'var(--primary)'}
                  strokeWidth={isRelHighlighted ? '2.8' : '2'}
                  strokeOpacity={isRelHighlighted ? '0.95' : '0.65'}
                  strokeDasharray={rel.animated ? '6,4' : 'none'}
                  markerEnd={isRelHighlighted ? 'url(#arrowhead-highlighted)' : 'url(#arrowhead)'}
                />

                {/* Animated Data Flow Packet */}
                {(isFlowSimulating || rel.animated) && (
                  <circle r={isRelHighlighted ? '4.5' : '3.5'} fill={isRelHighlighted ? 'var(--primary)' : '#326ce5'} className="drop-shadow-sm">
                    <animateMotion
                      dur={isRelHighlighted ? '2s' : '3.5s'}
                      repeatCount="indefinite"
                      path={pathData}
                    />
                  </circle>
                )}

                {/* Relationship Type Pill */}
                {rel.label && (
                  <g 
                    transform={`translate(${midX}, ${midY})`}
                    className="cursor-pointer pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDeleteRelation && confirm(`Remove relationship "${rel.label}"?`)) {
                        onDeleteRelation(rel.id);
                      }
                    }}
                  >
                    <title>{`Click to remove relationship "${rel.label}"`}</title>
                    <rect
                      x="-48"
                      y="-12"
                      width="96"
                      height="24"
                      rx="12"
                      fill="var(--card)"
                      stroke={isRelHighlighted ? 'var(--primary)' : 'var(--border)'}
                      strokeWidth={isRelHighlighted ? '1.8' : '1.2'}
                      className="shadow-sm hover:scale-105 transition-transform"
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

          {/* Live Connecting Rubber-Band Wire */}
          {connectingSourceId && mouseWorldPos && positions[connectingSourceId] && (
            <g className="transition-all">
              <line
                x1={positions[connectingSourceId].x}
                y1={positions[connectingSourceId].y}
                x2={mouseWorldPos.x}
                y2={mouseWorldPos.y}
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeDasharray="6,4"
                markerEnd="url(#arrowhead-connecting)"
              />
            </g>
          )}
        </g>
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
          const expanded = isNodeExpanded(node.id);
          const isSelected = selectedNodeId === node.id;

          return (
            <div
              key={node.id}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                zIndex: isSelected ? 30 : expanded ? 20 : 10,
              }}
              className="pointer-events-auto touch-manipulation"
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onTouchStart={(e) => handleNodeTouchStart(e, node.id)}
            >
              <KnowledgeNodeCard2D
                node={node}
                clusters={clusters}
                isSelected={isSelected}
                isExpanded={expanded}
                onToggleExpand={handleToggleExpandNode}
                onSelect={onSelectNode}
                onStartConnect={(id) => setConnectingSourceId(id)}
                onMorphTo3D={onMorphTo3D}
                onOpenInspector={onOpenInspector}
                isConnecting={connectingSourceId === node.id}
                connectedCount={connectionCounts[node.id] || 0}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
