'use client';

import React, { useState } from 'react';
import { JiraTaskNode, PersonalDataMap } from '@/types';
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Tag, 
  LayoutList, 
  SlidersHorizontal,
  X,
  RotateCcw,
  Layers
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateTaskDialog } from '@/components/create-task-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSidebar } from '@/components/ui/sidebar';
import Link from 'next/link';

interface SidebarNavProps {
  nodes: JiraTaskNode[];
  personalData: PersonalDataMap;
  selectedTaskId: string | null;
  onSelectTask: (key: string) => void;
  assignees: string[];
  reporters: string[];
  statuses: string[];
  activeStatusFilter: string;
  onStatusFilterChange: (status: string) => void;
  activeAssigneeFilter: string;
  onAssigneeFilterChange: (assignee: string) => void;
  activeReporterFilter: string;
  onReporterFilterChange: (reporter: string) => void;
  statusColors: Record<string, string>;
  onRefreshData: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  nodes,
  personalData,
  selectedTaskId,
  onSelectTask,
  assignees,
  reporters,
  statuses,
  activeStatusFilter,
  onStatusFilterChange,
  activeAssigneeFilter,
  onAssigneeFilterChange,
  activeReporterFilter,
  onReporterFilterChange,
  statusColors: STATUS_COLORS,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'sprint' | 'backlog'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>({});

  const toggleNode = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenNodes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const matchesFilter = (node: JiraTaskNode): boolean => {
    // 1. Tab match
    if (activeTab === 'sprint' && !node._is_sprint) return false;
    if (activeTab === 'backlog' && !node._is_backlog) return false;

    // 2. Dropdown matches
    if (activeAssigneeFilter !== 'all' && node.assignee !== activeAssigneeFilter) return false;
    if (activeReporterFilter !== 'all' && node.reporter !== activeReporterFilter) return false;
    if (activeStatusFilter !== '' && node.status !== activeStatusFilter) return false;

    // 3. Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nick = (personalData[node.key]?.nickname || '').toLowerCase();
      const title = (node.title || '').toLowerCase();
      const key = (node.key || '').toLowerCase();
      const assignee = (node.assignee || '').toLowerCase();
      if (!title.includes(q) && !key.includes(q) && !nick.includes(q) && !assignee.includes(q)) {
        return false;
      }
    }

