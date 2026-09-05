'use client';

import React from 'react';
import { usePwa } from './pwa-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Smartphone, 
  Download, 
  Bell, 
  CheckCircle2, 
  Activity, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Layers 
} from 'lucide-react';

interface PwaStatusButtonProps {
  inProgressCount?: number;
  activeSprintCount?: number;
  isTimerRunning?: boolean;
}

export const PwaStatusButton: React.FC<PwaStatusButtonProps> = ({
  inProgressCount = 0,
  activeSprintCount = 0,
  isTimerRunning = false,
}) => {
  const { 
    isInstalled, 
    isInstallable, 
    installPwa, 
    activeBadgeCount, 
    triggerTestBadge, 
    requestNotificationPermission,
    notificationPermission 
  } = usePwa();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative inline-flex items-center gap-1.5 px-2.5 py-1 h-8 rounded-md text-xs font-semibold border transition-all cursor-pointer bg-card/80 hover:bg-card border-border hover:border-primary/50 shadow-2xs"
          title="Dora PWA Status & Dynamic Badging"
        >
          {/* Status Indicator Icon */}
          {isInstallable ? (
            <Download className="w-3.5 h-3.5 text-blue-500 animate-bounce" />
          ) : (
            <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
          )}

          <span className="hidden md:inline">
            {isInstallable ? 'Install PWA' : 'PWA'}
          </span>

          {/* Dynamic Active Work Count Badge */}
          {activeBadgeCount > 0 ? (
            <span className="inline-flex items-center justify-center px-1.5 py-0 h-4 rounded-full bg-red-500 text-white font-mono text-[10px] font-black shadow-xs">
              {activeBadgeCount}
            </span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="All caught up" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-4 space-y-3 z-50 shadow-xl border-border">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground leading-none">Dora PWA Portal</h3>
              <span className="text-[10px] text-muted-foreground font-mono">
                {isInstalled ? 'Installed Standalone App' : 'Browser App Engine'}
              </span>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px] font-mono font-bold px-1.5">
            {isInstalled ? 'STANDALONE' : 'WEB CLIENT'}
          </Badge>
        </div>

        {/* Dynamic Badging & Favicon Status */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/60">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-muted-foreground font-medium">Dynamic App Badge</span>
            </div>
            <span className="font-bold text-foreground font-mono">
              {activeBadgeCount > 0 ? `${activeBadgeCount} Active` : 'Clear (0)'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/60">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-muted-foreground font-medium">In-Progress Tasks</span>
            </div>
            <span className="font-bold text-foreground font-mono">{inProgressCount}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/60">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-muted-foreground font-medium">Sprint Deliverables</span>
            </div>
            <span className="font-bold text-foreground font-mono">{activeSprintCount}</span>
          </div>

          {isTimerRunning && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-semibold">Focus Session Running</span>
              </div>
              <span className="font-mono text-[10px] uppercase font-bold">Active</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-2 border-t border-border space-y-2">
          {/* Install PWA Button */}
          {isInstallable && (
            <Button
              size="sm"
              onClick={installPwa}
              className="w-full h-8 text-xs font-bold gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Install Dora App
            </Button>
          )}

          {/* Test Badge Increment Button */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={triggerTestBadge}
              className="flex-1 h-7 text-[11px] font-semibold gap-1"
              title="Test dynamic badge count updates"
            >
              <Sparkles className="w-3 h-3 text-amber-500" /> Test Badge (+1)
            </Button>

            {notificationPermission !== 'granted' && (
              <Button
                variant="outline"
                size="sm"
                onClick={requestNotificationPermission}
                className="h-7 text-[11px] font-semibold gap-1"
                title="Enable OS system alerts"
              >
                <Bell className="w-3 h-3 text-muted-foreground" /> Alert Perms
              </Button>
            )}
          </div>

          <div className="text-[10px] text-muted-foreground/80 font-mono text-center pt-1">
            Dynamic PWA icon and OS taskbar badges update instantly with portal work.
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
