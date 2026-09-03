'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDashboard } from '@/components/dashboard-layout-client';

interface CreateTaskDialogProps {
  onTaskCreated: () => void;
  iconOnly?: boolean;
}

export const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({ onTaskCreated, iconOnly = false }) => {
  const { activeAccount } = useDashboard();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [issueType, setIssueType] = useState('Task');
  const [priority, setPriority] = useState('Medium');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setLoading(true);
    try {
      const { createTaskAction } = await import('@/server/actions/jira-actions');
      await createTaskAction({ 
        title, 
        issueType, 
        priority,
        domain: activeAccount?.jiraDomain || 'softmania-ps'
      });
      setIsOpen(false);
      setTitle('');
      setIssueType('Task');
      setPriority('Medium');
      onTaskCreated();
    } catch (error) {
      console.error('Failed to create task', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Plus className="w-4 h-4" />
          </Button>
        ) : (
          <Button size="sm" variant="default" className="h-7 text-xs px-2.5 shadow-sm font-semibold">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">Title</label>
            <Input 
              placeholder="E.g. Review new design comps..." 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">Issue Type</label>
              <Select value={issueType} onValueChange={setIssueType} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Task">Task</SelectItem>
                  <SelectItem value="Story">Story</SelectItem>
                  <SelectItem value="Bug">Bug</SelectItem>
                  <SelectItem value="Epic">Epic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">Priority</label>
              <Select value={priority} onValueChange={setPriority} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Highest">Highest</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Lowest">Lowest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={!title || loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
