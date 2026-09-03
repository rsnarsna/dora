'use client';

import React from 'react';
import { StatusType, PriorityType } from '@/types';
import { useDashboard } from '@/components/dashboard-layout-client';

interface StatusDonutProps {
  statusCounts: Record<string, number>;
  total: number;
  activeFilter: string;
  onFilterChange: (status: string) => void;
  priorityCounts: Record<string, number>;
  priorityTotal: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  Highest: '#bf2600',
  High: '#de350b',
  Medium: '#ff8b00',
  Low: '#006644',
  Lowest: '#6b778c',
  None: '#97a0af',
};

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const StatusDonut: React.FC<StatusDonutProps> = ({
  statusCounts,
  total,
  activeFilter,
  onFilterChange,
  priorityCounts,
  priorityTotal,
}) => {
  const { appConfig } = useDashboard();
  const STATUS_COLORS = appConfig?.statusColors || {};
  const r = 56;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * r;

  const statusOrder = ['In Progress', 'REVIEW', 'on-hold', 'Done', 'To Do'];
  const otherStatuses = Object.keys(statusCounts).filter((s) => !statusOrder.includes(s));
  const orderedStatuses = [...statusOrder, ...otherStatuses];

  let currentOffset = 0;

  return (
    <Card className="flex flex-col shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          📊 Status Distribution
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="flex items-center gap-6">
          {/* SVG Donut Chart */}
          <div className="relative flex-shrink-0">
            <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="16" />
              {orderedStatuses.map((st) => {
                const count = statusCounts[st] || 0;
                if (count === 0) return null;
                const pct = total > 0 ? count / total : 0;
                const dash = circumference * pct;
                const gap = circumference - dash;
                const color = STATUS_COLORS[st] || '#97a0af';
                const isActive = activeFilter === '' || activeFilter === st;

                const strokeOffset = -currentOffset;
                currentOffset += dash;

                return (
                  <circle
                    key={st}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth="16"
                    strokeDasharray={`${dash} ${gap}`}
                    strokeDashoffset={strokeOffset}
                    className="cursor-pointer transition-opacity duration-200 hover:opacity-100"
                    style={{ opacity: isActive ? 1 : 0.3 }}
                    onClick={() => onFilterChange(st)}
                  >
                    <title>{`${st}: ${count} tasks`}</title>
                  </circle>
                );
              })}
            </svg>
            {/* Inner Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold text-foreground leading-none">{total}</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase mt-0.5">tasks</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-2 flex-1">
            {orderedStatuses.map((st) => {
              const count = statusCounts[st] || 0;
              if (count === 0) return null;
              const pctText = total > 0 ? `${Math.round((count / total) * 100)}%` : '0%';
              const color = STATUS_COLORS[st] || '#97a0af';
              const isActive = activeFilter === '' || activeFilter === st;

              return (
                <div
                  key={st}
                  onClick={() => onFilterChange(st)}
                  className={`flex items-center justify-between text-xs cursor-pointer p-1 rounded transition-colors ${
                    isActive ? 'bg-secondary font-bold text-foreground' : 'opacity-50 text-muted-foreground hover:bg-secondary/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="truncate">{st}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown Bar */}
        <div className="mt-4 pt-3 border-t border-border">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Priority Breakdown
          </div>
          {priorityTotal > 0 ? (
            <div>
              <div className="flex h-2.5 rounded-full overflow-hidden mb-2 bg-muted">
                {['Highest', 'High', 'Medium', 'Low', 'Lowest', 'None'].map((p) => {
                  const pCount = priorityCounts[p] || 0;
                  if (pCount === 0) return null;
                  const pPct = (pCount / priorityTotal) * 100;
                  return (
                    <div
                      key={p}
                      style={{ width: `${pPct}%`, backgroundColor: PRIORITY_COLORS[p] }}
                      title={`${p}: ${pCount} tasks`}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                {['Highest', 'High', 'Medium', 'Low', 'Lowest', 'None'].map((p) => {
                  const pCount = priorityCounts[p] || 0;
                  if (pCount === 0) return null;
                  return (
                    <div key={p} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[p] }} />
                      <span className="font-semibold text-foreground/80">{pCount}</span> {p}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-xs italic text-muted-foreground">No priority data available</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

