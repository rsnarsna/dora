'use client';

import React, { useEffect, useState } from 'react';
import { useDashboard } from '@/components/dashboard-layout-client';
import { KnowledgeGraphPageClient } from '@/components/knowledge/knowledge-graph-page-client';
import { getKnowledgeGraphAction } from '@/server/actions/knowledge-actions';
import { KnowledgeGraphData } from '@/types/knowledge';

export default function KnowledgePage() {
  const { activeAccount, isLoading } = useDashboard();
  const [data, setData] = useState<KnowledgeGraphData | null>(null);
  const [loadingGraph, setLoadingGraph] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!activeAccount?.id) return;
      setLoadingGraph(true);
      try {
        const res = await getKnowledgeGraphAction(activeAccount.id);
        if (isMounted) setData(res);
      } catch (err) {
        console.error('Failed to load knowledge graph:', err);
      } finally {
        if (isMounted) setLoadingGraph(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [activeAccount?.id]);

  if (isLoading || loadingGraph || !data) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/20 text-muted-foreground text-xs font-mono">
        Loading 2D/3D Knowledge Concept Universe...
      </div>
    );
  }

  return <KnowledgeGraphPageClient initialData={data} />;
}
