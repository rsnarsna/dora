'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { updatePwaNativeBadge, updateDynamicFavicon } from '@/lib/pwa-badge';

interface PwaContextType {
  isInstalled: boolean;
  isInstallable: boolean;
  installPwa: () => Promise<void>;
  activeBadgeCount: number;
  setActiveBadgeCount: (count: number) => void;
  triggerTestBadge: () => void;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  notificationPermission: NotificationPermission;
}

const PwaContext = createContext<PwaContextType | null>(null);

export const usePwa = () => {
  const context = useContext(PwaContext);
  if (!context) {
    throw new Error('usePwa must be used within a PwaProvider');
  }
  return context;
};

interface PwaProviderProps {
  children: React.ReactNode;
  activeWorkCount?: number;
  isTimerRunning?: boolean;
  isSyncing?: boolean;
}

export const PwaProvider: React.FC<PwaProviderProps> = ({
  children,
  activeWorkCount = 0,
  isTimerRunning = false,
  isSyncing = false,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [manualCount, setManualCount] = useState<number | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Effective badge count: manual override (e.g. testing) or calculated active portal work
  const effectiveCount = manualCount !== null ? manualCount : activeWorkCount;

  // Register Service Worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('✅ Dora PWA: Service worker active with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('⚠️ Dora PWA: Service worker registration note:', err);
        });

      // Detect standalone mode
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);

      // Listen for install availability
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      const handleAppInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      window.addEventListener('appinstalled', handleAppInstalled);

      if (typeof Notification !== 'undefined') {
        setNotificationPermission(Notification.permission);
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  // Sync Dynamic PWA App Badge and Canvas Favicon whenever work status updates
  useEffect(() => {
    updatePwaNativeBadge(effectiveCount);
    updateDynamicFavicon({
      count: effectiveCount,
      isTimerRunning,
      isSyncing,
    });
  }, [effectiveCount, isTimerRunning, isSyncing]);

  const installPwa = useCallback(async () => {
    if (!deferredPrompt) {
      alert('To install Dora on your device:\n\n• Chrome/Edge: Click the Install icon in the browser address bar.\n• iOS Safari: Tap Share ➔ "Add to Home Screen".');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const triggerTestBadge = useCallback(() => {
    setManualCount((prev) => {
      const next = prev === null ? activeWorkCount + 1 : (prev + 1) % 10;
      return next;
    });
  }, [activeWorkCount]);

  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof Notification === 'undefined') return 'denied';
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      return perm;
    } catch {
      return 'denied';
    }
  }, []);

  const value = useMemo(
    () => ({
      isInstalled,
      isInstallable: !!deferredPrompt,
      installPwa,
      activeBadgeCount: effectiveCount,
      setActiveBadgeCount: (c: number) => setManualCount(c),
      triggerTestBadge,
      requestNotificationPermission,
      notificationPermission,
    }),
    [isInstalled, deferredPrompt, installPwa, effectiveCount, triggerTestBadge, requestNotificationPermission, notificationPermission]
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
};
