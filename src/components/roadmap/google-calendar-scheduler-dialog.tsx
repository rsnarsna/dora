'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { RawJiraIssue, PersonalRecord } from '@/types';
import { TaskCalendarSchedule } from '@/lib/app-config';
import { 
  buildGoogleCalendarUrl, 
  buildTaskCalendarDescription 
} from '@/lib/google-calendar-utils';
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
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Zap,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface GoogleCalendarSchedulerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  task: RawJiraIssue | null;
  personal?: PersonalRecord;
  currentSchedule?: TaskCalendarSchedule;
  accountEmail: string;
  onSaveSchedule: (schedule: TaskCalendarSchedule) => Promise<void>;
  onRemoveSchedule?: (taskKey: string) => Promise<void>;
}

const DURATION_PRESETS = [
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '90 min', value: 90 },
  { label: '2 hours', value: 120 },
  { label: '3.5h Deep Work', value: 210 },
];

export const GoogleCalendarSchedulerDialog: React.FC<GoogleCalendarSchedulerDialogProps> = ({
  isOpen,
  onOpenChange,
  task,
  personal,
  currentSchedule,
  accountEmail,
  onSaveSchedule,
  onRemoveSchedule,
}) => {
  if (!task) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const initialDate = currentSchedule?.startDate 
    || (task.official_deadline && task.official_deadline !== 'Not Set' ? task.official_deadline : '')
    || personal?.self_target 
    || todayStr;

  const [startDate, setStartDate] = useState<string>(initialDate);
  const [startTime, setStartTime] = useState<string>(currentSchedule?.startTime || '10:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(currentSchedule?.durationMinutes || 90);
  const [notes, setNotes] = useState<string>(currentSchedule?.description || '');
  const [status, setStatus] = useState<'scheduled' | 'tentative' | 'completed'>(
    currentSchedule?.status || 'scheduled'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const defaultDate = currentSchedule?.startDate 
        || (task.official_deadline && task.official_deadline !== 'Not Set' ? task.official_deadline : '')
        || personal?.self_target 
        || todayStr;
      setStartDate(defaultDate);
      setStartTime(currentSchedule?.startTime || '10:00');
      setDurationMinutes(currentSchedule?.durationMinutes || 90);
      setNotes(currentSchedule?.description || '');
      setStatus(currentSchedule?.status || 'scheduled');
      setSaveSuccess(false);
    }
  }, [isOpen, task, currentSchedule, personal, todayStr]);

  // Buffer calculation
  const bufferDays = useMemo(() => {
    return calculateBufferDays(task.official_deadline, personal?.self_target || startDate);
  }, [task.official_deadline, personal?.self_target, startDate]);

  // End time calculation
  const endTime = useMemo(() => {
    try {
      const [h, m] = startTime.split(':').map(Number);
      const startMinutes = h * 60 + m;
      const endTotal = startMinutes + durationMinutes;
      const endH = Math.floor(endTotal / 60) % 24;
      const endM = endTotal % 60;
      return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    } catch {
      return '11:30';
    }
  }, [startTime, durationMinutes]);

  // Full calendar event title
  const eventTitle = `[${task.key}] ${personal?.nickname ? `"${personal.nickname}" ` : ''}${task.title}`;

  // Full formatted event description
  const fullDescription = useMemo(() => {
    return buildTaskCalendarDescription(task, personal, notes);
  }, [task, personal, notes]);

  // Real-time Google Calendar web intent URL
  const googleCalendarUrl = useMemo(() => {
    return buildGoogleCalendarUrl({
      title: eventTitle,
      description: fullDescription,
      startDate,
      startTime,
      endDate: startDate,
      endTime,
      durationMinutes,
      accountEmail,
      location: 'Dora Strategic Workspace',
    });
  }, [eventTitle, fullDescription, startDate, startTime, endTime, durationMinutes, accountEmail]);

  const handleOpenGoogleCalendar = () => {
    window.open(googleCalendarUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSave = async (andOpenGoogle = false) => {
    setIsSaving(true);
    try {
      const schedule: TaskCalendarSchedule = {
        taskKey: task.key,
        title: task.title,
        startDate,
        startTime,
        endDate: startDate,
        endTime,
        durationMinutes,
        description: notes,
        googleCalendarUrl,
        syncedAt: new Date().toISOString(),
        status,
      };

      await onSaveSchedule(schedule);
      setSaveSuccess(true);

      if (andOpenGoogle) {
        handleOpenGoogleCalendar();
      }

      setTimeout(() => {
        setIsSaving(false);
        onOpenChange(false);
      }, 700);
    } catch (err) {
      console.error('Failed to save schedule:', err);
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemoveSchedule) return;
    if (confirm(`Remove Google Calendar schedule for ${task.key}?`)) {
      setIsSaving(true);
      await onRemoveSchedule(task.key);
      setIsSaving(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-foreground">
                  Schedule on Google Calendar
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Allocate dedicated focus blocks on your active Google account calendar.
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 border-blue-200 text-blue-700 bg-blue-50/50">
              {accountEmail}
            </Badge>
          </div>
        </DialogHeader>

        {/* Task Context Card */}
        <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-mono font-bold text-primary">
              <span>{task.key}</span>
              <span className="text-muted-foreground font-normal">({task.issue_type})</span>
              {personal?.nickname && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 font-sans">
                  {personal.nickname}
                </Badge>
              )}
            </div>
            <Badge variant="outline" className="text-[10px]">
              {task.status}
            </Badge>
          </div>

          <div className="font-semibold text-foreground leading-snug">
            {task.title}
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/60">
            <span>Official Deadline: <strong className="text-foreground">{task.official_deadline || 'Not set'}</strong></span>
            {personal?.self_target && (
              <span>Self-Target: <strong className="text-foreground">{personal.self_target}</strong></span>
            )}
            <Badge 
              variant="outline" 
              className={`text-[9px] px-1.5 ${bufferDays < 0 ? 'text-red-600 border-red-300' : 'text-emerald-600 border-emerald-300'}`}
            >
              {bufferDays >= 0 ? `+${bufferDays}d buffer` : `${bufferDays}d overdue`}
            </Badge>
          </div>
        </div>

        {/* Scheduling Inputs Form */}
        <div className="space-y-3.5 pt-1 text-xs">
          {/* Date & Start Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-primary" /> Focus Session Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-primary" /> Start Time (HH:MM)
              </label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          {/* Duration Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Focus Block Duration
              </label>
              <span className="text-[10px] text-muted-foreground font-mono">
                {startTime} → {endTime} ({durationMinutes}m)
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {DURATION_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  variant={durationMinutes === preset.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDurationMinutes(preset.value)}
                  className="h-7 text-[11px] font-semibold px-2.5"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Focus Session Notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Session Intent & Notes (Added to Calendar)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Outline specific objectives for this focus block, e.g. review PR #42, complete ingestion pipeline..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border flex items-center justify-between sm:justify-between gap-2">
          <div>
            {currentSchedule && onRemoveSchedule && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={isSaving}
                className="text-destructive hover:bg-destructive/10 text-xs h-8 gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove Schedule
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="text-xs h-8 gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saveSuccess ? 'Saved!' : 'Save Schedule in Dora'}</span>
            </Button>

            <Button
              size="sm"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="text-xs h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open & Add in Google Cal</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
