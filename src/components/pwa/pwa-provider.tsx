'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { updatePwaNativeBadge, updateDynamicFavicon } from '@/lib/pwa-badge';

interface PwaContextType {
  isInstalled: boolean;
  isInstallable: boolean;
  installPwa: () => Promise<void>;
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

const APP_TITLE = 'Dora — Personal Management & Strategic Roadmap';

export const PwaProvider: React.FC<PwaProviderProps> = ({
  children,
  activeWorkCount = 0,
  isTimerRunning = false,
  isSyncing = false,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  // Register Service Worker & Listen for Native App Life-Cycle
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => {
        console.warn('PWA: Service worker registration note:', err);
      });

    // Detect standalone mode (already installed & running as standalone desktop/mobile app)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

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

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Synchronize Dynamic Native App Badge, Tab Favicon, and Document Title
  useEffect(() => {
    // 1. Native OS Taskbar / Mobile Launcher Badge
    updatePwaNativeBadge(activeWorkCount);

    // 2. Real-Time In-Tab Favicon Counter & Glow Ring
    updateDynamicFavicon({
      count: activeWorkCount,
      isTimerRunning,
      isSyncing,
    });

    // 3. Document Title with Unread / Active Indicator
    if (typeof document !== 'undefined') {
      document.title = activeWorkCount > 0 ? `(${activeWorkCount}) ${APP_TITLE}` : APP_TITLE;
    }
  }, [activeWorkCount, isTimerRunning, isSyncing]);

  const installPwa = useCallback(async () => {
    if (!deferredPrompt) {
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const value = useMemo(
    () => ({
      isInstalled,
      isInstallable: !!deferredPrompt,
      installPwa,
    }),
    [isInstalled, deferredPrompt, installPwa]
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
};

