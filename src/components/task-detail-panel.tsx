'use client';

import React, { useState, useEffect } from 'react';
import { RawJiraIssue, PersonalRecord } from '@/types';
import { calculateBufferDays } from '@/lib/jira-utils';
import { Save, Plus, Tag, User, CheckCircle, ArrowUp, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';

interface TaskDetailPanelProps {
  task?: RawJiraIssue;
  personalRecord: PersonalRecord;
  children?: RawJiraIssue[];
  allIssues?: RawJiraIssue[];
  statusColors?: Record<string, string>;
  statusThemes?: Record<string, { bg: string; fg: string; border: string }>;
  onRefreshData: () => void;
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
  task,
  personalRecord,
  children = [],
  allIssues = [],
  statusColors = {},
  statusThemes = {},
  onRefreshData,
}) => {
  const [nickname, setNickname] = useState(personalRecord?.nickname || '');
  const [selfTarget, setSelfTarget] = useState(personalRecord?.self_target || '');
  const [selfPriority, setSelfPriority] = useState(personalRecord?.self_priority || 'None');
  const [newNote, setNewNote] = useState('');
  const [newUpdate, setNewUpdate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (task) {
      setNickname(personalRecord.nickname || '');
      setSelfTarget(personalRecord.self_target || '');
      setSelfPriority(personalRecord.self_priority || 'None');
    }
  }, [task, personalRecord]);

  if (!task) return null;

  const bufferDays = calculateBufferDays(task.official_deadline, selfTarget);

  // Find parent task for breadcrumb
  const parentTask = task.parent_key 
    ? allIssues.find(i => i.key === task.parent_key) 
    : null;

  // Status theme helper
  const getTheme = (status: string) => {
    return statusThemes[status] || { bg: '#f4f5f7', fg: '#5e6c84', border: '#97a0af' };
  };

  const handleSavePersonal = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const { savePersonalRecordAction } = await import('@/server/actions/personal-actions');
      const res = await savePersonalRecordAction({
        task_id: task.key,
        nickname,
        self_target: selfTarget,
        self_priority: selfPriority,
        new_note: newNote.trim(),
        new_update: newUpdate.trim(),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setNewNote('');
        setNewUpdate('');
        onRefreshData();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(res.error || 'Failed to save changes');
      }
    } catch (e) {
      console.error('Error saving personal record:', e);
      alert('Error connecting to server');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await handleSavePersonal();
  };

  const handleAddUpdate = async () => {
    if (!newUpdate.trim()) return;
    await handleSavePersonal();
  };

  const notesLog = personalRecord.notes_log || [];
  const dailyUpdates = personalRecord.daily_updates || [];

  return (
    <div className="w-full h-full max-w-4xl mx-auto p-6 overflow-y-auto" id={`task-panel-${task.key}`}>
      {/* Back to Overview + Parent Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-3 py-1.5 rounded-md border border-border transition-colors"
        >
          ← Back to Overview
        </Link>

        {/* Parent breadcrumb — matches Python build_dashboard.py */}
        {parentTask && (
          <>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <Link
              href={`/dashboard/${parentTask.key}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <ArrowUp className="w-3 h-3" />
              {parentTask.key}
              <span className="text-muted-foreground font-normal truncate max-w-[200px]">
                ({parentTask.title})
              </span>
            </Link>
          </>
        )}
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge variant="outline">{task.issue_type}</Badge>
          <span className="font-bold text-primary">{task.key}</span>
          {nickname && (
            <Badge variant="secondary" className="gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
              <Tag className="w-3.5 h-3.5" /> {nickname}
            </Badge>
          )}
          <Badge className="ml-auto">{task.status}</Badge>
        </div>
        <h2 className="text-2xl font-bold">{task.title}</h2>
        <div className="flex items-center gap-4 text-xs mt-2 text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" /> Assignee: <b className="text-foreground">{task.assignee}</b>
          </span>
          <span>Reporter: <b className="text-foreground">{task.reporter}</b></span>
          <span>Priority: <b>{task.priority}</b></span>
        </div>
      </div>

      <div className="space-y-6 pb-6">
        {/* Date & Buffer Grid */}
        <div className="grid grid-cols-4 gap-3 text-xs">
          <div className="bg-muted p-3 rounded-lg border">
            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Started</div>
            <div className="font-bold">{task.start_date || 'N/A'}</div>
          </div>
          <div className="bg-blue-50/50 p-3 rounded-lg border-t-2 border-t-blue-500 border border-border">
            <div className="text-[10px] uppercase font-bold text-blue-600 mb-1">Self Target</div>
            <div className="font-bold text-blue-700">{selfTarget || 'Not Set'}</div>
          </div>
          <div className="bg-red-50/50 p-3 rounded-lg border-t-2 border-t-red-500 border border-border">
            <div className="text-[10px] uppercase font-bold text-red-600 mb-1">Deadline</div>
            <div className="font-bold text-red-700">{task.official_deadline || 'Not Set'}</div>
          </div>
          <div className="bg-muted p-3 rounded-lg border-t-2 border-t-green-500 border border-border">
            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Buffer</div>
            <div className={`font-bold text-sm ${bufferDays >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {bufferDays}d
            </div>
          </div>
        </div>

        {/* Subtasks Section — Styled to match Jira Subtasks table from screenshot */}
        {children.length > 0 && (() => {
          const doneSubtasks = children.filter((c) => c.status === 'Done').length;
          const progressPercent = Math.round((doneSubtasks / children.length) * 100);

          return (
            <div className="bg-card border rounded-lg p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">Subtasks</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                    {children.length}
                  </Badge>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">
                  {progressPercent}% Done
                </span>
              </div>

              {/* Progress Bar across top */}
              <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Subtasks Table matching Jira Work, Priority, Assignee, Status */}
              <div className="border rounded-md overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/40 border-b text-[11px] font-bold text-muted-foreground uppercase">
                  <div className="col-span-6 sm:col-span-7">Work</div>
                  <div className="col-span-2 hidden sm:block">Priority</div>
                  <div className="col-span-3 sm:col-span-2">Assignee</div>
                  <div className="col-span-3 sm:col-span-1 text-right">Status</div>
                </div>

                <div className="divide-y divide-border">
                  {children.map((child) => {
                    const theme = getTheme(child.status);
                    const assigneeInitial =
                      child.assignee && child.assignee !== 'Unassigned'
                        ? child.assignee.charAt(0).toUpperCase()
                        : 'U';
                    return (
                      <Link
                        key={child.key}
                        href={`/dashboard/${child.key}`}
                        className="grid grid-cols-12 gap-2 px-3 py-2.5 items-center hover:bg-muted/30 transition-colors text-xs group"
                      >
                        {/* Work column: Subtask icon + Key + Summary */}
                        <div className="col-span-6 sm:col-span-7 flex items-center gap-2 min-w-0">
                          <span className="text-blue-500 flex-shrink-0 text-sm font-bold">↳</span>
                          <span className="font-bold text-primary group-hover:underline flex-shrink-0">
                            {child.key}
                          </span>
                          <span className="text-foreground truncate font-medium">
                            {child.title}
                          </span>
                        </div>

                        {/* Priority */}
                        <div className="col-span-2 hidden sm:flex items-center gap-1.5 text-muted-foreground text-[11px]">
                          <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border">
                            {child.priority}
                          </span>
                        </div>

                        {/* Assignee */}
                        <div className="col-span-3 sm:col-span-2 flex items-center gap-1.5 min-w-0">
                          <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0">
                            {assigneeInitial}
                          </div>
                          <span className="text-muted-foreground text-[11px] truncate">
                            {child.assignee || 'Unassigned'}
                          </span>
                        </div>

                        {/* Status */}
                        <div className="col-span-3 sm:col-span-1 flex justify-end">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap"
                            style={{ background: theme.bg, color: theme.fg }}
                          >
                            {child.status}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Personal Settings Layer */}
        <div className="bg-card border rounded-lg p-5 space-y-5 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              🎯 Self-Discipline & Tracking Settings
            </h3>
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Saved
                </span>
              )}
              <Button size="sm" onClick={handleSavePersonal} disabled={isSaving}>
                <Save className="w-4 h-4 mr-1.5" /> {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Task Nickname</label>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Framework CIM"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Self Target Date</label>
              <Input
                type="date"
                value={selfTarget}
                onChange={(e) => setSelfTarget(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Self Priority</label>
              <Select value={selfPriority} onValueChange={setSelfPriority}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Live Buffer Days</label>
              <div className="h-8 px-3 py-1.5 bg-muted rounded-md font-bold text-muted-foreground text-xs flex items-center">
                {bufferDays} Days Remaining
              </div>
            </div>
          </div>

          {/* Timestamped Personal Notes Log */}
          <div className="pt-3 border-t space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Personal Notes Log</label>
            <ScrollArea className="h-[120px] rounded-md border p-2">
              {notesLog.length > 0 ? (
                <div className="space-y-2">
                  {notesLog.map((n, idx) => (
                    <div key={idx} className="flex gap-2 text-xs border-b pb-1 last:border-0">
                      <Badge variant="secondary" className="h-5 px-1.5 font-mono text-[10px]">{n.timestamp}</Badge>
                      <span className="whitespace-pre-wrap">{n.note}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs italic text-muted-foreground">No notes logged yet.</div>
              )}
            </ScrollArea>

            <div className="flex gap-2">
              <Textarea
                placeholder="Type personal note (Ctrl+Enter to add)..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && handleAddNote()}
                className="resize-none min-h-[44px] text-xs"
              />
              <Button onClick={handleAddNote} className="h-[44px]">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Timestamped Daily Tracking Log */}
          <div className="pt-3 border-t space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Daily Tracking Log</label>
            <ScrollArea className="h-[120px] rounded-md border p-2">
              {dailyUpdates.length > 0 ? (
                <div className="space-y-2">
                  {dailyUpdates.map((u, idx) => (
                    <div key={idx} className="flex gap-2 text-xs border-b pb-1 last:border-0">
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 h-5 px-1.5 font-mono text-[10px]">
                        {u.timestamp}
                      </Badge>
                      <span className="whitespace-pre-wrap">{u.update}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs italic text-muted-foreground">No updates logged yet.</div>
              )}
            </ScrollArea>

            <div className="flex gap-2">
              <Textarea
                placeholder="Type daily update (Ctrl+Enter to add)..."
                value={newUpdate}
                onChange={(e) => setNewUpdate(e.target.value)}
                onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && handleAddUpdate()}
                className="resize-none min-h-[44px] text-xs"
              />
              <Button onClick={handleAddUpdate} className="h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="w-4 h-4 mr-1" /> Update
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
