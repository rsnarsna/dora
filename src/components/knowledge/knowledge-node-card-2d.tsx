'use client';

import React from 'react';
import { KnowledgeNode, KnowledgeCluster } from '@/types/knowledge';
import { Badge } from '@/components/ui/badge';
import { 
  Box, 
  Hexagon, 
  Database, 
  Star, 
  Shield, 
  Layers, 
  Maximize2, 
  Minimize2,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon, 
  Tag, 
  Sparkles,
  FileText
} from 'lucide-react';

interface KnowledgeNodeCard2DProps {
  node: KnowledgeNode;
  clusters: KnowledgeCluster[];
  isSelected: boolean;
  isExpanded: boolean;
  onToggleExpand: (nodeId: string) => void;
  onSelect: (node: KnowledgeNode) => void;
  onStartConnect: (nodeId: string) => void;
  onMorphTo3D?: (node: KnowledgeNode) => void;
  onOpenInspector?: (node: KnowledgeNode) => void;
  isConnecting?: boolean;
  connectedCount?: number;
}

const SHAPE_ICONS: Record<string, React.ReactNode> = {
  hex: <Hexagon className="w-3.5 h-3.5" />,
  box: <Box className="w-3.5 h-3.5" />,
  cylinder: <Database className="w-3.5 h-3.5" />,
  star: <Star className="w-3.5 h-3.5" />,
  shield: <Shield className="w-3.5 h-3.5" />,
  platform: <Layers className="w-3.5 h-3.5" />,
};

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  concept: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
  skill: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30' },
  project: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  topic: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  tool: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30' },
  constraint: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/30' },
};

