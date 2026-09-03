'use client';

import { useDashboard } from '@/components/dashboard-layout-client';
import { TaskDetailPanel } from '@/components/task-detail-panel';
import { useParams } from 'next/navigation';
import { RawJiraIssue, PersonalRecord } from '@/types';

export default function TaskDetailPage() {
  const { taskId } = useParams();
  const { issues, allIssues, personalData, loadData, appConfig } = useDashboard();
  
  const issuesPool = (allIssues && allIssues.length > 0) ? allIssues : issues;

  if (!issuesPool || issuesPool.length === 0) {
    return <div className="p-6">Loading task details...</div>;
  }

  const task = issuesPool.find((i: RawJiraIssue) => i.key === taskId);
  const personalRecord = personalData[taskId as string] || {} as PersonalRecord;

  if (!task) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/20 text-muted-foreground">
        Task {taskId} not found.
      </div>
    );
  }

  // Find all subtasks & children of this task from full issues pool
  const children = issuesPool.filter((i: RawJiraIssue) => i.parent_key === task.key);

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      <TaskDetailPanel 
        task={task} 
        personalRecord={personalRecord} 
        children={children}
        allIssues={issuesPool}
        statusColors={appConfig?.statusColors || {}}
        statusThemes={appConfig?.statusThemes || {}}
        onRefreshData={loadData} 
      />
    </div>
  );
}
