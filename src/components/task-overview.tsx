'use client';

import React from 'react';
import { RawJiraIssue, PersonalDataMap } from '@/types';
import { Tag } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboard } from '@/components/dashboard-layout-client';

interface TaskOverviewProps {
  tasks: RawJiraIssue[];
  personalData: PersonalDataMap;
  activeFilter: string;
  onSelectTask: (key: string) => void;
}

export const TaskOverview: React.FC<TaskOverviewProps> = ({
  tasks,
  personalData,
  activeFilter,
  onSelectTask,
}) => {
  const { appConfig } = useDashboard();
  const STATUS_COLORS = appConfig?.statusThemes || {};
  // Group tasks by status
  const grouped: Record<string, RawJiraIssue[]> = {};
  tasks.forEach((t) => {
    const st = t.status || 'To Do';
    if (!grouped[st]) grouped[st] = [];
    grouped[st].push(t);
  });

  const statusOrder = ['In Progress', 'REVIEW', 'on-hold', 'Done', 'To Do'];
  const otherStatuses = Object.keys(grouped).filter((s) => !statusOrder.includes(s));
  const orderedStatuses = [...statusOrder, ...otherStatuses];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            📋 Task Overview
          </CardTitle>
          <span className="text-xs font-normal text-muted-foreground">
            Showing {tasks.length} total tasks
          </span>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {orderedStatuses.map((st) => {
            const list = grouped[st] || [];
            if (list.length === 0) return null;
            if (activeFilter && activeFilter !== st) return null;

            const theme = STATUS_COLORS[st] || { bg: '#f4f5f7', fg: '#5e6c84', border: '#97a0af' };

            return (
              <div key={st} className="space-y-3">
                {/* Status Header */}
                <div
                  className="flex items-center gap-2 pb-2 border-b-2"
                  style={{ borderColor: theme.border }}
                >
                  <span
                    className="px-2.5 py-0.5 rounded text-xs font-bold"
                    style={{ backgroundColor: theme.bg, color: theme.fg }}
                  >
                    {st}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">({list.length} items)</span>
                </div>

                {/* Task Items List */}
                <div className="border border-border rounded-md overflow-hidden bg-card divide-y divide-border">
                  {list.map((task) => {
                    const nickname = personalData[task.key]?.nickname;
                    
                    let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
                    if (task.priority === 'Highest' || task.priority === 'High') variant = "destructive";
                    else if (task.priority === 'Medium') variant = "default";
                    else if (task.priority === 'Low') variant = "secondary";

                    return (
                      <div
                        key={task.key}
                        onClick={() => onSelectTask(task.key)}
                        className="p-3 hover:bg-muted cursor-pointer transition-colors flex items-center gap-3 text-xs"
                      >
                        <Badge variant={variant} className="text-[10px] px-2 py-0">
                          {task.priority}
                        </Badge>
                        <span className="font-semibold text-primary whitespace-nowrap">
                          {task.issue_type} {task.key}
                        </span>

                        {nickname && (
                          <Badge variant="secondary" className="gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-indigo-200">
                            <Tag className="w-3 h-3" /> {nickname}
                          </Badge>
                        )}

                        <span className="text-foreground font-medium truncate flex-1">{task.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
