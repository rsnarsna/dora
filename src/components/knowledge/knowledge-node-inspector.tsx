'use client';

import React, { useState, useEffect } from 'react';
import { KnowledgeNode, KnowledgeRelation, KnowledgeCluster, KnowledgeNodeType, KnowledgeVisualShape, KnowledgeRelationType } from '@/types/knowledge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Trash2, 
  Link as LinkIcon, 
  Plus, 
  ExternalLink, 
  Share2, 
  Sparkles, 
  BookOpen, 
  FolderKanban, 
  CheckSquare, 
  Square,
  ArrowRight,
  Hexagon,
  Box,
  Database,
  Star,
  Shield,
  Layers,
  PenTool
} from 'lucide-react';
import Link from 'next/link';

interface KnowledgeNodeInspectorProps {
  node: KnowledgeNode | null;
  allNodes: KnowledgeNode[];
  relations: KnowledgeRelation[];
  clusters: KnowledgeCluster[];
  onClose: () => void;
  onUpdateNode: (updated: KnowledgeNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onToggleClusterMembership: (clusterId: string, nodeId: string) => void;
  onCreateRelation: (sourceId: string, targetId: string, type: KnowledgeRelationType, label: string) => void;
  onDeleteRelation: (relationId: string) => void;
}

const SHAPES: { value: KnowledgeVisualShape; label: string; icon: React.ReactNode }[] = [
  { value: 'hex', label: 'Hexagon (Skill)', icon: <Hexagon className="w-3.5 h-3.5" /> },
  { value: 'box', label: 'Box (System)', icon: <Box className="w-3.5 h-3.5" /> },
  { value: 'cylinder', label: 'Cylinder (Data)', icon: <Database className="w-3.5 h-3.5" /> },
  { value: 'star', label: 'Star (Goal/API)', icon: <Star className="w-3.5 h-3.5" /> },
  { value: 'shield', label: 'Shield (Constraint)', icon: <Shield className="w-3.5 h-3.5" /> },
  { value: 'platform', label: 'Platform (Base)', icon: <Layers className="w-3.5 h-3.5" /> },
];

const NODE_TYPES: KnowledgeNodeType[] = ['concept', 'skill', 'project', 'topic', 'tool', 'constraint'];
const RELATION_TYPES: KnowledgeRelationType[] = ['depends_on', 'implements', 'part_of', 'monitors', 'relates_to', 'feeds'];
const COLOR_PRESETS = ['#0052cc', '#6554c0', '#00875a', '#ff5630', '#ff8b00', '#00b8d9', '#36b37e'];

export const KnowledgeNodeInspector: React.FC<KnowledgeNodeInspectorProps> = ({
  node,
  allNodes,
  relations,
  clusters,
  onClose,
  onUpdateNode,
  onDeleteNode,
  onToggleClusterMembership,
  onCreateRelation,
  onDeleteRelation,
}) => {
  if (!node) return null;

  // Local form state
  const [title, setTitle] = useState(node.title);
  const [summary, setSummary] = useState(node.summary || '');
  const [content, setContent] = useState(node.content || '');
  const [type, setType] = useState<KnowledgeNodeType>(node.type);
  const [visualShape, setVisualShape] = useState<KnowledgeVisualShape>(node.visualShape);
  const [visualColor, setVisualColor] = useState(node.visualColor || '#326ce5');
  const [newJiraKey, setNewJiraKey] = useState('');

  // New Relation state
  const [relTargetId, setRelTargetId] = useState('');
  const [relType, setRelType] = useState<KnowledgeRelationType>('relates_to');
  const [relLabel, setRelLabel] = useState('');

  useEffect(() => {
    setTitle(node.title);
    setSummary(node.summary || '');
    setContent(node.content || '');
    setType(node.type);
    setVisualShape(node.visualShape);
    setVisualColor(node.visualColor || '#326ce5');
  }, [node]);

  const handleSaveField = (updates: Partial<KnowledgeNode>) => {
    const updated: KnowledgeNode = {
      ...node,
      ...updates,
    };
    onUpdateNode(updated);
  };

  const handleAddJiraKey = () => {
    if (!newJiraKey.trim()) return;
    const cleanKey = newJiraKey.trim().toUpperCase();
    const current = node.jiraTaskKeys || [];
    if (!current.includes(cleanKey)) {
      const updatedKeys = [...current, cleanKey];
      handleSaveField({ jiraTaskKeys: updatedKeys });
    }
    setNewJiraKey('');
  };

  const handleRemoveJiraKey = (keyToRemove: string) => {
    const current = node.jiraTaskKeys || [];
    const updatedKeys = current.filter((k) => k !== keyToRemove);
    handleSaveField({ jiraTaskKeys: updatedKeys });
  };

  const handleCreateRelationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!relTargetId) return;
    onCreateRelation(node.id, relTargetId, relType, relLabel.trim());
    setRelTargetId('');
    setRelLabel('');
  };

  // Connected relations
  const outgoingRelations = relations.filter((r) => r.sourceNodeId === node.id);
  const incomingRelations = relations.filter((r) => r.targetNodeId === node.id);

  // Available target nodes (excluding self)
  const otherNodes = allNodes.filter((n) => n.id !== node.id);

  return (
    <aside className="w-88 md:w-96 border-l border-border bg-card/95 backdrop-blur-md flex flex-col h-full shadow-2xl z-30 overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 border-b border-border flex items-center justify-between gap-2"
        style={{ borderTop: `4px solid ${visualColor}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span 
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
            style={{ 
              backgroundColor: `${visualColor}20`, 
              color: visualColor,
              borderColor: `${visualColor}40`
            }}
          >
            {SHAPES.find((s) => s.value === visualShape)?.icon || <Hexagon className="w-4 h-4" />}
          </span>
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
              Knowledge Node
            </span>
            <h2 className="font-bold text-sm text-foreground truncate">
              {title}
            </h2>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body / Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Title & Type Configuration */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Concept Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleSaveField({ title })}
              placeholder="e.g. Indexer"
              className="font-semibold text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Concept Type
              </label>
              <select
                value={type}
                onChange={(e) => {
                  const t = e.target.value as KnowledgeNodeType;
                  setType(t);
                  handleSaveField({ type: t });
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary capitalize"
              >
                {NODE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                3D Shape
              </label>
              <select
                value={visualShape}
                onChange={(e) => {
                  const s = e.target.value as KnowledgeVisualShape;
                  setVisualShape(s);
                  handleSaveField({ visualShape: s });
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {SHAPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              3D Emissive Color
            </label>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setVisualColor(color);
                    handleSaveField({ visualColor: color });
                  }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    visualColor === color ? 'scale-110 border-white ring-2 ring-primary/40' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              One-Sentence Summary
            </label>
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              onBlur={() => handleSaveField({ summary })}
              placeholder="Brief conceptual definition..."
              className="text-xs"
            />
          </div>
        </div>

        {/* Multi-Context Cluster Membership ("Reuse Everywhere") */}
        <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-primary" />
              Cluster Contexts ({clusters.filter((c) => c.nodeIds?.includes(node.id)).length})
            </span>
            <span className="text-[10px] text-muted-foreground italic">
              Create once, reuse everywhere
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            {clusters.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No clusters created yet.</p>
            ) : (
              clusters.map((cluster) => {
                const isMember = cluster.nodeIds?.includes(node.id);
                return (
                  <div
                    key={cluster.id}
                    onClick={() => onToggleClusterMembership(cluster.id, node.id)}
                    className="flex items-center justify-between p-1.5 rounded hover:bg-muted/80 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isMember ? (
                        <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-foreground">
                        {cluster.name}
                      </span>
                    </div>
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: cluster.color }} 
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sandboxed Reflection & Thoughts (Markdown Notes) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              Sandboxed Thoughts & Trade-offs
            </label>
            <span className="text-[10px] text-muted-foreground">Markdown Supported</span>
          </div>
          <Textarea
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={() => handleSaveField({ content })}
            placeholder="Write your personal understanding, mental model, edge cases, and architectural reflections here..."
            className="text-xs font-mono leading-relaxed"
          />
        </div>

        {/* Linked Jira Deliverables */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-primary" />
            Connected Jira Deliverables
          </label>

          <div className="flex items-center gap-1.5 flex-wrap">
            {node.jiraTaskKeys && node.jiraTaskKeys.length > 0 ? (
              node.jiraTaskKeys.map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-mono font-bold"
                >
                  <Link href={`/dashboard/${k}`} className="hover:underline flex items-center gap-1">
                    {k}
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </Link>
                  <button
                    onClick={() => handleRemoveJiraKey(k)}
                    className="hover:text-destructive text-muted-foreground ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">No Jira tickets linked yet.</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Input
              value={newJiraKey}
              onChange={(e) => setNewJiraKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddJiraKey();
                }
              }}
              placeholder="e.g. SCRUM-181"
              className="h-8 text-xs font-mono uppercase"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddJiraKey}
              className="h-8 text-xs shrink-0"
            >
              <Plus className="w-3 h-3 mr-1" /> Link
            </Button>
          </div>
        </div>

        {/* Kubernetes 3D Environment Bridge */}
        <div className="space-y-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5 text-primary" />
              K8s 3D Architecture Canvas
            </label>
            <Badge variant="secondary" className="text-[9px] font-mono">
              3D Sandbox
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Map and connect this concept with cloud workloads, data stores, and ingress gateways in the 3D architecture studio.
          </p>

          <Link
            href="/dashboard/k8s-draw"
            className="flex items-center justify-center gap-1.5 p-2 rounded-md border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-2xs w-full"
          >
            <PenTool className="w-3.5 h-3.5 text-indigo-500" />
            <span>Open in K8s 3D Architecture Studio</span>
          </Link>
        </div>

        {/* Semantic Relationships Graph */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-primary" />
              Connected Relationships ({outgoingRelations.length + incomingRelations.length})
            </label>
          </div>

          {/* Outgoing Edges */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Outgoing Dependencies
            </span>
            {outgoingRelations.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic">No outgoing connections.</p>
            ) : (
              outgoingRelations.map((rel) => {
                const targetNode = allNodes.find((n) => n.id === rel.targetNodeId);
                return (
                  <div
                    key={rel.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-border bg-card text-xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-foreground truncate">
                        {targetNode?.title || rel.targetNodeId}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                        {rel.relationType}
                      </Badge>
                      {rel.label && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          ({rel.label})
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteRelation(rel.id)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                      title="Remove Connection"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Incoming Edges */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Incoming Dependents
            </span>
            {incomingRelations.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic">No incoming connections.</p>
            ) : (
              incomingRelations.map((rel) => {
                const sourceNode = allNodes.find((n) => n.id === rel.sourceNodeId);
                return (
                  <div
                    key={rel.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-border bg-card text-xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-foreground truncate">
                        {sourceNode?.title || rel.sourceNodeId}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                        {rel.relationType}
                      </Badge>
                    </div>
                    <button
                      onClick={() => onDeleteRelation(rel.id)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                      title="Remove Connection"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Connection Form */}
          <form onSubmit={handleCreateRelationSubmit} className="space-y-2 p-3 rounded-lg border border-dashed border-border/80 bg-muted/20">
            <span className="text-xs font-bold text-foreground block">
              + Connect to Another Concept
            </span>

            <select
              value={relTargetId}
              onChange={(e) => setRelTargetId(e.target.value)}
              className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">-- Select Target Concept --</option>
              {otherNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title} ({n.type})
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={relType}
                onChange={(e) => setRelType(e.target.value as KnowledgeRelationType)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {RELATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <Input
                value={relLabel}
                onChange={(e) => setRelLabel(e.target.value)}
                placeholder="Label (optional)"
                className="h-8 text-xs"
              />
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={!relTargetId}
              className="w-full h-8 text-xs font-semibold"
            >
              Establish Connection
            </Button>
          </form>
        </div>

        {/* Delete Concept Section */}
        <div className="pt-4 border-t border-border flex justify-end">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm(`Delete concept "${node.title}"? This will remove all connections.`)) {
                onDeleteNode(node.id);
              }
            }}
            className="text-xs h-8"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Concept
          </Button>
        </div>
      </div>
    </aside>
  );
};
