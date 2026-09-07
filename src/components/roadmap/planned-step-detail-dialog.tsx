'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { RawJiraIssue, PersonalRecord } from '@/types';
import { 
  RoadmapGroup, 
  TaskCalendarSchedule, 
  PlannedStepMetadata, 
  PlannedStepChecklistItem 
} from '@/lib/app-config';
import { calculateBufferDays } from '@/lib/jira-utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  PlayCircle,
  CircleDashed,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CalendarDays,
  ExternalLink,
  Plus,
  Trash2,
  Check,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Tag,
  Target,
  ListTodo,
  Layers,
  ChevronRight,
  ShieldCheck,
  Flame
} from 'lucide-react';
import Link from 'next/link';

interface PlannedStepDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  task: RawJiraIssue | null;
  stepIndex: number;
  totalSteps: number;
  group: RoadmapGroup | null;
  allGroups: RoadmapGroup[];
  personal?: PersonalRecord;
  schedule?: TaskCalendarSchedule;
  metadata?: PlannedStepMetadata;
  onSaveMetadata: (taskKey: string, meta: PlannedStepMetadata) => Promise<void>;
  onMoveStep?: (direction: 'up' | 'down') => void;
  onMoveToGroup?: (targetGroupId: string) => void;
  onOpenCalendarScheduler?: (task: RawJiraIssue) => void;
  onSaveNickname?: (taskKey: string, nickname: string) => Promise<void>;
}

type StepStatusOption = 'auto' | 'active' | 'planned' | 'in_progress' | 'blocked' | 'done';

const STATUS_OPTIONS: Array<{
  id: StepStatusOption;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClasses: string;
  activeClasses: string;
  description: string;
}> = [
  {
    id: 'active',
    label: 'Active Strategic Focus',
    icon: PlayCircle,
    colorClasses: 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50',
    activeClasses: 'bg-blue-600 text-white font-bold border-blue-600 shadow-sm',
    description: 'The primary active milestone item you are currently executing.'
  },
  {
    id: 'in_progress',
    label: 'In Flight / Work Underway',
    icon: Zap,
    colorClasses: 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/50',
    activeClasses: 'bg-amber-600 text-white font-bold border-amber-600 shadow-sm',
    description: 'Code is being written, PR in review, or active development underway.'
  },
  {
    id: 'planned',
    label: 'Planned Next Sequence',
    icon: CircleDashed,
    colorClasses: 'text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50',
    activeClasses: 'bg-indigo-600 text-white font-bold border-indigo-600 shadow-sm',
    description: 'Queued to start immediately once the preceding focus block is done.'
  },
  {
    id: 'blocked',
    label: 'Blocked / Dependency Waiting',
    icon: AlertTriangle,
    colorClasses: 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/50',
    activeClasses: 'bg-red-600 text-white font-bold border-red-600 shadow-sm',
    description: 'Waiting on external API, review approval, or design clarification.'
  },
  {
    id: 'done',
    label: 'Completed / Milestone Cleared',
    icon: CheckCircle2,
    colorClasses: 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50',
    activeClasses: 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-sm',
    description: 'Done, verified, and ready to advance to the next roadmap milestone.'
  },
  {
    id: 'auto',
    label: 'Auto (Sequence Derived)',
    icon: Clock,
    colorClasses: 'text-muted-foreground border-border hover:bg-muted',
    activeClasses: 'bg-muted-foreground/20 text-foreground font-bold border-foreground/40 shadow-xs',
    description: 'Automatically derived: First incomplete task is Active, others are Planned.'
  },
];

