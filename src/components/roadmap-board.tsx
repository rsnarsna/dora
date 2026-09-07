'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { RawJiraIssue, PersonalDataMap, UserAccount } from '@/types';
import { RoadmapGroup, AppConfig, TaskCalendarSchedule } from '@/lib/app-config';
import { useDashboard } from '@/components/dashboard-layout-client';
import { saveAppConfigAction } from '@/server/actions/config-actions';
import { saveTaskCalendarScheduleAction, removeTaskCalendarScheduleAction } from '@/server/actions/calendar-actions';
import { calculateBufferDays } from '@/lib/jira-utils';
import { GoogleCalendarSchedulerDialog } from '@/components/roadmap/google-calendar-scheduler-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  ExternalLink,
  CalendarDays,
  Copy,
  Check,
  CalendarCheck2,
  ChevronRight,
  Flame,
  AlertCircle
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
  const { appConfig, setAppConfig, activeAccount, accounts, switchAccount } = useDashboard();
  const currentAccIdRef = React.useRef<string | null>(null);

  const accountId = activeAccount?.id || 'account-1';
  const userCalendarEmail = activeAccount?.email || 'narayanansubramani14@gmail.com';

  // View switcher: 'swimlane' | 'agenda'
  const [viewMode, setViewMode] = useState<'swimlane' | 'agenda'>('swimlane');

  // Scheduler modal state
  const [schedulingTask, setSchedulingTask] = useState<RawJiraIssue | null>(null);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [copiedIcs, setCopiedIcs] = useState(false);

  // Helper to get initial groups for the active account
  const getAccountInitialGroups = (accId: string): RoadmapGroup[] => {
    const byAccount = appConfig?.roadmapGroupsByAccount?.[accId];
    if (byAccount && byAccount.length > 0) return byAccount;
    if (accId === 'account-1' && appConfig?.roadmapGroups && appConfig.roadmapGroups.length > 0) {
      return appConfig.roadmapGroups;
    }
    return [
      { id: `group-${accId}-1`, name: 'Sprint Milestone: Core Planning', color: '#0052cc', taskKeys: [] },
      { id: `group-${accId}-2`, name: 'Sprint Milestone: Execution & Review', color: '#00875a', taskKeys: [] },
    ];
  };

  const initialAccId = activeAccount?.id || 'account-1';
  // Local state for roadmap groups — dynamically scoped to activeAccount
  const [groups, setGroups] = useState<RoadmapGroup[]>(() => getAccountInitialGroups(initialAccId));
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string>('');

  // Automatically update groups ONLY when switching accounts
  useEffect(() => {
    const accId = activeAccount?.id || 'account-1';
    if (currentAccIdRef.current === accId) {
      return; // Already viewing this account, preserve user edits and drag actions
    }
    currentAccIdRef.current = accId;
    setGroups(getAccountInitialGroups(accId));
  }, [activeAccount?.id]);

  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'sprint' | 'backlog'>('all');
  const [assigneeScope, setAssigneeScope] = useState<'all' | 'me'>('all');
  const [sortBy, setSortBy] = useState<'timeline' | 'priority'>('timeline');
  const [newGroupName, setNewGroupName] = useState('');
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>('All changes saved');

  // Calendar schedules lookup for active account
  const calendarSchedules = useMemo<Record<string, TaskCalendarSchedule>>(() => {
    return appConfig?.calendarSchedulesByAccount?.[accountId] || {};
  }, [appConfig?.calendarSchedulesByAccount, accountId]);

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

  // Scheduled tasks list sorted chronologically
  const scheduledTasksList = useMemo(() => {
    const list: Array<{ schedule: TaskCalendarSchedule; task?: RawJiraIssue }> = [];
    Object.values(calendarSchedules).forEach((schedule) => {
      const task = taskMap.get(schedule.taskKey);
      list.push({ schedule, task });
    });
    return list.sort((a, b) => {
      const dateCompare = (a.schedule.startDate || '').localeCompare(b.schedule.startDate || '');
      if (dateCompare !== 0) return dateCompare;
      return (a.schedule.startTime || '').localeCompare(b.schedule.startTime || '');
    });
  }, [calendarSchedules, taskMap]);

  // Auto-aligned Queue (Available Pool) - filtered strictly to active account and optional 'me' scope
  const queueTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (groupedKeysSet.has(t.key)) return false;
        if (scopeFilter === 'sprint' && !t.in_active_sprint) return false;
        if (scopeFilter === 'backlog' && t.in_active_sprint) return false;

        // Filter to 'My Tasks' only if toggled and account has a jiraUser configured
        if (assigneeScope === 'me' && activeAccount?.jiraUser && activeAccount.jiraUser !== 'none') {
          if (t.assignee !== activeAccount.jiraUser) return false;
        }

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
  }, [tasks, groupedKeysSet, scopeFilter, assigneeScope, activeAccount, searchQuery, sortBy, personalData]);

  // Save to Supabase specifically under the active account
  const persistGroups = async (updatedGroups: RoadmapGroup[]) => {
    setGroups(updatedGroups);
    setSaveStatus('Saving to Database...');
    try {
      const accId = activeAccount?.id || 'account-1';
      const updatedByAccount = {
        ...(appConfig?.roadmapGroupsByAccount || {}),
        [accId]: updatedGroups,
      };
      const updatedConfig: AppConfig = {
        ...(appConfig || {}),
        app: appConfig?.app || { title: 'Dora', description: 'Personal Jira Management Dashboard' },
        sidebar: appConfig?.sidebar || { width: '22rem', defaultOpen: true },
        accounts: appConfig?.accounts || [],
        jiraDomains: appConfig?.jiraDomains || [],
        statusColors: appConfig?.statusColors || {},
        statusThemes: appConfig?.statusThemes || {},
        roadmapGroups: accId === 'account-1' ? updatedGroups : (appConfig?.roadmapGroups || updatedGroups),
        roadmapGroupsByAccount: updatedByAccount,
      };

      if (setAppConfig) {
        setAppConfig(updatedConfig);
      }

      const res = await saveAppConfigAction(updatedConfig);
      if (res && !res.ok) {
        throw new Error(res.error || 'Backend failed to save config');
      }

      setSaveStatus('✅ Saved to Database');
      setTimeout(() => setSaveStatus('All changes saved'), 2500);
    } catch (error: any) {
      console.error('Failed to save roadmap groups:', error);
      setSaveStatus('⚠️ ' + (error?.message || 'Error saving to DB'));
    }
  };

  // Calendar schedule save/remove handlers
  const handleSaveSchedule = async (schedule: TaskCalendarSchedule) => {
    try {
      const res = await saveTaskCalendarScheduleAction(accountId, schedule);
      if (res.ok && res.schedule) {
        if (setAppConfig && appConfig) {
          setAppConfig({
            ...appConfig,
            calendarSchedulesByAccount: {
              ...(appConfig.calendarSchedulesByAccount || {}),
              [accountId]: {
                ...(appConfig.calendarSchedulesByAccount?.[accountId] || {}),
                [schedule.taskKey]: schedule,
              },
            },
          });
        }
      }
    } catch (err) {
      console.error('Failed to save schedule:', err);
    }
  };

  const handleRemoveSchedule = async (taskKey: string) => {
    try {
      const res = await removeTaskCalendarScheduleAction(accountId, taskKey);
      if (res.ok) {
        if (setAppConfig && appConfig) {
          const nextAccountSchedules = { ...(appConfig.calendarSchedulesByAccount?.[accountId] || {}) };
          delete nextAccountSchedules[taskKey];
          setAppConfig({
            ...appConfig,
            calendarSchedulesByAccount: {
              ...(appConfig.calendarSchedulesByAccount || {}),
              [accountId]: nextAccountSchedules,
            },
          });
        }
      }
    } catch (err) {
      console.error('Failed to remove schedule:', err);
    }
  };

  const handleCopyIcsFeed = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/api/calendar/feed?accountId=${accountId}`;
    navigator.clipboard.writeText(url);
    setCopiedIcs(true);
    setTimeout(() => setCopiedIcs(false), 2500);
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

  const handleDropOnTaskCard = (e: React.DragEvent, targetGroupId: string, targetTaskKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverGroupId(null);
    const key = e.dataTransfer.getData('text/plain') || draggedKey;
    if (!key || key === targetTaskKey) return;

    const updated = groups.map((g) => {
      const filtered = g.taskKeys.filter((k) => k !== key);
      if (g.id === targetGroupId) {
        const targetIndex = filtered.indexOf(targetTaskKey);
        if (targetIndex === -1) {
          return { ...g, taskKeys: [...filtered, key] };
        }
        const withInserted = [...filtered];
        withInserted.splice(targetIndex, 0, key);
        return { ...g, taskKeys: withInserted };
      }
      return { ...g, taskKeys: filtered };
    });

    persistGroups(updated);
    setDraggedKey(null);
  };

  const handleStartRename = (group: RoadmapGroup) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  };

  const handleSaveRename = (groupId: string) => {
    if (!editingGroupName.trim()) {
      setEditingGroupId(null);
      return;
    }
    const updated = groups.map((g) => {
      if (g.id !== groupId) return g;
      return { ...g, name: editingGroupName.trim() };
    });
    persistGroups(updated);
    setEditingGroupId(null);
  };

  const handleDropInQueue = (e: React.DragEvent) => {
    e.preventDefault();
    const key = e.dataTransfer.getData('text/plain') || draggedKey;
    if (!key) return;

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
      <div className="bg-card border-b border-border px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Strategic Roadmap & Google Calendar</h1>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary">
              Personal Exoskeleton
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sequence work, schedule focus blocks on your personal Google Calendar, and monitor strategic buffers.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Active Account Switcher */}
          {accounts && accounts.length > 0 && (
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 px-2 rounded-lg border border-border shadow-2xs">
              <span className="text-[11px] text-muted-foreground font-semibold hidden sm:inline">Account:</span>
              <Select value={activeAccount?.id || accounts[0]?.id} onValueChange={(val) => switchAccount && switchAccount(val)}>
                <SelectTrigger className="h-7 text-xs font-bold bg-card border-border gap-2 min-w-[170px] max-w-[220px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  {accounts.map((acc: UserAccount) => (
                    <SelectItem key={acc.id} value={acc.id} className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold truncate">{acc.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">({acc.jiraDomain})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* View Mode Switcher: Swimlane vs Google Cal Agenda */}
          <div className="flex items-center bg-muted/70 p-0.5 rounded-lg border border-border shadow-2xs">
            <Button
              variant={viewMode === 'swimlane' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('swimlane')}
              className="h-7 text-xs font-semibold px-2.5 gap-1.5 shadow-none"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Swimlanes</span>
            </Button>
            <Button
              variant={viewMode === 'agenda' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('agenda')}
              className="h-7 text-xs font-semibold px-2.5 gap-1.5 shadow-none relative"
            >
              <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
              <span>Google Cal Agenda</span>
              {Object.keys(calendarSchedules).length > 0 && (
                <span className="ml-0.5 px-1.5 py-0 text-[9px] font-bold rounded-full bg-blue-500 text-white leading-none">
                  {Object.keys(calendarSchedules).length}
                </span>
              )}
            </Button>
          </div>

          {/* Google Calendar Sync Feed Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyIcsFeed}
            className="h-7 text-xs font-semibold gap-1.5 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
            title="Copy RFC 5545 iCal subscription feed URL. Paste this into Google Calendar: Add calendar -> From URL"
          >
            {copiedIcs ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-blue-500" />}
            <span>{copiedIcs ? 'iCal URL Copied!' : 'Copy Sync Feed'}</span>
          </Button>

          <span className="text-xs text-muted-foreground hidden xl:inline">{saveStatus}</span>

          {viewMode === 'swimlane' && (
            <>
              {isAddingGroup ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Group name (e.g. Week 3 Focus)"
                    className="h-7 text-xs w-48"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                  />
                  <Button size="sm" onClick={handleCreateGroup} className="h-7 text-xs font-semibold">
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsAddingGroup(false)} className="h-7 text-xs">
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={() => setIsAddingGroup(true)} className="h-7 text-xs font-semibold gap-1.5 shadow-sm">
                  <Plus className="w-3.5 h-3.5" /> New Group
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* VIEW 1: SWIMLANES VIEW */}
      {viewMode === 'swimlane' && (
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

              {/* Assignee Scope Filter */}
              {activeAccount?.jiraUser && activeAccount.jiraUser !== 'none' && (
                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-border/50">
                  <span className="text-muted-foreground">Scope:</span>
                  <div className="flex items-center gap-1 bg-card rounded p-0.5 border border-border">
                    <button
                      onClick={() => setAssigneeScope('all')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                        assigneeScope === 'all'
                          ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      All ({tasks.length})
                    </button>
                    <button
                      onClick={() => setAssigneeScope('me')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                        assigneeScope === 'me'
                          ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Assigned to Me
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Draggable Queue Cards List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground italic px-4 space-y-2">
                  <div className="font-semibold text-foreground/80">0 tasks found for this account</div>
                  <div className="text-[11px]">Domain: <span className="font-mono">{activeAccount?.jiraDomain}</span></div>
                  <div className="text-[10px] text-muted-foreground">Click &quot;Sync Jira&quot; in the header to pull tasks for this domain.</div>
                </div>
              ) : queueTasks.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground italic px-4">
                  All matching tasks have been assigned to custom groups!
                </div>
              ) : (
                queueTasks.map((t) => {
                  const nickname = personalData[t.key]?.nickname;
                  const sched = calendarSchedules[t.key];

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
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 px-1 rounded font-semibold border border-indigo-200 dark:border-indigo-800">
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

                      {/* Google Calendar Schedule Badge if present */}
                      {sched && (
                        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded px-2 py-1 text-[10px] text-blue-700 dark:text-blue-300">
                          <span className="flex items-center gap-1 font-medium truncate">
                            <CalendarDays className="w-3 h-3 text-blue-600 shrink-0" />
                            {sched.startDate} {sched.startTime} ({sched.durationMinutes}m)
                          </span>
                          {sched.googleCalendarUrl && (
                            <a
                              href={sched.googleCalendarUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:underline inline-flex items-center gap-0.5 ml-1 font-bold shrink-0"
                              title="Open in Google Calendar"
                            >
                              <span>Open</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                        <span className="truncate max-w-[110px] flex items-center gap-1">
                          <User className="w-3 h-3" /> {t.assignee || 'Unassigned'}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSchedulingTask(t);
                              setIsSchedulerOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 p-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors inline-flex items-center gap-1 text-[10px] font-medium"
                            title="Schedule focus session on Google Calendar"
                          >
                            <CalendarDays className="w-3 h-3" />
                            <span>{sched ? 'Edit Cal' : '+ Google Cal'}</span>
                          </button>
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3" /> {t.official_deadline || 'No Date'}
                          </span>
                        </div>
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
                        {editingGroupId === group.id ? (
                          <div className="flex items-center gap-1.5">
                            <Input
                              value={editingGroupName}
                              onChange={(e) => setEditingGroupName(e.target.value)}
                              onBlur={() => handleSaveRename(group.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(group.id);
                                if (e.key === 'Escape') setEditingGroupId(null);
                              }}
                              autoFocus
                              className="h-6 text-xs px-1.5 py-0 bg-background border-primary"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h3 
                              onClick={() => handleStartRename(group)}
                              className="font-bold text-xs text-foreground truncate cursor-pointer hover:underline hover:text-primary transition-colors"
                              title="Click to rename group"
                            >
                              {group.name}
                            </h3>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono shrink-0">
                              {group.taskKeys.length}
                            </Badge>
                          </div>
                        )}
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
                          const sched = calendarSchedules[key];

                          const isDone = task.status === 'Done';
                          const firstPendingIndex = group.taskKeys.findIndex((k) => {
                            const t = taskMap.get(k);
                            return t && t.status !== 'Done';
                          });
                          const isActiveFocus = index === firstPendingIndex;

                          return (
                            <div
                              key={key}
                              draggable
                              onDragStart={(e) => handleDragStart(e, key)}
                              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onDrop={(e) => handleDropOnTaskCard(e, group.id, key)}
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
                                    <span className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 px-1.5 py-0.2 rounded font-semibold border border-indigo-200 dark:border-indigo-800">
                                      {nickname}
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-foreground font-medium line-clamp-2">
                                  {task.title}
                                </p>
                              </div>

                              {/* Google Calendar Schedule Badge if present */}
                              {sched && (
                                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded px-2 py-1 text-[10px] text-blue-700 dark:text-blue-300">
                                  <span className="flex items-center gap-1 font-medium truncate">
                                    <CalendarDays className="w-3 h-3 text-blue-600 shrink-0" />
                                    {sched.startDate} {sched.startTime} ({sched.durationMinutes}m)
                                  </span>
                                  {sched.googleCalendarUrl && (
                                    <a
                                      href={sched.googleCalendarUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-blue-600 hover:underline inline-flex items-center gap-0.5 ml-1 font-bold shrink-0"
                                      title="Open in Google Calendar"
                                    >
                                      <span>Open</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* Deadlines, Buffer & Schedule Action Footer */}
                              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSchedulingTask(task);
                                    setIsSchedulerOpen(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 p-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors inline-flex items-center gap-1 text-[10px] font-medium"
                                  title="Schedule focus session on Google Calendar"
                                >
                                  <CalendarDays className="w-3 h-3" />
                                  <span>{sched ? 'Edit Cal' : '+ Google Cal'}</span>
                                </button>

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
      )}

      {/* VIEW 2: GOOGLE CALENDAR AGENDA VIEW */}
      {viewMode === 'agenda' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Agenda Header Context */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-blue-500" />
                  <h2 className="text-base font-bold text-foreground">Google Calendar Focus Agenda</h2>
                  <Badge variant="outline" className="text-[10px] font-mono border-blue-500/30 text-blue-600 dark:text-blue-400">
                    {scheduledTasksList.length} Focus Blocks Scheduled
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Scheduled time-blocks synced for <span className="font-semibold text-foreground">{userCalendarEmail}</span>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyIcsFeed}
                  className="h-8 text-xs font-semibold gap-1.5"
                >
                  {copiedIcs ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIcs ? 'Subscribed Feed URL Copied' : 'Copy iCal Sync URL'}</span>
                </Button>
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Google Calendar</span>
                </a>
              </div>
            </div>

            {/* Scheduled Tasks List or Empty State */}
            {scheduledTasksList.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border p-12 text-center space-y-4 bg-card/40">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">No Google Calendar Focus Blocks Yet</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Take control of your focus time. Switch back to the Swimlanes view or pick any task below to schedule dedicated deep work blocks directly on Google Calendar.
                  </p>
                </div>
                <Button
                  onClick={() => setViewMode('swimlane')}
                  className="h-8 text-xs font-semibold gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Go to Swimlanes & Schedule Tasks</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {scheduledTasksList.map(({ schedule, task }) => {
                    const selfTarget = task ? personalData[task.key]?.self_target : undefined;
                    const nickname = task ? personalData[task.key]?.nickname : undefined;
                    const bufferDays = task ? calculateBufferDays(task.official_deadline, selfTarget || '') : 0;

                    return (
                      <Card key={schedule.taskKey} className="overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          {/* Time & Date Block */}
                          <div className="flex items-center gap-3.5 min-w-[200px]">
                            <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 flex flex-col items-center justify-center shrink-0">
                              <span className="text-[10px] uppercase font-bold tracking-wider">
                                {new Date(schedule.startDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short' })}
                              </span>
                              <span className="text-base font-extrabold leading-none">
                                {new Date(schedule.startDate + 'T00:00:00').getDate()}
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{schedule.startTime}</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                                  {schedule.durationMinutes}m
                                </Badge>
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {schedule.startDate}
                              </div>
                            </div>
                          </div>

                          {/* Task Info */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={`/dashboard/${schedule.taskKey}`}
                                className="font-bold text-xs text-primary hover:underline inline-flex items-center gap-1"
                              >
                                {schedule.taskKey}
                                <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                              </Link>
                              {task && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                                  {task.issue_type}
                                </Badge>
                              )}
                              {nickname && (
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 px-1.5 py-0.2 rounded font-semibold border border-indigo-200 dark:border-indigo-800">
                                  {nickname}
                                </span>
                              )}
                              {task && (
                                <span className="font-mono text-[10px] bg-muted/60 px-1.5 py-0.5 rounded border border-border">
                                  {task.status}
                                </span>
                              )}
                            </div>

                            <p className="text-xs font-medium text-foreground line-clamp-1">
                              {task?.title || schedule.title}
                            </p>

                            {schedule.description && (
                              <p className="text-[11px] text-muted-foreground italic line-clamp-1">
                                &quot;{schedule.description}&quot;
                              </p>
                            )}
                          </div>

                          {/* Deadlines, Buffer & Actions */}
                          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                            {task && selfTarget && (
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] px-2 py-0.5 font-bold ${
                                  bufferDays < 0 ? 'text-red-600 border-red-300' : 'text-emerald-600 border-emerald-300'
                                }`}
                              >
                                {bufferDays}d buffer
                              </Badge>
                            )}

                            {schedule.googleCalendarUrl && (
                              <a
                                href={schedule.googleCalendarUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors"
                                title="Open or re-add in Google Calendar"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Google Cal</span>
                              </a>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (task) {
                                  setSchedulingTask(task);
                                  setIsSchedulerOpen(true);
                                }
                              }}
                              className="h-7 text-xs px-2.5"
                            >
                              Edit
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSchedule(schedule.taskKey)}
                              className="h-7 text-xs px-2 text-muted-foreground hover:text-destructive"
                              title="Remove schedule entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Unscheduled High Priority Tasks with Deadlines */}
            {tasks.filter((t) => !calendarSchedules[t.key] && t.status !== 'Done').length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-bold text-foreground">Unscheduled Active Tasks (Recommended for Focus Blocks)</h3>
                  </div>
                  <span className="text-[11px] text-muted-foreground">Click &quot;+ Schedule&quot; to plan on Google Calendar</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {tasks
                    .filter((t) => !calendarSchedules[t.key] && t.status !== 'Done')
                    .slice(0, 6)
                    .map((t) => {
                      const selfTarget = personalData[t.key]?.self_target;
                      const bufferDays = calculateBufferDays(t.official_deadline, selfTarget || '');

                      return (
                        <div
                          key={t.key}
                          className="p-3 bg-card border border-border rounded-lg shadow-2xs space-y-2 flex flex-col justify-between hover:border-primary/40 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-xs text-primary">{t.key}</span>
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                                {t.priority}
                              </Badge>
                            </div>
                            <p className="text-xs font-medium text-foreground line-clamp-2">
                              {t.title}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px]">
                            <span className="font-mono text-muted-foreground">
                              {t.official_deadline !== 'Not Set' ? t.official_deadline : 'No Deadline'}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSchedulingTask(t);
                                setIsSchedulerOpen(true);
                              }}
                              className="h-6 text-[10px] font-semibold px-2 text-blue-600 border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-950"
                            >
                              <CalendarDays className="w-3 h-3 mr-1" />
                              + Schedule
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Google Calendar Scheduler Dialog */}
      <GoogleCalendarSchedulerDialog
        isOpen={isSchedulerOpen}
        onOpenChange={(open) => {
          setIsSchedulerOpen(open);
          if (!open) setSchedulingTask(null);
        }}
        task={schedulingTask}
        personal={schedulingTask ? personalData[schedulingTask.key] : undefined}
        currentSchedule={schedulingTask ? calendarSchedules[schedulingTask.key] : undefined}
        accountEmail={userCalendarEmail}
        onSaveSchedule={handleSaveSchedule}
        onRemoveSchedule={handleRemoveSchedule}
      />
    </div>
  );
};
