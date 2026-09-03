'use client';

import React from 'react';
import { useDashboard } from '@/components/dashboard-layout-client';
import { RoadmapBoard } from '@/components/roadmap-board';

export default function RoadmapPage() {
  const { domainIssues, issues, allIssues, activeAccount, personalData, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/20 text-muted-foreground text-xs">
        Loading tasks for roadmap...
      </div>
    );
  }

  // Filter tasks specifically for the active account's domain
  const accountTasks = (() => {
    if (!activeAccount) return issues || [];
    
    // If account has a specific domain, only take tasks from that domain
    if (activeAccount.jiraDomain && activeAccount.jiraDomain !== 'all') {
      const filtered = (allIssues || []).filter(
        (t: any) => !t.domain || t.domain === activeAccount.jiraDomain
      );
      if (filtered.length > 0) return filtered;
      if (domainIssues && domainIssues.length > 0) return domainIssues;
    }
    
    return domainIssues && domainIssues.length > 0 ? domainIssues : (issues || []);
  })();

  return (
    <div className="h-full w-full overflow-hidden flex flex-col">
      <RoadmapBoard tasks={accountTasks} personalData={personalData} />
    </div>
  );
}