export const PlannedStepDetailDialog: React.FC<PlannedStepDetailDialogProps> = ({
  isOpen,
  onOpenChange,
  task,
  stepIndex,
  totalSteps,
  group,
  allGroups,
  personal,
  schedule,
  metadata,
  onSaveMetadata,
  onMoveStep,
  onMoveToGroup,
  onOpenCalendarScheduler,
  onSaveNickname,
}) => {
  if (!task) return null;

  const [statusOverride, setStatusOverride] = useState<StepStatusOption>(
    metadata?.statusOverride || 'auto'
  );
  const [checklist, setChecklist] = useState<PlannedStepChecklistItem[]>(
    metadata?.checklist || []
  );
  const [newChecklistText, setNewChecklistText] = useState('');
  const [notes, setNotes] = useState(metadata?.notes || '');
  const [nickname, setNickname] = useState(personal?.nickname || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Sync state whenever task or metadata changes
  useEffect(() => {
    setStatusOverride(metadata?.statusOverride || 'auto');
    setChecklist(metadata?.checklist || []);
    setNotes(metadata?.notes || '');
    setNickname(personal?.nickname || '');
  }, [task?.key, metadata, personal]);

  const selfTarget = personal?.self_target;
  const bufferDays = calculateBufferDays(task.official_deadline, selfTarget || '');

  // Checklist calculations
  const totalItems = checklist.length;
  const completedItems = checklist.filter((i) => i.done).length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    const newItem: PlannedStepChecklistItem = {
      id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: newChecklistText.trim(),
      done: false,
    };
    const nextList = [...checklist, newItem];
    setChecklist(nextList);
    setNewChecklistText('');
  };

  const handleToggleChecklistItem = (id: string) => {
    const nextList = checklist.map((item) =>
      item.id === id ? { ...item, done: !item.done } : item
    );
    setChecklist(nextList);
  };

  const handleDeleteChecklistItem = (id: string) => {
    const nextList = checklist.filter((item) => item.id !== id);
    setChecklist(nextList);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const updatedMeta: PlannedStepMetadata = {
        statusOverride,
        checklist,
        notes: notes.trim(),
      };

      await onSaveMetadata(task.key, updatedMeta);

      if (onSaveNickname && nickname !== (personal?.nickname || '')) {
        await onSaveNickname(task.key, nickname.trim());
      }

      setSaveMessage('Saved successfully!');
      setTimeout(() => {
        setSaveMessage(null);
        onOpenChange(false);
      }, 700);
    } catch (err: any) {
      console.error('Failed to save planned step detail:', err);
      setSaveMessage('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0">
        {/* Top Header Banner */}
        <DialogHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-sm text-primary">
                {task.key}
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">
                {task.issue_type}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-bold">
                {task.priority}
              </Badge>
              {group && (
                <div 
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border"
                  style={{ 
                    borderColor: group.color || '#0052cc',
                    backgroundColor: `${group.color || '#0052cc'}15`
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: group.color || '#0052cc' }} />
                  <span>{group.name}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <span>Step {stepIndex + 1} of {totalSteps}</span>
            </div>
          </div>

          <DialogTitle className="text-base font-bold text-foreground mt-1.5 leading-snug">
            {task.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Strategic step controller, focus time block, and tactical execution checklist.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 sm:space-y-6">
          {/* SECTION 1: Interactive Step Status Override */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" />
                <span>Planned Milestone Status</span>
              </label>
              <span className="text-[11px] text-muted-foreground">
                Override position-derived status
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = statusOverride === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStatusOverride(opt.id)}
                    className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? opt.activeClasses
                        : `bg-card ${opt.colorClasses}`
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs font-bold leading-tight">{opt.label}</span>
                    </div>
                    <p className={`text-[10px] leading-tight line-clamp-2 ${
                      isSelected ? 'text-white/90' : 'text-muted-foreground'
                    }`}>
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: Deep Google Calendar Focus Integration */}
          <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Google Calendar Focus Slot</h4>
                  <p className="text-[11px] text-muted-foreground">
                    {schedule 
                      ? `Scheduled: ${schedule.startDate} at ${schedule.startTime} (${schedule.durationMinutes}m)`
                      : 'Not yet scheduled on Google Calendar'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {schedule?.googleCalendarUrl && (
                  <a
                    href={schedule.googleCalendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded text-xs font-semibold bg-card border border-border text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open in Cal</span>
                  </a>
                )}
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    if (onOpenCalendarScheduler) {
                      onOpenCalendarScheduler(task);
                    }
                  }}
                  className="h-7 text-xs font-semibold gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Clock className="w-3 h-3" />
                  <span>{schedule ? 'Reschedule Block' : '+ Schedule Focus Block'}</span>
                </Button>
              </div>
            </div>

            {/* Strategic Buffer & Deadline Radar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-blue-200/60 dark:border-blue-900/40 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground block">Jira Deadline</span>
                <span className="font-mono font-semibold text-foreground text-[11px]">
                  {task.official_deadline || 'Not Set'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Self Target</span>
                <span className="font-mono font-semibold text-foreground text-[11px]">
                  {selfTarget || 'Not Set'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Buffer Margin</span>
                <span className={`font-bold text-[11px] ${
                  bufferDays < 0 ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  {bufferDays} days
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Jira Status</span>
                <span className="font-mono font-semibold text-foreground text-[11px]">
                  {task.status}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: Tactical Micro-Checklist (Sub-steps for this planned milestone) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ListTodo className="w-3.5 h-3.5 text-primary" />
                <span>Tactical Micro-Checklist</span>
                {totalItems > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                    {completedItems}/{totalItems} ({progressPercent}%)
                  </Badge>
                )}
              </label>
              <span className="text-[11px] text-muted-foreground">
                Sub-actions to complete before advancing
              </span>
            </div>

            {/* Mini Progress Bar */}
            {totalItems > 0 && (
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            {/* Checklist items */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors group"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleChecklistItem(item.id)}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      item.done 
                        ? 'bg-primary border-primary text-primary-foreground' 
                        : 'border-muted-foreground/40 bg-background'
                    }`}>
                      {item.done && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className={`text-xs leading-tight break-words flex-1 ${
                      item.done ? 'line-through text-muted-foreground' : 'text-foreground font-medium'
                    }`}>
                      {item.text}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteChecklistItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded transition-opacity"
                    title="Delete item"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new item input */}
            <div className="flex items-center gap-2">
              <Input
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                placeholder="Add sub-action (e.g. Write test suite, Verify edge case)..."
                className="h-8 text-xs bg-card"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddChecklistItem}
                className="h-8 text-xs font-semibold shrink-0 gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </Button>
            </div>
          </div>

          {/* SECTION 4: Sequence Position Shifter & Swimlane Move */}
          <div className="p-3 rounded-lg border border-border bg-card/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>Sequence & Swimlane Positioning</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                Current: Step {stepIndex + 1}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onMoveStep && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={stepIndex === 0}
                    onClick={() => onMoveStep('up')}
                    className="h-7 text-xs gap-1"
                  >
                    <ArrowUp className="w-3 h-3" />
                    <span>Move Step Up</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={stepIndex >= totalSteps - 1}
                    onClick={() => onMoveStep('down')}
                    className="h-7 text-xs gap-1"
                  >
                    <ArrowDown className="w-3 h-3" />
                    <span>Move Step Down</span>
                  </Button>
                </>
              )}

              {onMoveToGroup && allGroups.length > 1 && group && (
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-[11px] text-muted-foreground">Move to:</span>
                  <select
                    value={group.id}
                    onChange={(e) => onMoveToGroup(e.target.value)}
                    className="h-7 text-xs rounded border border-border bg-background px-2 py-0 font-medium"
                  >
                    {allGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5: Task Alias & Tactical Thinking Note */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-primary" />
                <span>Personal Task Nickname (Alias)</span>
              </label>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Auth Flow Overhaul"
                className="h-8 text-xs bg-card"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Tactical Thinking & Sandbox Notes</span>
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Capture strategic decisions, architectural considerations, or reminders for this step..."
                className="text-xs min-h-[60px] bg-card resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t border-border bg-card shrink-0 flex items-center justify-between sm:justify-between">
          <div className="text-xs text-emerald-600 font-semibold">
            {saveMessage}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={handleSaveAll}
              className="h-8 text-xs font-bold gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Step Plan'}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
