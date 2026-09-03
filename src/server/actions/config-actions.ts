'use server';

import { db } from '@/lib/db';
import { appConfig } from '@/lib/db/schema';
import { AppConfig, DEFAULT_CONFIG } from '@/lib/app-config';
import { eq } from 'drizzle-orm';

/**
 * Fetch the app config from Supabase.
 * If no row exists, auto-seeds DEFAULT_CONFIG and returns it.
 */
export async function getAppConfigAction(): Promise<AppConfig> {
  if (!db) return DEFAULT_CONFIG;

  try {
    const rows = await db.select().from(appConfig).where(eq(appConfig.id, 'default'));

    if (rows.length === 0) {
      // Auto-seed the default config on first run
      await db.insert(appConfig).values({
        id: 'default',
        config: DEFAULT_CONFIG as any,
      });
      return DEFAULT_CONFIG;
    }

    // Merge with DEFAULT_CONFIG so any missing keys get filled in
    const stored = rows[0].config as Partial<AppConfig>;
    return {
      app: { ...DEFAULT_CONFIG.app, ...(stored.app || {}) },
      sidebar: { ...DEFAULT_CONFIG.sidebar, ...(stored.sidebar || {}) },
      accounts: stored.accounts && stored.accounts.length > 0 ? stored.accounts : DEFAULT_CONFIG.accounts,
      jiraDomains: stored.jiraDomains && stored.jiraDomains.length > 0 ? stored.jiraDomains : DEFAULT_CONFIG.jiraDomains,
      roadmapGroups: stored.roadmapGroups && Array.isArray(stored.roadmapGroups) ? stored.roadmapGroups : DEFAULT_CONFIG.roadmapGroups,
      roadmapGroupsByAccount: stored.roadmapGroupsByAccount || DEFAULT_CONFIG.roadmapGroupsByAccount || {},
      statusColors: { ...DEFAULT_CONFIG.statusColors, ...(stored.statusColors || {}) },
      statusThemes: { ...DEFAULT_CONFIG.statusThemes, ...(stored.statusThemes || {}) },
    };
  } catch (error) {
    console.error('Failed to fetch app config:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Save updated app config back to Supabase.
 */
export async function saveAppConfigAction(config: AppConfig): Promise<{ ok: boolean; error?: string }> {
  if (!db) return { ok: false, error: 'Database connection not available' };

  try {
    await db.insert(appConfig).values({
      id: 'default',
      config: config as any,
    }).onConflictDoUpdate({
      target: appConfig.id,
      set: {
        config: config as any,
        updatedAt: new Date(),
      },
    });

    return { ok: true };
  } catch (error) {
    console.error('Failed to save app config:', error);
    return { ok: false, error: 'Failed to save config to database' };
  }
}