export const KnowledgeNodeCard2D: React.FC<KnowledgeNodeCard2DProps> = ({
  node,
  clusters,
  isSelected,
  isExpanded,
  onToggleExpand,
  onSelect,
  onStartConnect,
  onMorphTo3D,
  onOpenInspector,
  isConnecting = false,
  connectedCount = 0,
}) => {
  const memberClusters = clusters.filter((c) => c.nodeIds?.includes(node.id));
  const typeStyle = TYPE_COLORS[node.type] || TYPE_COLORS.concept;

  // -------------------------------------------------------------
  // 1. MINIMAL ICON VIEW (Default Initial Playground State)
  // Clean, minimal icon token with connection points & click-to-expand
  // -------------------------------------------------------------
  if (!isExpanded) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node);
          onToggleExpand(node.id);
        }}
        className={`group relative flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-200 hover:scale-110 ${
          isSelected ? 'scale-105' : ''
        }`}
        title={`Click to expand concept "${node.title}"`}
      >
        {/* Minimal Shape / Icon Token */}
        <div
          className={`relative w-14 h-14 rounded-2xl flex items-center justify-center bg-card/95 backdrop-blur-md shadow-md transition-all duration-300 ${
            isSelected
              ? 'ring-3 ring-primary shadow-lg border-primary shadow-primary/25'
              : 'border border-border/80 group-hover:border-primary/60 group-hover:shadow-lg'
          } ${isConnecting ? 'ring-3 ring-amber-500 border-amber-500 animate-pulse' : ''}`}
          style={{
            borderTop: `3px solid ${node.visualColor || '#326ce5'}`,
            boxShadow: isSelected
              ? `0 0 16px ${node.visualColor || '#326ce5'}40`
              : undefined,
          }}
        >
          {/* Main Visual Shape Icon */}
          <div
            className="w-7 h-7 flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ color: node.visualColor || '#326ce5' }}
          >
            {SHAPE_ICONS[node.visualShape] || SHAPE_ICONS.hex}
          </div>

          {/* Connected Links Badge at Top-Right */}
          {connectedCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-extrabold font-mono flex items-center justify-center shadow-xs border-2 border-card"
              title={`${connectedCount} active connections`}
            >
              {connectedCount}
            </span>
          )}

          {/* Subtle Expand Hint on Hover */}
          <div className="absolute inset-0 rounded-2xl bg-primary/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Maximize2 className="w-3.5 h-3.5 text-primary" />
          </div>

          {/* Connection Anchor Ports on all 4 cardinal points */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-border border border-card group-hover:bg-primary transition-colors pointer-events-none" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-border border border-card group-hover:bg-primary transition-colors pointer-events-none" />
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 rounded-full bg-border border border-card group-hover:bg-primary transition-colors pointer-events-none" />
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 rounded-full bg-border border border-card group-hover:bg-primary transition-colors pointer-events-none" />
        </div>

        {/* Minimal Concept Title Label Pill */}
        <div className="mt-1.5 px-2 py-0.5 rounded-full bg-card/90 backdrop-blur-md border border-border/80 shadow-xs max-w-[130px] flex items-center gap-1 group-hover:border-primary/50 transition-colors">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: node.visualColor || '#326ce5' }}
          />
          <span className="text-[11px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
            {node.title}
          </span>
          <ChevronDown className="w-2.5 h-2.5 text-muted-foreground shrink-0 opacity-60 group-hover:opacity-100" />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. EXPANDED INTERACTIVE CARD VIEW
  // Expanded on click to validate the full flow, relations, notes & 3D
  // -------------------------------------------------------------
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node);
      }}
      className={`group relative w-72 rounded-2xl border bg-card/95 backdrop-blur-xl p-4 shadow-xl transition-all duration-200 select-none cursor-pointer animate-in zoom-in-95 ${
        isSelected
          ? 'ring-2 ring-primary border-primary shadow-primary/20'
          : 'border-border hover:border-primary/50'
      } ${isConnecting ? 'ring-2 ring-amber-500/50 border-amber-500 animate-pulse' : ''}`}
      style={{
        borderTop: `4px solid ${node.visualColor || '#326ce5'}`,
      }}
    >
      {/* Top Bar: Shape Icon, Visual Name & Controls */}
      <div className="flex items-center justify-between gap-1.5 mb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
          <span 
            className="w-5 h-5 p-0.5 rounded-md bg-muted/60 text-foreground flex items-center justify-center shrink-0 shadow-2xs"
            style={{ color: node.visualColor }}
          >
            {SHAPE_ICONS[node.visualShape] || SHAPE_ICONS.hex}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {node.visualShape}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Badge
            variant="outline"
            className={`text-[9px] font-bold px-1.5 py-0 h-4 uppercase tracking-wider ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
          >
            {node.type}
          </Badge>

          {/* Morph to 3D View Button */}
          {onMorphTo3D && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMorphTo3D(node);
              }}
              title="Transform to 3D Space"
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </button>
          )}

          {/* Collapse to Minimal Icon */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            title="Collapse to minimal icon"
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Node Title */}
      <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors leading-snug mb-1">
        {node.title}
      </h3>

      {/* Summary preview */}
      {node.summary && (
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-2.5">
          {node.summary}
        </p>
      )}

      {/* Multi-Context Clusters Pills */}
      {memberClusters.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mb-2.5">
          {memberClusters.slice(0, 3).map((cluster) => (
            <span
              key={cluster.id}
              className="text-[9px] px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 shrink-0"
              style={{
                backgroundColor: `${cluster.color}15`,
                color: cluster.color,
                borderColor: `${cluster.color}35`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cluster.color }} />
              {cluster.name}
            </span>
          ))}
          {memberClusters.length > 3 && (
            <span className="text-[9px] text-muted-foreground font-mono">
              +{memberClusters.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer Details: Tags / Jira task links & Action Buttons */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2.5 border-t border-border/60">
        <div className="flex items-center gap-1">
          {node.jiraTaskKeys && node.jiraTaskKeys.length > 0 ? (
            <span className="flex items-center gap-1 text-primary font-mono font-semibold">
              <LinkIcon className="w-2.5 h-2.5" />
              {node.jiraTaskKeys[0]}
              {node.jiraTaskKeys.length > 1 && `+${node.jiraTaskKeys.length - 1}`}
            </span>
          ) : (
            <span className="text-muted-foreground/60 italic">Standalone Concept</span>
          )}
        </div>

        {/* Action Buttons: Connect, Inspect, Collapse */}
        <div className="flex items-center gap-1.5">
          {onOpenInspector && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenInspector(node);
              }}
              className="px-2 py-0.5 rounded bg-muted/80 hover:bg-muted text-[10px] font-semibold text-foreground transition-colors flex items-center gap-1"
              title="Open full inspector drawer"
            >
              <FileText className="w-2.5 h-2.5" /> Notes
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartConnect(node.id);
            }}
            className="px-2 py-0.5 rounded bg-muted/80 hover:bg-primary hover:text-primary-foreground text-[10px] font-semibold transition-colors flex items-center gap-1"
            title="Connect to another concept"
          >
            <LinkIcon className="w-2.5 h-2.5" /> Connect
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Collapse"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Connection Anchor Dots on all 4 card borders */}
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-border border-2 border-card group-hover:bg-primary transition-colors pointer-events-none" />
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-border border-2 border-card group-hover:bg-primary transition-colors pointer-events-none" />
      <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 rounded-full bg-border border-2 border-card group-hover:bg-primary transition-colors pointer-events-none" />
      <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 rounded-full bg-border border-2 border-card group-hover:bg-primary transition-colors pointer-events-none" />
    </div>
  );
};
