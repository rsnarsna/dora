'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { KnowledgeNode, KnowledgeRelation, KnowledgeCluster, KnowledgeGraphData, KnowledgeRelationType } from '@/types/knowledge';
import { 
  getKnowledgeGraphAction, 
  saveKnowledgeNodeAction, 
  deleteKnowledgeNodeAction, 
  saveKnowledgeRelationAction, 
  deleteKnowledgeRelationAction, 
  saveKnowledgeClusterAction, 
  deleteKnowledgeClusterAction 
} from '@/server/actions/knowledge-actions';
import { KnowledgeCanvas2D } from './knowledge-canvas-2d';
import { KnowledgeCanvas3D } from './knowledge-canvas-3d';
import { KnowledgeNodeInspector } from './knowledge-node-inspector';
import { KnowledgeClusterModal } from './knowledge-cluster-modal';
import { useDashboard } from '@/components/dashboard-layout-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Layers, 
  Sparkles, 
  FolderKanban, 
  Maximize2, 
  Compass, 
  Grid, 
  RefreshCw, 
  HelpCircle,
  Share2
} from 'lucide-react';

interface KnowledgeGraphPageClientProps {
  initialData: KnowledgeGraphData;
}

export const KnowledgeGraphPageClient: React.FC<KnowledgeGraphPageClientProps> = ({ initialData }) => {
  const { activeAccount } = useDashboard();
  const [isPending, startTransition] = useTransition();

  // Core graph state
  const [nodes, setNodes] = useState<KnowledgeNode[]>(initialData.nodes || []);
  const [relations, setRelations] = useState<KnowledgeRelation[]>(initialData.relations || []);
  const [clusters, setClusters] = useState<KnowledgeCluster[]>(initialData.clusters || []);

  // View & UI state
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isClusterModalOpen, setIsClusterModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Reload data when active account changes
  useEffect(() => {
    if (!activeAccount?.id) return;
    startTransition(async () => {
      const data = await getKnowledgeGraphAction(activeAccount.id);
      setNodes(data.nodes);
      setRelations(data.relations);
      setClusters(data.clusters);
    });
  }, [activeAccount?.id]);

  const activeCluster = clusters.find((c) => c.id === activeClusterId) || null;
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Node Actions
  const handleCreateNode = async (customTitle?: string, atPos2D?: { x: number; y: number }) => {
    if (!activeAccount?.id) return;
    const newNodeId = `node-${Date.now()}`;
    const newNode: KnowledgeNode = {
      id: newNodeId,
      accountId: activeAccount.id,
      type: 'concept',
      title: customTitle || 'New Knowledge Node',
      summary: 'Dynamic reusable concept node.',
      content: '### New Knowledge Concept\n\nWrite notes and mental models here.',
      visualShape: 'hex',
      visualColor: '#326ce5',
      tags: [],
      jiraTaskKeys: [],
      metadata: {},
    };

    // If a cluster is active, automatically associate node with it!
    const updatedClusters = clusters.map((c) => {
      if (c.id === activeClusterId) {
        const currentIds = c.nodeIds || [];
        return {
          ...c,
          nodeIds: [...currentIds, newNodeId],
          positions2D: atPos2D ? { ...c.positions2D, [newNodeId]: atPos2D } : c.positions2D,
        };
      }
      return c;
    });

    setNodes((prev) => [...prev, newNode]);
    setClusters(updatedClusters);
    setSelectedNodeId(newNodeId);

    showStatus('Saving new concept...');
    await saveKnowledgeNodeAction(newNode);
    if (activeClusterId) {
      const clusterToSave = updatedClusters.find((c) => c.id === activeClusterId);
      if (clusterToSave) await saveKnowledgeClusterAction(clusterToSave);
    }
    showStatus('✅ Concept created');
  };

  const handleUpdateNode = async (updated: KnowledgeNode) => {
    setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    showStatus('Updating concept...');
    await saveKnowledgeNodeAction(updated);
    showStatus('✅ Saved');
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!activeAccount?.id) return;
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setRelations((prev) => prev.filter((r) => r.sourceNodeId !== nodeId && r.targetNodeId !== nodeId));
    setClusters((prev) =>
      prev.map((c) => ({
        ...c,
        nodeIds: (c.nodeIds || []).filter((id) => id !== nodeId),
      }))
    );
    if (selectedNodeId === nodeId) setSelectedNodeId(null);

    showStatus('Deleting concept...');
    await deleteKnowledgeNodeAction(nodeId, activeAccount.id);
    showStatus('✅ Concept deleted');
  };

  // Relation Actions
  const handleConnectNodes = async (sourceId: string, targetId: string) => {
    if (!activeAccount?.id || sourceId === targetId) return;
    const exists = relations.some((r) => r.sourceNodeId === sourceId && r.targetNodeId === targetId);
    if (exists) {
      showStatus('⚠️ Connection already exists');
      return;
    }

    const newRelation: KnowledgeRelation = {
      id: `rel-${Date.now()}`,
      accountId: activeAccount.id,
      sourceNodeId: sourceId,
      targetNodeId: targetId,
      relationType: 'relates_to',
      label: 'Relates to',
      animated: true,
      properties: {},
    };

    setRelations((prev) => [...prev, newRelation]);
    showStatus('Connecting concepts...');
    await saveKnowledgeRelationAction(newRelation);
    showStatus('✅ Connected');
  };

  const handleCreateCustomRelation = async (
    sourceId: string,
    targetId: string,
    relationType: KnowledgeRelationType,
    label: string
  ) => {
    if (!activeAccount?.id) return;
    const newRelation: KnowledgeRelation = {
      id: `rel-${Date.now()}`,
      accountId: activeAccount.id,
      sourceNodeId: sourceId,
      targetNodeId: targetId,
      relationType,
      label: label || relationType,
      animated: true,
      properties: {},
    };

    setRelations((prev) => [...prev, newRelation]);
    showStatus('Adding relationship...');
    await saveKnowledgeRelationAction(newRelation);
    showStatus('✅ Connection established');
  };

  const handleDeleteRelation = async (relationId: string) => {
    setRelations((prev) => prev.filter((r) => r.id !== relationId));
    showStatus('Removing relationship...');
    await deleteKnowledgeRelationAction(relationId);
    showStatus('✅ Relationship removed');
  };

  // Cluster Actions
  const handleCreateCluster = async (name: string, description: string, color: string) => {
    if (!activeAccount?.id) return;
    const newClusterId = `cluster-${Date.now()}`;
    const newCluster: KnowledgeCluster = {
      id: newClusterId,
      accountId: activeAccount.id,
      name,
      description,
      color,
      nodeIds: selectedNodeId ? [selectedNodeId] : [],
      positions2D: {},
      positions3D: {},
    };

    setClusters((prev) => [...prev, newCluster]);
    setActiveClusterId(newClusterId);
    showStatus(`Created cluster "${name}"`);
    await saveKnowledgeClusterAction(newCluster);
  };

  const handleToggleClusterMembership = async (clusterId: string, nodeId: string) => {
    const cluster = clusters.find((c) => c.id === clusterId);
    if (!cluster) return;

    const isMember = cluster.nodeIds?.includes(nodeId);
    const updatedIds = isMember
      ? cluster.nodeIds.filter((id) => id !== nodeId)
      : [...(cluster.nodeIds || []), nodeId];

    const updatedCluster: KnowledgeCluster = {
      ...cluster,
      nodeIds: updatedIds,
    };

    setClusters((prev) => prev.map((c) => (c.id === clusterId ? updatedCluster : c)));
    await saveKnowledgeClusterAction(updatedCluster);
    showStatus(isMember ? 'Removed from cluster' : 'Added to cluster');
  };

  const handleUpdatePositions2D = async (
    clusterId: string | null,
    positions: Record<string, { x: number; y: number }>
  ) => {
    if (!clusterId) return;
    const cluster = clusters.find((c) => c.id === clusterId);
    if (!cluster) return;

    const updatedCluster: KnowledgeCluster = {
      ...cluster,
      positions2D: positions,
    };

    setClusters((prev) => prev.map((c) => (c.id === clusterId ? updatedCluster : c)));
    await saveKnowledgeClusterAction(updatedCluster);
  };

  // Auto-arrange radial layout
  const handleAutoLayout = async () => {
    const nodesToAlign = activeCluster
      ? nodes.filter((n) => activeCluster.nodeIds?.includes(n.id))
      : nodes;

    const count = nodesToAlign.length;
    const radius2D = Math.max(220, count * 60);
    const radius3D = Math.max(8, count * 2.2);

    const newPos2D: Record<string, { x: number; y: number }> = {};
    const newPos3D: Record<string, { x: number; y: number; z: number }> = {};

    nodesToAlign.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / (count || 1);
      newPos2D[node.id] = {
        x: Math.round(Math.cos(angle) * radius2D),
        y: Math.round(Math.sin(angle) * radius2D),
      };
      newPos3D[node.id] = {
        x: Math.round(Math.cos(angle) * radius3D * 10) / 10,
        y: 0,
        z: Math.round(Math.sin(angle) * radius3D * 10) / 10,
      };
    });

    if (activeCluster) {
      const updated: KnowledgeCluster = {
        ...activeCluster,
        positions2D: newPos2D,
        positions3D: newPos3D,
      };
      setClusters((prev) => prev.map((c) => (c.id === activeCluster.id ? updated : c)));
      await saveKnowledgeClusterAction(updated);
      showStatus('✅ Auto-aligned cluster layout');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden select-none">
      {/* Top Knowledge Command Header */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md px-4 flex items-center justify-between gap-3 shrink-0 z-20">
        {/* Left: Concept Title & Cluster Context Selector */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </span>
            <div>
              <h1 className="font-bold text-sm text-foreground flex items-center gap-1.5 leading-none">
                Knowledge Concept Universe
                <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4">
                  {nodes.length} Nodes
                </Badge>
              </h1>
              <span className="text-[10px] text-muted-foreground font-mono">
                Create Once → Connect Once → Reuse Everywhere
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-border mx-1" />

          {/* Cluster Context Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <FolderKanban className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <select
              value={activeClusterId || ''}
              onChange={(e) => setActiveClusterId(e.target.value || null)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-semibold text-foreground shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">🌐 All Concepts ({nodes.length})</option>
              {clusters.map((c) => (
                <option key={c.id} value={c.id}>
                  📁 {c.name} ({c.nodeIds?.length || 0})
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsClusterModalOpen(true)}
              className="h-8 px-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center gap-1 border border-border/60 transition-colors"
              title="Create New Cluster View"
            >
              <Plus className="w-3 h-3" /> New Cluster
            </button>
          </div>
        </div>

        {/* Center: Save Feedback Banner */}
        {statusMessage && (
          <div className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full animate-fade-in flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 animate-spin" />
            {statusMessage}
          </div>
        )}

        {/* Right: View Mode Toggle (2D ⇄ 3D) & Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoLayout}
            className="h-8 text-xs font-semibold"
            title="Auto-arrange nodes in balanced circle"
          >
            <Grid className="w-3.5 h-3.5 mr-1 text-muted-foreground" /> Auto-Align
          </Button>

          {/* 2D ⇄ 3D Dimension Morph Switcher */}
          <div className="flex items-center bg-muted/80 p-0.5 rounded-lg border border-border shadow-2xs">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === '2d'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>2D Canvas</span>
            </button>

            <button
              onClick={() => setViewMode('3d')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === '3d'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>3D Universe</span>
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => handleCreateNode()}
            className="h-8 text-xs font-bold shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> New Concept
          </Button>
        </div>
      </header>

      {/* Main Workspace (Viewport + Optional Inspector Drawer) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Viewport: 2D Canvas or 3D Universe */}
        <main className="flex-1 h-full relative overflow-hidden">
          {viewMode === '2d' ? (
            <KnowledgeCanvas2D
              nodes={nodes}
              relations={relations}
              clusters={clusters}
              activeCluster={activeCluster}
              selectedNodeId={selectedNodeId}
              onSelectNode={(node) => setSelectedNodeId(node ? node.id : null)}
              onUpdatePositions={handleUpdatePositions2D}
              onConnectNodes={handleConnectNodes}
              onMorphTo3D={(node) => {
                setSelectedNodeId(node.id);
                setViewMode('3d');
              }}
              onCreateNodeAt={(x, y) => handleCreateNode('New Topic Node', { x, y })}
            />
          ) : (
            <KnowledgeCanvas3D
              nodes={nodes}
              relations={relations}
              clusters={clusters}
              activeCluster={activeCluster}
              selectedNodeId={selectedNodeId}
              onSelectNode={(node) => setSelectedNodeId(node ? node.id : null)}
            />
          )}
        </main>

        {/* Right Drawer: Selected Concept Inspector */}
        {selectedNode && (
          <KnowledgeNodeInspector
            node={selectedNode}
            allNodes={nodes}
            relations={relations}
            clusters={clusters}
            onClose={() => setSelectedNodeId(null)}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onToggleClusterMembership={handleToggleClusterMembership}
            onCreateRelation={handleCreateCustomRelation}
            onDeleteRelation={handleDeleteRelation}
          />
        )}
      </div>

      {/* New Cluster Modal */}
      <KnowledgeClusterModal
        isOpen={isClusterModalOpen}
        onClose={() => setIsClusterModalOpen(false)}
        onCreateCluster={handleCreateCluster}
      />
    </div>
  );
};
