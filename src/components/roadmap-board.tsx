'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { RawJiraIssue, PersonalDataMap, UserAccount } from '@/types';
import { 
  RoadmapGroup, 
  AppConfig, 
  TaskCalendarSchedule, 
  PlannedStepMetadata 
} from '@/lib/app-config';
import { useDashboard } from '@/components/dashboard-layout-client';
import { saveAppConfigAction } from '@/server/actions/config-actions';
import { 
  saveTaskCalendarScheduleAction, 
  removeTaskCalendarScheduleAction 
} from '@/server/actions/calendar-actions';
import { savePersonalRecordAction } from '@/server/actions/personal-actions';
import { calculateBufferDays } from '@/lib/jira-utils';
import { cn } from '@/lib/utils';
import { GoogleCalendarSchedulerDialog } from '@/components/roadmap/google-calendar-scheduler-dialog';
import { PlannedStepDetailDialog } from '@/components/roadmap/planned-step-detail-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  AlertCircle,
  Zap,
  AlertTriangle,
  ListTodo,
  Sparkles,
  Target,
  ListFilter,
  ArrowUp,
  ArrowDown
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

export const RoadmapBoard: React.FC<RoadmapBoardProps> = ({ tasks, personalData: initialPersonalData }) => {
  const { appConfig, setAppConfig, activeAccount, accounts, switchAccount } = useDashboard();
  const currentAccIdRef = useRef<string | null>(null);

  const accountId = activeAccount?.id || 'account-1';
  const userCalendarEmail = activeAccount?.email || 'narayanansubramani14@gmail.com';

  // Local personal data state to allow immediate inline updates
  const [personalData, setPersonalData] = useState<PersonalDataMap>(initialPersonalData);
  useEffect(() => {
    setPersonalData(initialPersonalData);
  }, [initialPersonalData]);

  // View switcher: 'swimlane' | 'agenda'
  const [viewMode, setViewMode] = useState<'swimlane' | 'agenda'>('swimlane');

  // Mobile Section Switcher: 'swimlanes' | 'backlog' (only active on < md screens)
  const [mobileSection, setMobileSection] = useState<'swimlanes' | 'backlog'>('swimlanes');

  // Google Calendar scheduler dialog state
  const [schedulingTask, setSchedulingTask] = useState<RawJiraIssue | null>(null);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [copiedIcs, setCopiedIcs] = useState(false);

  // Deep Planned Step inspector dialog state
  const [inspectingStepTask, setInspectingStepTask] = useState<RawJiraIssue | null>(null);
  const [inspectingStepIndex, setInspectingStepIndex] = useState<number>(0);
  const [inspectingGroup, setInspectingGroup] = useState<RoadmapGroup | null>(null);
  const [isStepDetailOpen, setIsStepDetailOpen] = useState(false);

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
  const [groups, setGroups] = useState<RoadmapGroup[]>(() => getAccountInitialGroups(initialAccId));
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string>('');

  // Automatically update groups ONLY when switching accounts
  useEffect(() => {
    const accId = activeAccount?.id || 'account-1';
    if (currentAccIdRef.current === accId) {
      return;
    }
    currentAccIdRef.current = accId;
    setGroups(getAccountInitialGroups(accId));
  }, [activeAccount?.id]);

  // Static sidebar filter state — simplified & streamlined
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'sprint' | 'me'>('all');
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

  // Planned step metadata lookup for active account
  const plannedStepsMeta = useMemo<Record<string, PlannedStepMetadata>>(() => {
    return appConfig?.plannedStepsByAccount?.[accountId] || {};
  }, [appConfig?.plannedStepsByAccount, accountId]);

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

  // Streamlined Backlog Queue
  const queueTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (groupedKeysSet.has(t.key)) return false;
        if (filterMode === 'sprint' && !t.in_active_sprint) return false;
        if (filterMode === 'me' && activeAccount?.jiraUser && activeAccount.jiraUser !== 'none') {
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
        const dateA = a.official_deadline && a.official_deadline !== 'Not Set' ? a.official_deadline : a.start_date || '9999-99-99';
        const dateB = b.official_deadline && b.official_deadline !== 'Not Set' ? b.official_deadline : b.start_date || '9999-99-99';
        return dateA.localeCompare(dateB);
      });
  }, [tasks, groupedKeysSet, filterMode, activeAccount, searchQuery, sortBy, personalData]);

  // Persist roadmap groups to Supabase
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

  // Touch-Friendly mobile 1-tap addition to group
  const handleAddTaskToGroup = (targetGroupId: string, taskKey: string) => {
    const updated = groups.map((g) => {
      if (g.id === targetGroupId && !g.taskKeys.includes(taskKey)) {
        return { ...g, taskKeys: [...g.taskKeys, taskKey] };
      }
      return g;
    });
    persistGroups(updated);
  };

  // Persist planned step metadata (status overrides, checklists, tactical notes)
  const handleSavePlannedMetadata = async (taskKey: string, meta: PlannedStepMetadata) => {
    try {
      const updatedAccountMeta = {
        ...(appConfig?.plannedStepsByAccount?.[accountId] || {}),
        [taskKey]: meta,
      };
      const updatedConfig: AppConfig = {
        ...(appConfig || {}),
        app: appConfig?.app || { title: 'Dora', description: 'Personal Jira Management Dashboard' },
        sidebar: appConfig?.sidebar || { width: '22rem', defaultOpen: true },
        accounts: appConfig?.accounts || [],
        jiraDomains: appConfig?.jiraDomains || [],
        statusColors: appConfig?.statusColors || {},
        statusThemes: appConfig?.statusThemes || {},
        roadmapGroups: groups,
        plannedStepsByAccount: {
          ...(appConfig?.plannedStepsByAccount || {}),
          [accountId]: updatedAccountMeta,
        },
      };

      if (setAppConfig) {
        setAppConfig(updatedConfig);
      }

      await saveAppConfigAction(updatedConfig);
    } catch (err) {
      console.error('Failed to save planned step metadata:', err);
    }
  };

  // Persist nickname changes
  const handleSaveNickname = async (taskKey: string, nickname: string) => {
    try {
      await savePersonalRecordAction({ task_id: taskKey, nickname });
      setPersonalData((prev) => ({
        ...prev,
        [taskKey]: {
          ...(prev[taskKey] || {}),
          nickname,
        },
      }));
    } catch (err) {
      console.error('Failed to save nickname:', err);
    }
  };

  // Step sequence shifter
  const handleMoveStep = (group: RoadmapGroup, taskKey: string, direction: 'up' | 'down') => {
    const currentIndex = group.taskKeys.indexOf(taskKey);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= group.taskKeys.length) return;

    const newKeys = [...group.taskKeys];
    newKeys.splice(currentIndex, 1);
    newKeys.splice(targetIndex, 0, taskKey);

    const updated = groups.map((g) => (g.id === group.id ? { ...g, taskKeys: newKeys } : g));
    persistGroups(updated);
    setInspectingStepIndex(targetIndex);
  };

  // Move task to another group
  const handleMoveToGroup = (sourceGroupId: string, targetGroupId: string, taskKey: string) => {
    if (sourceGroupId === targetGroupId) return;
    const updated = groups.map((g) => {
      if (g.id === sourceGroupId) {
        return { ...g, taskKeys: g.taskKeys.filter((k) => k !== taskKey) };
      }
      if (g.id === targetGroupId) {
        return { ...g, taskKeys: [...g.taskKeys, taskKey] };
      }
      return g;
    });
    persistGroups(updated);
    const newGroup = updated.find((g) => g.id === targetGroupId) || null;
    setInspectingGroup(newGroup);
    if (newGroup) {
      setInspectingStepIndex(newGroup.taskKeys.length - 1);
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

  // Helper to compute live dynamic step visual state
  const getStepVisualState = (
    task: RawJiraIssue,
    group: RoadmapGroup,
    index: number
  ) => {
    const meta = plannedStepsMeta[task.key];
    const override = meta?.statusOverride;

    let computedState: 'active' | 'in_progress' | 'planned' | 'blocked' | 'done' = 'planned';

    if (override && override !== 'auto') {
      computedState = override;
    } else {
      if (task.status === 'Done') {
        computedState = 'done';
      } else {
        const firstPendingIndex = group.taskKeys.findIndex((k) => {
          const t = taskMap.get(k);
          return t && t.status !== 'Done';
        });
        if (index === firstPendingIndex) {
          computedState = 'active';
        } else {
          computedState = 'planned';
        }
      }
    }

    switch (computedState) {
      case 'active':
        return {
          label: `Step ${index + 1}: Active Focus`,
          icon: PlayCircle,
          className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold animate-pulse',
          iconClassName: 'text-blue-600 dark:text-blue-400 animate-pulse',
        };
      case 'in_progress':
        return {
          label: `Step ${index + 1}: In Flight`,
          icon: Zap,
          className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold',
          iconClassName: 'text-amber-600 dark:text-amber-400',
        };
      case 'blocked':
        return {
          label: `Step ${index + 1}: Blocked`,
          icon: AlertTriangle,
          className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 font-bold animate-pulse',
          iconClassName: 'text-red-600 dark:text-red-400',
        };
      case 'done':
        return {
          label: `Step ${index + 1}: Done`,
          icon: CheckCircle2,
          className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold',
          iconClassName: 'text-emerald-600 dark:text-emerald-400',
        };
      case 'planned':
      default:
        return {
          label: `Step ${index + 1}: Planned Next`,
          icon: CircleDashed,
          className: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-semibold',
          iconClassName: 'text-indigo-600 dark:text-indigo-400 animate-[spin_8s_linear_infinite]',
        };
    }
  };

  const scrollToSwimlane = (groupId: string) => {
    if (typeof document !== 'undefined') {
      const el = document.getElementById(`swimlane-${groupId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-muted/20">
      {/* Top Header Banner — Fully Responsive */}
      <div className="bg-card border-b border-border px-3 py-2.5 sm:px-6 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4 shrink-0 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <h1 className="text-base sm:text-lg font-bold text-foreground">Strategic Roadmap & Google Calendar</h1>
            <Badge variant="outline" className="text-[9px] sm:text-[10px] font-mono border-primary/40 text-primary hidden xs:inline-flex">
              Personal Exoskeleton
            </Badge>
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block">
            Sequence work, schedule focus blocks on your personal Google Calendar, and monitor strategic buffers.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Active Account Switcher */}
          {accounts && accounts.length > 0 && (
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 px-1.5 rounded-lg border border-border shadow-2xs">
              <Select value={activeAccount?.id || accounts[0]?.id} onValueChange={(val) => switchAccount && switchAccount(val)}>
                <SelectTrigger className="h-7 text-xs font-bold bg-card border-border gap-1.5 min-w-[130px] max-w-[190px]">
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
              className="h-7 text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 gap-1 shadow-none"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Swimlanes</span>
            </Button>
            <Button
              variant={viewMode === 'agenda' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('agenda')}
              className="h-7 text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 gap-1 shadow-none relative"
            >
              <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden xs:inline">Google Cal</span>
              <span>Agenda</span>
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
            className="h-7 text-[11px] sm:text-xs font-semibold gap-1 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 px-2"
            title="Copy RFC 5545 iCal subscription feed URL. Paste this into Google Calendar: Add calendar -> From URL"
          >
            {copiedIcs ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-blue-500" />}
            <span className="hidden sm:inline">{copiedIcs ? 'iCal Copied!' : 'Copy Sync Feed'}</span>
            <span className="sm:hidden">iCal</span>
          </Button>

          {viewMode === 'swimlane' && (
            <>
              {isAddingGroup ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Group name..."
                    className="h-7 text-xs w-36 sm:w-44"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                  />
                  <Button size="sm" onClick={handleCreateGroup} className="h-7 text-xs font-semibold px-2">
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsAddingGroup(false)} className="h-7 text-xs px-2">
                    ✕
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={() => setIsAddingGroup(true)} className="h-7 text-[11px] sm:text-xs font-semibold gap-1 shadow-sm px-2 sm:px-2.5">
                  <Plus className="w-3.5 h-3.5" /> 
                  <span className="hidden sm:inline">New Group</span>
                  <span className="sm:hidden">Group</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* MOBILE TACTILE SECTION SWITCHER (< md screens only) */}
      {viewMode === 'swimlane' && (
        <div className="md:hidden flex items-center bg-card border-b border-border p-1.5 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMobileSection('swimlanes')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
              mobileSection === 'swimlanes'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground bg-muted/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Swimlanes ({groups.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileSection('backlog')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
              mobileSection === 'backlog'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground bg-muted/40'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Backlog ({queueTasks.length})</span>
          </button>
        </div>
      )}

      {/* VIEW 1: SWIMLANES VIEW */}
      {viewMode === 'swimlane' && (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* STATIC & SIMPLE BACKLOG SIDEBAR (Desktop: side-by-side; Mobile: full width when toggled) */}
          <div 
            className={cn(
              "border-r border-border bg-card flex flex-col shrink-0 overflow-hidden select-none",
              mobileSection === 'backlog' ? 'w-full flex-1' : 'hidden md:flex md:w-80'
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropInQueue}
          >
            {/* Sidebar Static Header & Minimalist Filters */}
            <div className="p-3 border-b border-border space-y-2 bg-muted/20 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">Available Backlog</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono font-bold">
                    {queueTasks.length}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => setSortBy(sortBy === 'timeline' ? 'priority' : 'timeline')}
                  className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  title="Toggle sorting by deadline or priority"
                >
                  Sort: {sortBy === 'timeline' ? 'Timeline' : 'Priority'}
                </button>
              </div>

              {/* Simple Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter backlog tasks..."
                  className="pl-8 h-7 text-xs bg-card"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2 text-muted-foreground">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Minimal Filter Pills (All / Sprint / My Tasks) */}
              <div className="flex items-center gap-1 bg-card rounded p-0.5 border border-border">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors text-center cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All ({tasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('sprint')}
                  className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors text-center cursor-pointer ${
                    filterMode === 'sprint'
                      ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Sprint
                </button>
                {activeAccount?.jiraUser && activeAccount.jiraUser !== 'none' && (
                  <button
                    type="button"
                    onClick={() => setFilterMode('me')}
                    className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors text-center cursor-pointer ${
                      filterMode === 'me'
                        ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    My Tasks
                  </button>
                )}
              </div>
            </div>

            {/* Static Sidebar Draggable Cards List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground italic px-4 space-y-2">
                  <div className="font-semibold text-foreground/80">0 tasks found for this account</div>
                  <div className="text-[11px]">Domain: <span className="font-mono">{activeAccount?.jiraDomain}</span></div>
                  <div className="text-[10px] text-muted-foreground">Click &quot;Sync Jira&quot; in the header to pull tasks for this domain.</div>
                </div>
              ) : queueTasks.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground italic px-4">
                  All matching backlog tasks are currently assigned to custom groups!
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
                      className="p-2.5 bg-card border border-border rounded-lg shadow-2xs hover:border-primary/50 hover:shadow-xs transition-all cursor-grab active:cursor-grabbing text-xs space-y-1.5 group"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 -ml-1 hidden md:inline" />
                          <span className="font-bold text-primary font-mono text-[11px]">{t.key}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-bold">
                            {t.issue_type}
                          </Badge>
                          {nickname && (
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 px-1 rounded font-semibold border border-indigo-200 dark:border-indigo-800">
                              {nickname}
                            </span>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-mono">
                          {t.priority}
                        </Badge>
                      </div>

                      <div className="text-foreground font-medium leading-snug line-clamp-2 text-xs">
                        {t.title}
                      </div>

                      {/* Google Calendar Schedule Badge if present */}
                      {sched && (
                        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded px-1.5 py-0.5 text-[10px] text-blue-700 dark:text-blue-300">
                          <span className="flex items-center gap-1 font-medium truncate">
                            <CalendarDays className="w-3 h-3 text-blue-600 shrink-0" />
                            {sched.startDate} {sched.startTime} ({sched.durationMinutes}m)
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                        {/* Touch-Friendly 1-Tap "Add to Swimlane" Popover for mobile */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="text-primary hover:text-primary/80 px-1.5 py-0.5 rounded bg-primary/5 hover:bg-primary/10 border border-primary/20 transition-colors inline-flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                              title="Add this task to a Swimlane"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Swimlane</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-60 p-2 z-50 text-xs" align="start">
                            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              Move to Swimlane
                            </div>
                            <div className="space-y-1 mt-1">
                              {groups.map((g) => (
                                <button
                                  key={g.id}
                                  type="button"
                                  onClick={() => {
                                    handleAddTaskToGroup(g.id, t.key);
                                    setMobileSection('swimlanes');
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-muted text-xs flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color || '#0052cc' }} />
                                  <span className="truncate font-medium flex-1">{g.name}</span>
                                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSchedulingTask(t);
                              setIsSchedulerOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 p-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors inline-flex items-center gap-0.5 text-[10px] font-medium"
                            title="Schedule focus session on Google Calendar"
                          >
                            <CalendarDays className="w-3 h-3" />
                            <span>{sched ? 'Cal' : '+ Cal'}</span>
                          </button>
                          <span className="font-mono">
                            {t.official_deadline !== 'Not Set' ? t.official_deadline : 'No Date'}
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
          <div 
            className={cn(
              "flex-1 overflow-x-auto p-3 sm:p-6",
              mobileSection === 'swimlanes' ? 'flex flex-col' : 'hidden md:flex md:flex-col'
            )}
          >
            {/* Mobile Swimlane Quick Jump Pills */}
            <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 shrink-0 border-b border-border/50">
              <span className="text-[10px] font-bold text-muted-foreground shrink-0 uppercase tracking-wider">
                Jump to:
              </span>
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => scrollToSwimlane(g.id)}
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 flex items-center gap-1 bg-card hover:bg-muted transition-colors cursor-pointer"
                  style={{ borderColor: `${g.color || '#0052cc'}60` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color || '#0052cc' }} />
                  <span className="truncate max-w-[120px]">{g.name}</span>
                  <span className="text-[9px] opacity-70">({g.taskKeys.length})</span>
                </button>
              ))}
            </div>

            <div className="flex items-start gap-3 sm:gap-5 min-w-max h-full snap-x snap-mandatory">
              {groups.map((group) => {
                const isOver = dragOverGroupId === group.id;

                return (
                  <div
                    key={group.id}
                    id={`swimlane-${group.id}`}
                    onDragOver={(e) => handleDragOver(e, group.id)}
                    onDragLeave={(e) => handleDragLeave(e, group.id)}
                    onDrop={(e) => handleDropInGroup(e, group.id)}
                    className={`w-[86vw] sm:w-80 md:w-96 snap-center sm:snap-start shrink-0 flex flex-col rounded-xl border bg-card/60 backdrop-blur-xs shadow-sm transition-colors duration-200 max-h-full ${
                      isOver ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border'
                    }`}
                  >
                    {/* Group Header */}
                    <div 
                      className="p-3 sm:p-3.5 border-b border-border flex items-center justify-between gap-2 rounded-t-xl"
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
                          type="button"
                          onClick={() => handleDeleteGroup(group.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                          title="Delete Group"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Group Task Sequence Cards */}
                    <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2.5">
                      {group.taskKeys.length === 0 ? (
                        <div className="border-2 border-dashed border-border/80 rounded-lg p-6 sm:p-8 text-center text-xs text-muted-foreground">
                          No tasks in this swimlane yet. Add tasks from the backlog.
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
                          const stepMeta = plannedStepsMeta[key];
                          const checklist = stepMeta?.checklist || [];
                          const completedCount = checklist.filter((i) => i.done).length;

                          const visualState = getStepVisualState(task, group, index);
                          const StepIcon = visualState.icon;

                          return (
                            <div
                              key={key}
                              draggable
                              onDragStart={(e) => handleDragStart(e, key)}
                              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onDrop={(e) => handleDropOnTaskCard(e, group.id, key)}
                              className="bg-card border border-border rounded-lg p-2.5 sm:p-3 shadow-2xs hover:shadow-xs transition-all space-y-2 cursor-grab active:cursor-grabbing relative group"
                            >
                              {/* DYNAMIC & INTERACTIVE PLANNED ICON TRIGGER */}
                              <div className="flex items-center justify-between gap-1.5 border-b border-border/60 pb-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInspectingStepTask(task);
                                    setInspectingStepIndex(index);
                                    setInspectingGroup(group);
                                    setIsStepDetailOpen(true);
                                  }}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs min-h-[28px] ${visualState.className}`}
                                  title="Click to open Deep Strategic Step Controller & Checklist"
                                >
                                  <StepIcon className={`w-3.5 h-3.5 ${visualState.iconClassName}`} />
                                  <span className="font-bold">{visualState.label}</span>
                                  
                                  {/* Micro-checklist progress badge */}
                                  {checklist.length > 0 && (
                                    <span className="ml-1 px-1 rounded-full bg-foreground/10 text-[9px] font-mono font-bold">
                                      ✓ {completedCount}/{checklist.length}
                                    </span>
                                  )}

                                  {/* Google Cal scheduled indicator */}
                                  {sched && (
                                    <span className="ml-0.5 text-blue-500 font-bold" title="Scheduled on Google Calendar">
                                      📅
                                    </span>
                                  )}
                                </button>

                                <div className="flex items-center gap-1">
                                  {/* Touch-Friendly Sequence Shift Buttons for Mobile */}
                                  <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() => handleMoveStep(group, key, 'up')}
                                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 rounded hover:bg-muted transition-colors md:hidden"
                                    title="Move Step Up"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={index >= group.taskKeys.length - 1}
                                    onClick={() => handleMoveStep(group, key, 'down')}
                                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 rounded hover:bg-muted transition-colors md:hidden"
                                    title="Move Step Down"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTaskFromGroup(group.id, key)}
                                    className="opacity-70 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded transition-opacity"
                                    title="Remove from this group"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
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

                              {/* Tactical Step Notes snippet if present */}
                              {stepMeta?.notes && (
                                <p className="text-[11px] text-muted-foreground/90 italic bg-muted/30 px-2 py-1 rounded border border-border/50 line-clamp-1">
                                  &quot;{stepMeta.notes}&quot;
                                </p>
                              )}

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
                              <div className="pt-1.5 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                                <button
                                  type="button"
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

      {/* VIEW 2: GOOGLE CALENDAR AGENDA VIEW — Responsive */}
      {viewMode === 'agenda' && (
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
            {/* Agenda Header Context */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-card border border-border shadow-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                  <h2 className="text-sm sm:text-base font-bold text-foreground">Google Calendar Focus Agenda</h2>
                  <Badge variant="outline" className="text-[10px] font-mono border-blue-500/30 text-blue-600 dark:text-blue-400">
                    {scheduledTasksList.length} Scheduled
                  </Badge>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  Scheduled time-blocks synced for <span className="font-semibold text-foreground">{userCalendarEmail}</span>.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyIcsFeed}
                  className="h-7 sm:h-8 text-xs font-semibold gap-1.5"
                >
                  {copiedIcs ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIcs ? 'Copied' : 'Sync iCal'}</span>
                </Button>
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-7 sm:h-8 px-2.5 sm:px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Google Cal</span>
                </a>
              </div>
            </div>

            {/* Scheduled Tasks List or Empty State */}
            {scheduledTasksList.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border p-8 sm:p-12 text-center space-y-3 sm:space-y-4 bg-card/40">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto">
                  <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6" />
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
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                  {scheduledTasksList.map(({ schedule, task }) => {
                    const selfTarget = task ? personalData[task.key]?.self_target : undefined;
                    const nickname = task ? personalData[task.key]?.nickname : undefined;
                    const bufferDays = task ? calculateBufferDays(task.official_deadline, selfTarget || '') : 0;

                    return (
                      <Card key={schedule.taskKey} className="overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                          {/* Time & Date Block */}
                          <div className="flex items-center gap-3 min-w-[180px]">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 flex flex-col items-center justify-center shrink-0">
                              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">
                                {new Date(schedule.startDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short' })}
                              </span>
                              <span className="text-sm sm:text-base font-extrabold leading-none">
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
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
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

                            <p className="text-xs font-medium text-foreground line-clamp-2">
                              {task?.title || schedule.title}
                            </p>

                            {schedule.description && (
                              <p className="text-[11px] text-muted-foreground italic line-clamp-1">
                                &quot;{schedule.description}&quot;
                              </p>
                            )}
                          </div>

                          {/* Deadlines, Buffer & Actions */}
                          <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
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
              <div className="space-y-2.5 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-bold text-foreground">Unscheduled Tasks (Recommended for Focus)</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                  {tasks
                    .filter((t) => !calendarSchedules[t.key] && t.status !== 'Done')
                    .slice(0, 6)
                    .map((t) => {
                      const selfTarget = personalData[t.key]?.self_target;
                      const bufferDays = calculateBufferDays(t.official_deadline, selfTarget || '');

                      return (
                        <div
                          key={t.key}
                          className="p-2.5 sm:p-3 bg-card border border-border rounded-lg shadow-2xs space-y-1.5 flex flex-col justify-between hover:border-primary/40 transition-colors"
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

      {/* Deep Strategic Step Controller Dialog */}
      <PlannedStepDetailDialog
        isOpen={isStepDetailOpen}
        onOpenChange={setIsStepDetailOpen}
        task={inspectingStepTask}
        stepIndex={inspectingStepIndex}
        totalSteps={inspectingGroup?.taskKeys.length || 1}
        group={inspectingGroup}
        allGroups={groups}
        personal={inspectingStepTask ? personalData[inspectingStepTask.key] : undefined}
        schedule={inspectingStepTask ? calendarSchedules[inspectingStepTask.key] : undefined}
        metadata={inspectingStepTask ? plannedStepsMeta[inspectingStepTask.key] : undefined}
        onSaveMetadata={handleSavePlannedMetadata}
        onMoveStep={(direction) => {
          if (inspectingGroup && inspectingStepTask) {
            handleMoveStep(inspectingGroup, inspectingStepTask.key, direction);
          }
        }}
        onMoveToGroup={(targetGroupId) => {
          if (inspectingGroup && inspectingStepTask) {
            handleMoveToGroup(inspectingGroup.id, targetGroupId, inspectingStepTask.key);
          }
        }}
        onOpenCalendarScheduler={(task) => {
          setIsStepDetailOpen(false);
          setSchedulingTask(task);
          setIsSchedulerOpen(true);
        }}
        onSaveNickname={handleSaveNickname}
      />

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
