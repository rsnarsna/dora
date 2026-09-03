'use client';

import React from 'react';
import { useDashboard } from '@/components/dashboard-layout-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusDonut } from '@/components/status-donut';
import { FocusTimer } from '@/components/focus-timer';
import { QuickTodo } from '@/components/quick-todo';
import { TaskOverview } from '@/components/task-overview';
import { AdvancedAnalytics } from '@/components/advanced-analytics';
import { Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { 
    issues, 
    personalData, 
    hierarchy, 
    activeStatusFilter, 
    setActiveStatusFilter,
    loadData 
  } = useDashboard();
  
  const router = useRouter();

  // Compute status counts & priority breakdown
  const statusCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};
  let totalTasks = 0;
  let priorityTotal = 0;

  issues.forEach((t: any) => {
    const st = t.status || 'To Do';
    statusCounts[st] = (statusCounts[st] || 0) + 1;
    totalTasks++;

    if (activeStatusFilter === '' || activeStatusFilter === st) {
      const prio = t.priority || 'None';
      priorityCounts[prio] = (priorityCounts[prio] || 0) + 1;
      priorityTotal++;
    }
  });

  // Upcoming targets
  const upcomingTasks = Object.entries(personalData)
    .filter(([_, p]: [string, any]) => p.self_target)
    .map(([key, p]: [string, any]) => {
      const issue = issues.find((i: any) => i.key === key);
      return {
        key,
        title: p.nickname || issue?.title || key,
        target: p.self_target!,
      };
    })
    .sort((a, b) => a.target.localeCompare(b.target))
    .slice(0, 5);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-muted/20">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Top 4 Dashboard Widget Grid (2x2 Matrix) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StatusDonut
              statusCounts={statusCounts}
              total={totalTasks}
              activeFilter={activeStatusFilter}
              onFilterChange={(st: string) =>
                setActiveStatusFilter(activeStatusFilter === st ? '' : st)
              }
              priorityCounts={priorityCounts}
              priorityTotal={priorityTotal}
            />

            <FocusTimer />
            <QuickTodo />

            {/* Upcoming Self-Targets + Recent Activity — matches Python build_dashboard.py 4th card */}
            <Card className="flex flex-col shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Target className="w-4 h-4 text-red-500" /> Upcoming Targets
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="space-y-2">
                  {upcomingTasks.length > 0 ? (
                    upcomingTasks.map((ut) => (
                      <div
                        key={ut.key}
                        onClick={() => router.push(`/dashboard/${ut.key}`)}
                        className="flex items-center gap-2 text-xs p-2 rounded-md hover:bg-secondary cursor-pointer border-b border-border last:border-0"
                      >
                        <Badge variant="destructive" className="px-1.5 text-[10px]">
                          {ut.target}
                        </Badge>
                        <span className="text-foreground font-medium truncate flex-1">
                          {ut.title}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs italic text-muted-foreground py-2">
                      No self-target deadlines set.
                    </div>
                  )}
                </div>

                {/* Recent Activity — Latest Notes Log (from Python build_dashboard.py) */}
                <div className="border-t pt-3">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Latest Notes Log</div>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto">
                    {(() => {
                      const activities: { type: string; taskKey: string; name: string; ts: string; text: string }[] = [];
                      Object.entries(personalData).forEach(([taskKey, pdata]: [string, any]) => {
                        const issue = issues.find((i: any) => i.key === taskKey);
                        const displayName = pdata.nickname || issue?.title || taskKey;
                        (pdata.notes_log || []).forEach((n: any) => {
                          activities.push({ type: 'note', taskKey, name: displayName, ts: n.timestamp, text: (n.note || '').slice(0, 80) });
                        });
                        (pdata.daily_updates || []).forEach((u: any) => {
                          activities.push({ type: 'update', taskKey, name: displayName, ts: u.timestamp, text: (u.update || '').slice(0, 80) });
                        });
                      });
                      const recent = activities.slice(-8).reverse();
                      if (recent.length === 0) {
                        return <div className="text-xs italic text-muted-foreground">No recent activity yet. Start adding notes!</div>;
                      }
                      return recent.map((act, idx) => (
                        <div key={idx} className="flex gap-2 items-start text-xs">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] ${
                            act.type === 'note' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {act.type === 'note' ? '📝' : '📊'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] text-muted-foreground">
                              {act.ts} · <span 
                                className="text-primary font-semibold cursor-pointer hover:underline"
                                onClick={() => router.push(`/dashboard/${act.taskKey}`)}
                              >{act.taskKey}</span>
                            </div>
                            <div className="text-foreground truncate">{act.text}</div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Main Area: Tabs for Task List vs Advanced Analysis */}
          <Tabs defaultValue="list" className="w-full">
            <div className="flex items-center justify-between mb-2">
              <TabsList>
                <TabsTrigger value="list" className="text-xs">Task List</TabsTrigger>
                <TabsTrigger value="analysis" className="text-xs">Deep Analysis (Nivo)</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="list" className="mt-0">
              <TaskOverview
                tasks={issues}
                personalData={personalData}
                activeFilter={activeStatusFilter}
                onSelectTask={(key: string) => router.push(`/dashboard/${key}`)}
              />
            </TabsContent>
            
            <TabsContent value="analysis" className="mt-0 h-[600px] border border-border rounded-xl">
              <AdvancedAnalytics tasks={issues} hierarchy={hierarchy} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
