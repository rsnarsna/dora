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
  Link as LinkIcon, 
  Tag, 
  GripHorizontal,
  CheckCircle2
} from 'lucide-react';

interface KnowledgeNodeCard2DProps {
  node: KnowledgeNode;
  clusters: KnowledgeCluster[];
  isSelected: boolean;
  onSelect: (node: KnowledgeNode) => void;
  onStartConnect: (nodeId: string) => void;
  onMorphTo3D?: (node: KnowledgeNode) => void;
  isConnecting?: boolean;
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
  onSelect,
  onStartConnect,
  onMorphTo3D,
  isConnecting = false,
}) => {
  const memberClusters = clusters.filter((c) => c.nodeIds?.includes(node.id));
  const typeStyle = TYPE_COLORS[node.type] || TYPE_COLORS.concept;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node);
      }}
      className={`group relative w-64 rounded-xl border bg-card/90 backdrop-blur-md p-3.5 shadow-md transition-all duration-200 select-none cursor-pointer hover:shadow-lg ${
        isSelected
          ? 'ring-2 ring-primary border-primary shadow-primary/10'
          : 'border-border hover:border-primary/50'
      } ${isConnecting ? 'ring-2 ring-amber-500/50 border-amber-500 animate-pulse' : ''}`}
      style={{
        borderTop: `4px solid ${node.visualColor || '#326ce5'}`,
      }}
    >
      {/* Top Bar: Shape Icon & Type Badge */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
          <span 
            className="p-1 rounded-md bg-muted/60 text-foreground flex items-center justify-center shrink-0 shadow-2xs"
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
          {onMorphTo3D && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMorphTo3D(node);
              }}
              title="Transform to 3D Space"
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-opacity"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Node Title */}
      <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-1 mb-1">
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
        <div className="flex items-center gap-1 flex-wrap mb-2">
          {memberClusters.slice(0, 3).map((cluster) => (
            <span
              key={cluster.id}
              className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 shrink-0"
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

      {/* Footer Details: Tags / Jira task links */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/60">
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

        {/* Connect Action Button */}
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
      </div>

      {/* Connection Anchor Dots */}
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-border border-2 border-card group-hover:bg-primary transition-colors pointer-events-none" />
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-border border-2 border-card group-hover:bg-primary transition-colors pointer-events-none" />
      <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 rounded-full bg-border border-2 border-card group-hover:bg-primary transition-colors pointer-events-none" />
      <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 rounded-full bg-border border-2 border-card group-hover:bg-primary transition-colors pointer-events-none" />
    </div>
  );
};
