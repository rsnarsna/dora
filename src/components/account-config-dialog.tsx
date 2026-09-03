'use client';

import React, { useState, useEffect } from 'react';
import { UserAccount } from '@/types';
import { JiraDomainConfig } from '@/lib/app-config';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, Briefcase, ShieldCheck, Check, Globe, Key, RefreshCw } from 'lucide-react';

interface AccountConfigDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: UserAccount[];
  assignees: string[];
  onSaveAccounts: (accounts: UserAccount[]) => void;
  jiraDomains?: JiraDomainConfig[];
  onSaveJiraDomains?: (domains: JiraDomainConfig[]) => void;
  onTriggerSync?: () => void;
  isSyncing?: boolean;
}

export const AccountConfigDialog: React.FC<AccountConfigDialogProps> = ({
  isOpen,
  onOpenChange,
  accounts,
  assignees,
  onSaveAccounts,
  jiraDomains = [],
  onSaveJiraDomains,
  onTriggerSync,
  isSyncing = false,
}) => {
  const [editingAccounts, setEditingAccounts] = useState<UserAccount[]>(accounts);
  const [editingDomains, setEditingDomains] = useState<JiraDomainConfig[]>(jiraDomains);
  const [selectedTab, setSelectedTab] = useState<string>(accounts[0]?.id || 'account-1');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEditingAccounts(accounts);
      setEditingDomains(jiraDomains);
      setIsSaved(false);
    }
  }, [isOpen, accounts, jiraDomains]);

  const handleFieldChange = (accId: string, field: keyof UserAccount, value: string) => {
    setEditingAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== accId) return acc;
        const updated = { ...acc, [field]: value };
        if (field === 'name') {
          const parts = value.trim().split(' ');
          updated.avatarInitials = (parts[0]?.[0] || 'U') + (parts[1]?.[0] || '');
        }
        return updated;
      })
    );
  };

  const handleDomainChange = (index: number, field: keyof JiraDomainConfig, value: string) => {
    setEditingDomains((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSave = async () => {
    onSaveAccounts(editingAccounts);
    if (onSaveJiraDomains) {
      await onSaveJiraDomains(editingDomains);
    }
    setIsSaved(true);
    setTimeout(() => {
      onOpenChange(false);
      setIsSaved(false);
    }, 600);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <User className="w-5 h-5 text-primary" /> Manage Accounts & Jira Servers
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure profiles, Jira assignee mappings, and Atlassian cloud connections to fetch live updates.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full pt-2">
          <TabsList className="grid w-full grid-cols-3">
            {editingAccounts.map((acc, idx) => (
              <TabsTrigger key={acc.id} value={acc.id} className="text-xs font-semibold">
                Account {idx + 1}: {acc.name.split(' ')[0]}
              </TabsTrigger>
            ))}
            <TabsTrigger value="jira-sync" className="text-xs font-semibold flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-blue-500" /> Jira Sync API
            </TabsTrigger>
          </TabsList>

          {editingAccounts.map((acc) => (
            <TabsContent key={acc.id} value={acc.id} className="space-y-4 pt-3">
              {/* Account Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <User className="w-3.5 h-3.5 text-muted-foreground" /> Full Name / Display Name
                </label>
                <Input
                  value={acc.name}
                  onChange={(e) => handleFieldChange(acc.id, 'name', e.target.value)}
                  placeholder="e.g. Narayanan S"
                  className="h-8 text-xs"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Email Address
                </label>
                <Input
                  value={acc.email}
                  onChange={(e) => handleFieldChange(acc.id, 'email', e.target.value)}
                  placeholder="e.g. narayanan@example.com"
                  className="h-8 text-xs"
                />
              </div>

              {/* Role Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" /> Job Role / Title
                </label>
                <Input
                  value={acc.role}
                  onChange={(e) => handleFieldChange(acc.id, 'role', e.target.value)}
                  placeholder="e.g. Product Manager"
                  className="h-8 text-xs"
                />
              </div>

              {/* Jira User Mapping */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" /> Jira Assignee Identity
                </label>
                <Select
                  value={acc.jiraUser}
                  onValueChange={(val) => handleFieldChange(acc.id, 'jiraUser', val)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Jira Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- No Direct Jira Mapping --</SelectItem>
                    {assignees.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Links this account profile to tasks assigned to this name in Jira.
                </p>
              </div>
            </TabsContent>
          ))}

          {/* Jira API Sync Tab */}
          <TabsContent value="jira-sync" className="space-y-4 pt-3">
            <div className="rounded-lg bg-blue-50/60 dark:bg-blue-950/30 p-3 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200">
              <p className="font-semibold mb-1 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-600" /> Fetch Live Data from Atlassian
              </p>
              <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
                Configure your Jira instance URLs, Jira Account Email, and Atlassian API Token. When you click <strong>Sync Jira Data</strong>, tasks will be freshly queried via REST API and upserted into your database.
              </p>
            </div>

            {editingDomains.map((dom, idx) => (
              <div key={idx} className="p-3 border rounded-lg space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary" /> {dom.label || `Jira Instance ${idx + 1}`}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Atlassian URL</label>
                  <Input
                    value={dom.url}
                    onChange={(e) => handleDomainChange(idx, 'url', e.target.value)}
                    placeholder="https://your-company.atlassian.net"
                    className="h-7 text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Jira User Email
                    </label>
                    <Input
                      value={dom.email}
                      onChange={(e) => handleDomainChange(idx, 'email', e.target.value)}
                      placeholder="user@example.com"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                      <Key className="w-3 h-3" /> API Token
                    </label>
                    <Input
                      type="password"
                      value={dom.token}
                      onChange={(e) => handleDomainChange(idx, 'token', e.target.value)}
                      placeholder="Atlassian API Token"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}

            {onTriggerSync && (
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={async () => {
                    if (onSaveJiraDomains) await onSaveJiraDomains(editingDomains);
                    onTriggerSync();
                  }}
                  disabled={isSyncing}
                  className="w-full text-xs font-bold gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Fetching Latest Data from Jira...' : 'Fetch & Sync Latest Data Now'}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-3 border-t border-border flex items-center justify-between sm:justify-between">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="text-xs gap-1.5" disabled={isSaved}>
            {isSaved ? (
              <>
                <Check className="w-3.5 h-3.5" /> Saved!
              </>
            ) : (
              'Save All Settings'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
