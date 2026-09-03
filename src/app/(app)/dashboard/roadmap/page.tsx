'use client';

import React from 'react';
import { useDashboard } from '@/components/dashboard-layout-client';
import { RoadmapBoard } from '@/components/roadmap-board';

export default function RoadmapPage() {
  const { issues, allIssues, personalData } = useDashboard();
  const tasksToUse = allIssues && allIssues.length > 0 ? allIssues : issues;

  if (!tasksToUse || tasksToUse.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/20 text-muted-foreground text-xs">
        Loading tasks for roadmap...
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden flex flex-col">
      <RoadmapBoard tasks={tasksToUse} personalData={personalData} />
    </div>
  );
}