    return true;
  };

  // Helper to check if node or any of its children match
  const nodeOrChildMatches = (node: JiraTaskNode): boolean => {
    if (matchesFilter(node)) return true;
    return node.children ? node.children.some((child) => nodeOrChildMatches(child)) : false;
  };

  const activeFilterCount =
    (activeTab !== 'all' ? 1 : 0) +
    (activeAssigneeFilter !== 'all' ? 1 : 0) +
    (activeReporterFilter !== 'all' ? 1 : 0) +
    (activeStatusFilter !== '' ? 1 : 0) +
    (searchQuery.trim() !== '' ? 1 : 0);

  const handleResetFilters = () => {
    setActiveTab('all');
    onAssigneeFilterChange('all');
    onReporterFilterChange('all');
    onStatusFilterChange('');
    setSearchQuery('');
  };

  const renderFilterContent = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="font-bold text-xs flex items-center gap-1.5 text-foreground">
          <SlidersHorizontal className="w-3.5 h-3.5 text-primary" /> Task Configuration & Filters
        </div>
        {activeFilterCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground gap-1"
            onClick={handleResetFilters}
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </Button>
        )}
      </div>

      {/* View Scope Tabs */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-muted-foreground">Scope View</label>
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-7">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="sprint" className="text-xs">Sprint</TabsTrigger>
            <TabsTrigger value="backlog" className="text-xs">Backlog</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Status Filter */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-muted-foreground">Status</label>
        <Select 
          value={activeStatusFilter === '' ? 'all' : activeStatusFilter} 
          onValueChange={(val) => onStatusFilterChange(val === 'all' ? '' : val)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Assignee & Reporter */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground">Assignee</label>
          <Select value={activeAssigneeFilter} onValueChange={onAssigneeFilterChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {assignees.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground">Reporter</label>
          <Select value={activeReporterFilter} onValueChange={onReporterFilterChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reporters</SelectItem>
              {reporters.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Keyword Search inside popover */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-muted-foreground">Keyword Search</label>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search key, title, nickname..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const hasMatchingDescendant = (node: JiraTaskNode): boolean => {
    return node.children ? node.children.some((child) => matchesFilter(child) || hasMatchingDescendant(child)) : false;
  };

  const renderTreeItem = (node: JiraTaskNode, depth: number = 0, parentMatches: boolean = false) => {
    const isDirectMatch = matchesFilter(node);
    if (!parentMatches && !isDirectMatch && !hasMatchingDescendant(node)) return null;

    const hasChildren = node.children && node.children.length > 0;
    const isOpen = openNodes[node.key] !== undefined ? openNodes[node.key] : true;
    const nickname = personalData[node.key]?.nickname;
    const isSelected = selectedTaskId === node.key;
    const statusColor = STATUS_COLORS[node.status || 'To Do'] || '#97a0af';

    return (
      <div id={`task-${node.key}`} key={node.key} className="select-none" style={{ marginLeft: depth > 0 ? '12px' : '0px' }}>
        <div
          onClick={() => onSelectTask(node.key)}
          className={`flex items-start gap-2 p-2 rounded-md cursor-pointer transition-colors text-xs group ${
            isSelected
              ? 'bg-primary/10 border-l-4 border-primary text-primary font-semibold'
              : 'hover:bg-muted text-foreground/90 border-l-4 border-transparent'
          }`}
        >
          {hasChildren && (
            <button
              onClick={(e) => toggleNode(node.key, e)}
              className="mt-0.5 text-muted-foreground hover:text-foreground/90 p-0.5 rounded hover:bg-accent"
            >
              {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
          {!hasChildren && <div className="w-4.5" />} {/* Spacer for alignment */}

          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
              <span 
                className="w-2 h-2 rounded-full flex-shrink-0" 
                style={{ backgroundColor: statusColor }} 
                title={`Status: ${node.status}`} 
              />
              <span className="font-bold text-[10px] text-muted-foreground uppercase">{node.issue_type}</span>
              <span className={`font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>{node.key}</span>

              {nickname && (
                <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                  <Tag className="w-2.5 h-2.5" /> {nickname}
                </span>
              )}
            </div>
            <div className="text-foreground/80 font-medium truncate text-xs">{node.title}</div>
          </div>
        </div>

        {/* Children Render */}
        {hasChildren && isOpen && (
          <div className="border-l border-border pl-1 mt-1 space-y-1">
            {node.children.map((child) => renderTreeItem(child, depth + 1, parentMatches || isDirectMatch))}
          </div>
        )}
      </div>
    );
  };

  const flattenAllMatchingNodes = (items: JiraTaskNode[]): { node: JiraTaskNode; depth: number }[] => {
    const result: { node: JiraTaskNode; depth: number }[] = [];
    const traverse = (item: JiraTaskNode, depth: number) => {
      if (matchesFilter(item)) {
        result.push({ node: item, depth });
      }
      if (item.children && item.children.length > 0) {
        for (const child of item.children) {
          traverse(child, depth + 1);
        }
      }
    };
    for (const item of items) {
      traverse(item, 0);
    }
    return result;
  };

  const { state } = useSidebar();

  if (state === 'collapsed') {
    const collapsedItems = flattenAllMatchingNodes(nodes);

    return (
      <div className="flex flex-col h-full bg-card items-center py-3 w-full">
        {/* Top Actions in Collapsed State */}
        <div className="flex flex-col items-center space-y-2 mb-3 shrink-0">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link 
                  href="/dashboard" 
                  className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <LayoutList className="w-5 h-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                Dashboard Overview
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link 
                  href="/dashboard/roadmap" 
                  className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Layers className="w-5 h-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                Strategic Roadmap
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Config / Filters Popover */}
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <Popover>
                <PopoverTrigger asChild>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={activeFilterCount > 0 ? "secondary" : "ghost"}
                      size="icon" 
                      className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      {activeFilterCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </Button>
                  </TooltipTrigger>
                </PopoverTrigger>
                <TooltipContent side="right" className="text-xs">
                  Task Filters & Config {activeFilterCount > 0 ? `(${activeFilterCount} active)` : ''}
                </TooltipContent>
                <PopoverContent side="right" align="start" className="w-80 p-4 shadow-xl z-[70]">
                  {renderFilterContent()}
                </PopoverContent>
              </Popover>
            </Tooltip>
          </TooltipProvider>

          {/* Create Task Dialog */}
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div>
                  <CreateTaskDialog onTaskCreated={onRefreshData} iconOnly={true} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                Create New Task
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="w-6 h-px bg-border my-1 shrink-0" />

        {/* Task Nodes List (All Epics, Stories, Tasks & Subtasks Filtered in Real Time) */}
        <ScrollArea className="flex-1 w-full px-2">
          <div className="flex flex-col items-center space-y-2 py-2">
            {collapsedItems.map(({ node }) => {
              const statusColor = STATUS_COLORS[node.status || 'To Do'] || '#97a0af';
              const isSelected = selectedTaskId === node.key;
              const shortLabel = node.key.split('-')[1] || node.key.substring(0, 2);
              const isEpic = node.issue_type === 'Epic';
              const isStory = node.issue_type === 'Story';
              const isBug = node.issue_type === 'Bug';
              const nickname = personalData[node.key]?.nickname;
              
              return (
                <TooltipProvider key={node.key}>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div 
                        onClick={() => onSelectTask(node.key)}
                        className={`w-9 h-9 rounded-md flex flex-col shrink-0 items-center justify-center cursor-pointer transition-all shadow-sm ${
                          isSelected 
                            ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' 
                            : isEpic 
                            ? 'bg-muted hover:bg-accent text-foreground font-extrabold border-t border-purple-500/30' 
                            : 'bg-muted/60 hover:bg-accent text-foreground'
                        }`}
                        style={{ borderBottom: `3px solid ${statusColor}` }}
                      >
                        <span className="text-[11px] font-black leading-tight">{shortLabel}</span>
                        <span className={`text-[8px] leading-none uppercase font-bold tracking-tighter ${
                          isSelected 
                            ? 'text-primary-foreground/90' 
                            : isEpic 
                            ? 'text-purple-600 dark:text-purple-400' 
                            : isStory 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : isBug 
                            ? 'text-red-500' 
                            : 'text-muted-foreground'
                        }`}>
                          {node.issue_type === 'Epic' ? 'EP' : node.issue_type === 'Story' ? 'ST' : node.issue_type === 'Bug' ? 'BUG' : 'TSK'}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center" className="ml-2 z-[70] max-w-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className={`px-1 py-0.5 rounded text-[9px] uppercase font-bold ${
                          isEpic 
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' 
                            : isStory 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                            : isBug
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {node.issue_type}
                        </span>
                        <span className="font-extrabold">{node.key}</span>
                        {nickname && (
                          <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-1 rounded">
                            🏷️ {nickname}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-medium line-clamp-2">{node.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                          {node.status}
                        </span>
                        {node.assignee && <span>• {node.assignee}</span>}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="w-full border-r border-border bg-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-border space-y-2.5">
        {/* Navigation Switchers: Overview & Roadmap */}
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-muted/50 rounded-lg border border-border">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-semibold hover:bg-card text-foreground/80 hover:text-foreground transition-all"
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>Overview</span>
          </Link>
          <Link
            href="/dashboard/roadmap"
            className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-semibold hover:bg-card text-foreground/80 hover:text-foreground transition-all"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Roadmap</span>
          </Link>
        </div>

        <div className="flex items-center justify-between pt-1">
          <h2 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            Project Hierarchy
          </h2>
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant={activeFilterCount > 0 ? 'secondary' : 'ghost'}
                  size="icon" 
                  className="relative h-8 w-8 text-muted-foreground hover:text-foreground" 
                  title="Filter & Configuration"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-80 p-4 shadow-xl z-50">
                {renderFilterContent()}
              </PopoverContent>
            </Popover>
            <CreateTaskDialog onTaskCreated={onRefreshData} />
          </div>
        </div>

        {/* Quick Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search key, title, nickname..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-muted/40"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Active Filter Pills Bar */}
        {activeFilterCount > 0 && (
          <div className="flex items-center flex-wrap gap-1 text-[11px] pt-0.5">
            {activeTab !== 'all' && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-1 font-normal">
                {activeTab}
                <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => setActiveTab('all')} />
              </Badge>
            )}
            {activeAssigneeFilter !== 'all' && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-1 font-normal">
                Assignee: {activeAssigneeFilter}
                <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => onAssigneeFilterChange('all')} />
              </Badge>
            )}
            {activeReporterFilter !== 'all' && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-1 font-normal">
                Reporter: {activeReporterFilter}
                <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => onReporterFilterChange('all')} />
              </Badge>
            )}
            {activeStatusFilter !== '' && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-1 font-normal">
                Status: {activeStatusFilter}
                <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => onStatusFilterChange('')} />
              </Badge>
            )}
            <button 
              onClick={handleResetFilters} 
              className="text-[10px] text-muted-foreground hover:text-foreground ml-auto underline cursor-pointer"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Tree Content */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {nodes.map((node) => renderTreeItem(node))}
        </div>
      </ScrollArea>
    </div>
  );
};
