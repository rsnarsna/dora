'use client';

import React, { useState, useMemo } from 'react';
import { RawJiraIssue, PersonalDataMap } from '@/types';
import { RoadmapGroup, AppConfig } from '@/lib/app-config';
import { useDashboard } from '@/components/dashboard-layout-client';
import { saveAppConfigAction } from '@/server/actions/config-actions';
import { calculateBufferDays } from '@/lib/jira-utils';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Layers, 
  Calendar, 
  Clock, 
  User, 
  Tag, 
  ArrowRight, 
  CheckCircle2, 
  PlayCircle, 
  CircleDashed,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
  ExternalLink
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

interface RoadmapBoardProps {
  tasks: RawJiraIssue[];
  personalData: PersonalDataMap;
}

const PRIORITY_RANK: Record<string, number> = {
  Highest: 1,
  High: 2,
  Medium: 3,
  Low: 4,
  Lowest: 5,
  None: 6,
};

const GROUP_COLORS = [
  '#0052cc', // Blue
  '#00875a', // Green
  '#6554c0', // Purple
  '#ff5630', // Red
  '#ff8b00', // Orange
  '#00b8d9', // Cyan
];

export const RoadmapBoard: React.FC<RoadmapBoardProps> = ({ tasks, personalData }) => {
  const { appConfig } = useDashboard();

  // Local state for roadmap groups
  const [groups, setGroups] = useState<RoadmapGroup[]>(
    appConfig?.roadmapGroups && appConfig.roadmapGroups.length > 0
      ? appConfig.roadmapGroups
      : [
          { id: 'group-1', name: 'Sprint Milestone 1: Server & Infrastructure Setup', color: '#0052cc', taskKeys: ['SCRUM-179', 'SCRUM-180'] },
          { id: 'group-2', name: 'Sprint Milestone 2: Security & Splunk Ingestion', color: '#00875a', taskKeys: ['SCRUM-181', 'SCRUM-182', 'SCRUM-168'] },
          { id: 'group-3', name: 'Planned Next: Content Prep & Showcase Deliverables', color: '#6554c0', taskKeys: ['SCRUM-97', 'SCRUM-98', 'SCRUM-135'] },
        ]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'sprint' | 'backlog'>('all');
  const [sortBy, setSortBy] = useState<'timeline' | 'priority'>('timeline');
  const [newGroupName, setNewGroupName] = useState('');
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>('All changes saved');

  // Set of all task keys currently placed in any group
  const groupedKeysSet = useMemo(() => {
    const s = new Set<string>();
    groups.forEach((g) => g.taskKeys.forEach((k) => s.add(k)));
    return s;
  }, [groups]);

  // Tasks mapped by key for instant lookup
  const taskMap = useMemo(() => {
    const m = new Map<string, RawJiraIssue>();
    tasks.forEach((t) => m.set(t.key, t));
    return m;
  }, [tasks]);

  // Auto-aligned Queue (Available Pool)
  const queueTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (groupedKeysSet.has(t.key)) return false;
        if (scopeFilter === 'sprint' && !t.in_active_sprint) return false;
        if (scopeFilter === 'backlog' && t.in_active_sprint) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const title = (t.title || '').toLowerCase();
          const key = (t.key || '').toLowerCase();
          const nick = (personalData[t.key]?.nickname || '').toLowerCase();
          const assignee = (t.assignee || '').toLowerCase();
          if (!title.includes(q) && !key.includes(q) && !nick.includes(q) && !assignee.includes(q)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') {
          const pA = PRIORITY_RANK[a.priority] || 99;
          const pB = PRIORITY_RANK[b.priority] || 99;
          if (pA !== pB) return pA - pB;
        }
        // Timeline sorting: earliest official deadline or start date
        const dateA = a.official_deadline && a.official_deadline !== 'Not Set' ? a.official_deadline : a.start_date || '9999-99-99';
        const dateB = b.official_deadline && b.official_deadline !== 'Not Set' ? b.official_deadline : b.start_date || '9999-99-99';
        return dateA.localeCompare(dateB);
      });
  }, [tasks, groupedKeysSet, scopeFilter, searchQuery, sortBy, personalData]);

  // Save to Supabase
  const persistGroups = async (updatedGroups: RoadmapGroup[]) => {
    setGroups(updatedGroups);
    setSaveStatus('Saving...');
    try {
      if (appConfig) {
        const updatedConfig: AppConfig = { ...appConfig, roadmapGroups: updatedGroups };
        await saveAppConfigAction(updatedConfig);
      }
      setSaveStatus('Saved to Supabase');
      setTimeout(() => setSaveStatus('All changes saved'), 2500);
    } catch (error) {
      console.error('Failed to save roadmap groups:', error);
      setSaveStatus('Error saving');
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, key: string) => {
    setDraggedKey(key);
    e.dataTransfer.setData('text/plain', key);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverGroupId !== groupId) {
      setDragOverGroupId(groupId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, groupId: string) => {
    if (dragOverGroupId === groupId) {
      setDragOverGroupId(null);
    }
  };

  const handleDropInGroup = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    setDragOverGroupId(null);
    const key = e.dataTransfer.getData('text/plain') || draggedKey;
    if (!key) return;

    // Remove key from all groups, then insert into target group
    const updated = groups.map((g) => {
      const filtered = g.taskKeys.filter((k) => k !== key);
      if (g.id === targetGroupId) {
        return { ...g, taskKeys: [...filtered, key] };
      }
      return { ...g, taskKeys: filtered };
    });

    persistGroups(updated);
    setDraggedKey(null);
  };

  const handleDropInQueue = (e: React.DragEvent) => {
    e.preventDefault();
    const key = e.dataTransfer.getData('text/plain') || draggedKey;
    if (!key) return;

    // Remove key from any group
    const updated = groups.map((g) => ({
      ...g,
      taskKeys: g.taskKeys.filter((k) => k !== key),
    }));

    persistGroups(updated);
    setDraggedKey(null);
  };

  const handleRemoveTaskFromGroup = (groupId: string, key: string) => {
    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      return { ...g, taskKeys: g.taskKeys.filter((k) => k !== key) };
    });
    persistGroups(updated);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: RoadmapGroup = {
      id: `group-${Date.now()}`,
      name: newGroupName.trim(),
      color: GROUP_COLORS[groups.length % GROUP_COLORS.length],
      taskKeys: [],
    };
    persistGroups([...groups, newGroup]);
    setNewGroupName('');
    setIsAddingGroup(false);
  };

  const handleDeleteGroup = (groupId: string) => {
    if (confirm('Remove this custom planning group? (Its tasks will return to the Queue)')) {
      persistGroups(groups.filter((g) => g.id !== groupId));
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-muted/20">
      {/* Top Header Banner */}
      <div className="bg-card border-b border-border px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Strategic Roadmap & Custom Grouping</h1>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary">
              Personal Sandbox
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Group, sequence, and plan what to do and when to do it — isolated from live team Jira boards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden md:inline">{saveStatus}</span>
          {isAddingGroup ? (
            <div className="flex items-center gap-2">
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name (e.g. Week 3 Focus)"
                className="h-8 text-xs w-56"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
              />
              <Button size="sm" onClick={handleCreateGroup} className="h-8 text-xs font-semibold">
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAddingGroup(false)} className="h-8 text-xs">
                Cancel
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setIsAddingGroup(true)} className="h-8 text-xs font-semibold gap-1.5 shadow-sm">
              <Plus className="w-3.5 h-3.5" /> New Custom Group
            </Button>
          )}
        </div>
      </div>

      {/* Main Dual-Panel Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT PANEL: Auto-Aligned Story Queue (Source Pool) */}
        <div 
          className="w-80 md:w-96 border-r border-border bg-card flex flex-col shrink-0 overflow-hidden"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropInQueue}
        >
          {/* Queue Header & Filters */}
          <div className="p-3.5 border-b border-border space-y-2.5 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground">Auto-Aligned Queue</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                  {queueTasks.length}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span>Sort:</span>
                <button
                  onClick={() => setSortBy(sortBy === 'timeline' ? 'priority' : 'timeline')}
                  className="font-semibold text-primary hover:underline cursor-pointer"
                >
                  {sortBy === 'timeline' ? 'Timeline' : 'Priority'}
                </button>
              </div>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter queue tasks..."
                className="pl-8 h-7 text-xs bg-card"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2 text-muted-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Scope Filter Tabs */}
            <Tabs value={scopeFilter} onValueChange={(v: any) => setScopeFilter(v)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-6">
                <TabsTrigger value="all" className="text-[11px] py-0">All</TabsTrigger>
                <TabsTrigger value="sprint" className="text-[11px] py-0">Sprint</TabsTrigger>
                <TabsTrigger value="backlog" className="text-[11px] py-0">Backlog</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Draggable Queue Cards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {queueTasks.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground italic px-4">
                All matching tasks have been assigned to custom groups!
              </div>
            ) : (
              queueTasks.map((t) => {
                const nickname = personalData[t.key]?.nickname;
                return (
                  <div
                    key={t.key}
                    draggable
                    onDragStart={(e) => handleDragStart(e, t.key)}
                    className="p-3 bg-card border border-border rounded-lg shadow-2xs hover:border-primary/50 hover:shadow-xs transition-all cursor-grab active:cursor-grabbing text-xs space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/60 -ml-1" />
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-bold">
                          {t.issue_type}
                        </Badge>
                        <span className="font-bold text-primary">{t.key}</span>
                        {nickname && (
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1 rounded font-semibold border border-indigo-200">
                            {nickname}
                          </span>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                        {t.priority}
                      </Badge>
                    </div>

                    <div className="text-foreground/90 font-medium leading-snug line-clamp-2">
                      {t.title}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                      <span className="truncate max-w-[120px] flex items-center gap-1">
                        <User className="w-3 h-3" /> {t.assignee || 'Unassigned'}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" /> {t.official_deadline || 'No Date'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT CANVAS: Custom Workstream Groups (Horizontal Scrollable Swimlanes) */}
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex items-start gap-5 min-w-max h-full">
            {groups.map((group) => {
              const isOver = dragOverGroupId === group.id;

              return (
                <div
                  key={group.id}
                  onDragOver={(e) => handleDragOver(e, group.id)}
                  onDragLeave={(e) => handleDragLeave(e, group.id)}
                  onDrop={(e) => handleDropInGroup(e, group.id)}
                  className={`w-80 md:w-96 flex flex-col rounded-xl border bg-card/60 backdrop-blur-xs shadow-sm transition-colors duration-200 max-h-full ${
                    isOver ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border'
                  }`}
                >
                  {/* Group Header */}
                  <div 
                    className="p-3.5 border-b border-border flex items-center justify-between gap-2 rounded-t-xl"
                    style={{ borderTop: `4px solid ${group.color || '#0052cc'}` }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-xs text-foreground truncate">
                          {group.name}
                        </h3>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono shrink-0">
                          {group.taskKeys.length}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                        title="Delete Group"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Group Task Sequence Cards */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {group.taskKeys.length === 0 ? (
                      <div className="border-2 border-dashed border-border/80 rounded-lg p-8 text-center text-xs text-muted-foreground">
                        Drag tasks from the left queue and drop them here to sequence your work.
                      </div>
                    ) : (
                      group.taskKeys.map((key, index) => {
                        const task = taskMap.get(key);
                        if (!task) return null;

                        const pdata = personalData[key] || {};
                        const nickname = pdata.nickname;
                        const selfTarget = pdata.self_target;
                        const bufferDays = calculateBufferDays(task.official_deadline, selfTarget || '');

                        // Step progression logic:
                        // 1. If Done -> Predecessor / Completed
                        // 2. First non-done -> Active Current Focus
                        // 3. Subsequent -> Planned Next Step
                        const isDone = task.status === 'Done';
                        const firstPendingIndex = group.taskKeys.findIndex((k) => {
                          const t = taskMap.get(k);
                          return t && t.status !== 'Done';
                        });
                        const isActiveFocus = index === firstPendingIndex;
                        const isPlannedNext = index > firstPendingIndex;

                        return (
                          <div
                            key={key}
                            draggable
                            onDragStart={(e) => handleDragStart(e, key)}
                            className="bg-card border border-border rounded-lg p-3 shadow-2xs hover:shadow-xs transition-all space-y-2.5 cursor-grab active:cursor-grabbing relative group"
                          >
                            {/* Sequence / Step Indicator Tag */}
                            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                {isDone ? (
                                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-3 h-3" /> Step {index + 1}: Done
                                  </span>
                                ) : isActiveFocus ? (
                                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 animate-pulse">
                                    <PlayCircle className="w-3 h-3" /> Step {index + 1}: Active Focus
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <CircleDashed className="w-3 h-3" /> Step {index + 1}: Planned Next
                                  </span>
                                )}
                              </div>

                              <button
                                onClick={() => handleRemoveTaskFromGroup(group.id, key)}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-0.5 rounded transition-opacity"
                                title="Remove from this group"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Task Key & Title */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Link
                                  href={`/dashboard/${task.key}`}
                                  className="font-bold text-xs text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  {task.key}
                                  <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                                </Link>
                                <span className="text-[10px] text-muted-foreground">({task.issue_type})</span>

                                {nickname && (
                                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-semibold border border-indigo-200">
                                    {nickname}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-foreground font-medium line-clamp-2">
                                {task.title}
                              </p>
                            </div>

                            {/* Deadlines, Buffer & Assignee Footer */}
                            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                              <span className="truncate max-w-[130px] flex items-center gap-1">
                                <User className="w-3 h-3" /> {task.assignee || 'Unassigned'}
                              </span>

                              <div className="flex items-center gap-1.5">
                                {selfTarget && (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[9px] px-1 py-0 font-bold ${
                                      bufferDays < 0 ? 'text-red-600 border-red-300' : 'text-emerald-600 border-emerald-300'
                                    }`}
                                  >
                                    {bufferDays}d buffer
                                  </Badge>
                                )}
                                <span className="font-mono bg-muted/60 px-1 py-0.5 rounded border border-border">
                                  {task.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
