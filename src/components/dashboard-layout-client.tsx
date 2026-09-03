"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  SidebarProvider, 
  SidebarTrigger, 
  Sidebar, 
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton
} from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/sidebar-nav';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronsUpDown, Check, Settings, UserCheck, RefreshCw, Layers } from 'lucide-react';
import { RawJiraIssue, PersonalDataMap, UserAccount } from '@/types';
import { getJiraTasksAction } from '@/server/actions/jira-actions';
import { getPersonalRecordsAction } from '@/server/actions/personal-actions';
import { getAppConfigAction, saveAppConfigAction } from '@/server/actions/config-actions';
import { syncJiraDataAction } from '@/server/actions/jira-sync-actions';
import { buildJiraHierarchy } from '@/lib/jira-utils';
import { AppConfig, DEFAULT_CONFIG, JiraDomainConfig } from '@/lib/app-config';
import { AccountConfigDialog } from '@/components/account-config-dialog';

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [issues, setIssues] = useState<RawJiraIssue[]>([]);
  const [personalData, setPersonalData] = useState<PersonalDataMap>({});
  const [isLoading, setIsLoading] = useState(true);

  // Backend config state
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  // Accounts state — initialized from backend config
  const [accounts, setAccounts] = useState<UserAccount[]>(DEFAULT_CONFIG.accounts);
  const [activeAccountId, setActiveAccountId] = useState<string>('account-1');
  const [isAccountConfigOpen, setIsAccountConfigOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const activeAccount = useMemo(() => {
    return accounts.find((a) => a.id === activeAccountId) || accounts[0] || DEFAULT_CONFIG.accounts[0];
  }, [accounts, activeAccountId]);

  const handleSwitchAccount = (accId: string) => {
    setActiveAccountId(accId);
    try {
      localStorage.setItem('pm_active_account_id', accId);
    } catch (e) {}
  };

  const handleJiraSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncJiraDataAction();
      if (res.ok && res.totalFetched > 0) {
        alert(`✅ Jira sync complete!\n\nSuccessfully fetched and updated ${res.totalFetched} tasks from Atlassian into Supabase.`);
        await loadData();
      } else if (!res.ok) {
        alert(`${res.error}\n\nOpening Configuration settings for you now...`);
        setIsAccountConfigOpen(true);
      } else {
        alert('⚠️ Jira sync returned 0 issues. Check your Jira JQL permissions.');
      }
    } catch (e: any) {
      alert('Error syncing Jira tasks: ' + (e.message || e));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveAccounts = async (updatedAccounts: UserAccount[]) => {
    setAccounts(updatedAccounts);
    // Persist to backend config
    const updatedConfig = { ...appConfig, accounts: updatedAccounts };
    setAppConfig(updatedConfig);
    await saveAppConfigAction(updatedConfig);
  };

  const handleSaveJiraDomains = async (domains: JiraDomainConfig[]) => {
    const updatedConfig = { ...appConfig, jiraDomains: domains };
    setAppConfig(updatedConfig);
    await saveAppConfigAction(updatedConfig);
  };

  // Filters
  const [activeStatusFilter, setActiveStatusFilter] = useState('');
  const [activeAssigneeFilter, setActiveAssigneeFilter] = useState('all');
  const [activeReporterFilter, setActiveReporterFilter] = useState('all');

  const loadData = async () => {
    try {
      // Load backend config first
      const config = await getAppConfigAction();
      setAppConfig(config);
      setAccounts(config.accounts);

      const pdata = await getPersonalRecordsAction();
      setPersonalData(pdata);
      const rawIssues = await getJiraTasksAction();
      setIssues(rawIssues);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Restore active account from localStorage after config loads
  useEffect(() => {
    try {
      const savedActiveId = localStorage.getItem('pm_active_account_id');
      if (savedActiveId) {
        setActiveAccountId(savedActiveId);
      }
    } catch (e) {}
  }, []);

  // Sync activeAssigneeFilter when activeAccount changes
  useEffect(() => {
    if (activeAccount && activeAccount.jiraUser && activeAccount.jiraUser !== 'none') {
      setActiveAssigneeFilter(activeAccount.jiraUser);
    } else {
      setActiveAssigneeFilter('all');
    }
  }, [activeAccount]);

  // Compute live filtered data based on active filters & active account domain
  const filteredIssues = useMemo(() => {
    let result = issues;
    if (activeAccount && activeAccount.jiraDomain && activeAccount.jiraDomain !== 'all') {
      result = result.filter(i => !i.domain || i.domain === activeAccount.jiraDomain);
    }
    if (activeAssigneeFilter !== 'all') {
      result = result.filter(i => i.assignee === activeAssigneeFilter);
    }
    if (activeReporterFilter !== 'all') {
      result = result.filter(i => i.reporter === activeReporterFilter);
    }
    return result;
  }, [issues, activeAccount, activeAssigneeFilter, activeReporterFilter]);

  // Issues belonging to the current active account's domain
  const domainIssues = useMemo(() => {
    if (activeAccount && activeAccount.jiraDomain && activeAccount.jiraDomain !== 'all') {
      return issues.filter(i => !i.domain || i.domain === activeAccount.jiraDomain);
    }
    return issues;
  }, [issues, activeAccount]);

  const assignees = useMemo(() => Array.from(new Set(domainIssues.map((i) => i.assignee || 'Unassigned'))), [domainIssues]);
  const reporters = useMemo(() => Array.from(new Set(domainIssues.map((i) => i.reporter || 'Unknown'))), [domainIssues]);
  const statuses = useMemo(() => Array.from(new Set(domainIssues.map((i) => i.status))), [domainIssues]);

  // Full hierarchy of current domain so children and subtasks are preserved
  const domainHierarchy = useMemo(() => {
    return buildJiraHierarchy(domainIssues);
  }, [domainIssues]);

  const selectedTaskId = pathname.split('/').pop() || null;

  const handleSelectTask = (key: string) => {
    router.push(`/dashboard/${key}`);
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading dashboard...</div>;
  }

  return (
    <DashboardContext.Provider value={{ 
      issues: filteredIssues, 
      allIssues: issues,
      domainIssues,
      personalData, 
      hierarchy: domainHierarchy, 
      activeStatusFilter, 
      setActiveStatusFilter, 
      activeAccount,
      accounts,
      switchAccount: handleSwitchAccount,
      appConfig,
      loadData 
    }}>
      <SidebarProvider 
        defaultOpen={appConfig.sidebar.defaultOpen} 
        style={{ '--sidebar-width': appConfig.sidebar.width } as React.CSSProperties}
      >
        <Sidebar variant="sidebar" collapsible="icon">
          <SidebarContent>
            <SidebarNav
              nodes={domainHierarchy}
              personalData={personalData}
              selectedTaskId={selectedTaskId}
              onSelectTask={handleSelectTask}
              assignees={assignees}
              reporters={reporters}
              statuses={statuses}
              activeStatusFilter={activeStatusFilter}
              onStatusFilterChange={setActiveStatusFilter}
              activeAssigneeFilter={activeAssigneeFilter}
              onAssigneeFilterChange={setActiveAssigneeFilter}
              activeReporterFilter={activeReporterFilter}
              onReporterFilterChange={setActiveReporterFilter}
              statusColors={appConfig.statusColors}
              onRefreshData={loadData}
            />
          </SidebarContent>

          {/* User Profile & Account Switcher Footer */}
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton 
                      size="lg" 
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground border border-transparent hover:border-border transition-colors cursor-pointer"
                    >
                      <Avatar className="h-8 w-8 rounded-lg border border-primary/20">
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-black text-xs">
                          {activeAccount.avatarInitials || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-bold text-xs">{activeAccount.name}</span>
                        <span className="truncate text-[11px] text-muted-foreground">{activeAccount.role}</span>
                      </div>
                      <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent 
                    className="w-64 rounded-xl p-2 shadow-xl z-[80]" 
                    side="right" 
                    align="end" 
                    sideOffset={6}
                  >
                    {/* Active Account Info Header */}
                    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/40 mb-1.5">
                      <Avatar className="h-9 w-9 rounded-lg">
                        <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-black text-xs">
                          {activeAccount.avatarInitials || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold truncate text-foreground">{activeAccount.name}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{activeAccount.email}</span>
                        <span className="text-[10px] text-primary font-semibold flex items-center gap-1 mt-0.5">
                          <UserCheck className="w-2.5 h-2.5" /> {activeAccount.role}
                        </span>
                      </div>
                    </div>

                    <DropdownMenuSeparator />

                    {/* Switch Account Section */}
                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Switch Active Account
                    </div>

                    <div className="space-y-1 my-1">
                      {accounts.map((acc, idx) => {
                        const isCurrent = acc.id === activeAccountId;
                        return (
                          <DropdownMenuItem
                            key={acc.id}
                            onClick={() => handleSwitchAccount(acc.id)}
                            className={`flex items-center justify-between cursor-pointer p-2 rounded-lg text-xs transition-colors ${
                              isCurrent ? 'bg-secondary font-bold text-foreground' : 'hover:bg-muted text-muted-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="h-6 w-6 rounded-md">
                                <AvatarFallback className={`rounded-md text-[10px] font-bold ${
                                  isCurrent ? 'bg-primary/20 text-primary' : 'bg-muted-foreground/10 text-muted-foreground'
                                }`}>
                                  {acc.avatarInitials || `A${idx + 1}`}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0">
                                <span className="truncate leading-none">{acc.name}</span>
                                <span className="text-[10px] text-muted-foreground truncate">{acc.role}</span>
                              </div>
                            </div>
                            {isCurrent && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                          </DropdownMenuItem>
                        );
                      })}
                    </div>

                    <DropdownMenuSeparator />

                    {/* Manage Accounts & Settings */}
                    <DropdownMenuItem 
                      onClick={() => setIsAccountConfigOpen(true)}
                      className="cursor-pointer text-xs gap-2 py-2"
                    >
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <span>Configure Accounts & Jira Sync...</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-background">
          <header className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <Link href="/dashboard" className="ml-1 font-bold text-sm hover:text-primary transition-colors cursor-pointer flex items-center gap-2">
                <span>{appConfig.app.title}</span>
              </Link>

              <div className="hidden md:flex items-center gap-1 ml-3 border-l border-border pl-3">
                <Link
                  href="/dashboard"
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    pathname === '/dashboard' 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  Overview
                </Link>
                <Link
                  href="/dashboard/roadmap"
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                    pathname === '/dashboard/roadmap' 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Strategic Roadmap
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleJiraSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-md border border-blue-200 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Jira'}</span>
              </button>
              <span className="text-xs text-muted-foreground hidden sm:inline">Active Profile:</span>
              <button 
                onClick={() => setIsAccountConfigOpen(true)}
                className="inline-flex items-center gap-1.5 bg-muted/60 hover:bg-muted text-xs font-semibold px-2.5 py-1 rounded-md border border-border cursor-pointer transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{activeAccount.name}</span>
                <span className="text-[10px] text-muted-foreground font-normal">({activeAccount.role})</span>
              </button>
            </div>
          </header>
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </SidebarProvider>

      {/* Account Settings & Configuration Dialog */}
      <AccountConfigDialog
        isOpen={isAccountConfigOpen}
        onOpenChange={setIsAccountConfigOpen}
        accounts={accounts}
        assignees={assignees}
        onSaveAccounts={handleSaveAccounts}
        jiraDomains={appConfig.jiraDomains || []}
        onSaveJiraDomains={handleSaveJiraDomains}
        onTriggerSync={handleJiraSync}
        isSyncing={isSyncing}
      />
    </DashboardContext.Provider>
  );
}

// Context for child pages
import { createContext, useContext } from 'react';
export const DashboardContext = createContext<any>(null);
export const useDashboard = () => useContext(DashboardContext);
