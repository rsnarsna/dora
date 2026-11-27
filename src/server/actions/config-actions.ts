'use server';

import { z } from 'zod';
import { getCollections, isDatabaseConfigured, MONGODB_DB_NAME } from '@/lib/db';
import { AppConfig, DEFAULT_CONFIG } from '@/lib/app-config';

const appConfigSchema = z.object({
  app: z.object({
    title: z.string(),
    description: z.string(),
  }),
  sidebar: z.object({
    width: z.string(),
    defaultOpen: z.boolean(),
  }),
  accounts: z.array(z.any()),
  jiraDomains: z.array(z.any()),
  roadmapGroups: z.array(z.any()),
  roadmapGroupsByAccount: z.record(z.string(), z.array(z.any())).optional(),
  calendarSchedulesByAccount: z.record(z.string(), z.record(z.string(), z.any())).optional(),
  plannedStepsByAccount: z.record(z.string(), z.record(z.string(), z.any())).optional(),
  statusColors: z.record(z.string(), z.string()),
  statusThemes: z.record(
    z.string(),
    z.object({
      bg: z.string(),
      fg: z.string(),
      border: z.string(),
    })
  ),
});

/**
 * Fetch the app config from MongoDB (`DoraMangement.app_config`).
 * Starts empty on first run: if no document exists yet, returns DEFAULT_CONFIG
 * in memory without auto-inserting into MongoDB until the user explicitly saves.
 */
export async function getAppConfigAction(): Promise<AppConfig> {
  const cols = await getCollections();
  if (!cols) return DEFAULT_CONFIG;

  try {
    const doc = await cols.appConfig.findOne(
      { id: 'default' },
      { projection: { _id: 0 } }
    );

    if (!doc || !doc.config) {
      return DEFAULT_CONFIG;
    }

    const stored = doc.config as Partial<AppConfig>;
    return {
      app: { ...DEFAULT_CONFIG.app, ...(stored.app || {}) },
      sidebar: { ...DEFAULT_CONFIG.sidebar, ...(stored.sidebar || {}) },
      accounts: stored.accounts && stored.accounts.length > 0 ? stored.accounts : DEFAULT_CONFIG.accounts,
      jiraDomains: stored.jiraDomains && stored.jiraDomains.length > 0 ? stored.jiraDomains : DEFAULT_CONFIG.jiraDomains,
      roadmapGroups: Array.isArray(stored.roadmapGroups) ? stored.roadmapGroups : DEFAULT_CONFIG.roadmapGroups,
      roadmapGroupsByAccount: stored.roadmapGroupsByAccount || DEFAULT_CONFIG.roadmapGroupsByAccount || {},
      calendarSchedulesByAccount: stored.calendarSchedulesByAccount || {},
      plannedStepsByAccount: stored.plannedStepsByAccount || {},
      statusColors: { ...DEFAULT_CONFIG.statusColors, ...(stored.statusColors || {}) },
      statusThemes: { ...DEFAULT_CONFIG.statusThemes, ...(stored.statusThemes || {}) },
    };
  } catch (error) {
    console.error('[MongoDB] Failed to fetch app config:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Save updated app config to MongoDB (`DoraMangement.app_config`).
 */
export async function saveAppConfigAction(config: AppConfig): Promise<{ ok: boolean; error?: string }> {
  const parsed = appConfigSchema.safeParse(config);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid configuration payload' };
  }

  const cols = await getCollections();
  if (!cols) {
    return {
      ok: false,
      error: isDatabaseConfigured()
        ? `Unable to connect to MongoDB database "${MONGODB_DB_NAME}". Please verify MONGODB_URI and Atlas network access.`
        : 'MONGODB_URI is not configured in server environment secrets.',
    };
  }

  try {
    await cols.appConfig.updateOne(
      { id: 'default' },
      {
        $set: {
          id: 'default',
          config: parsed.data as AppConfig,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return { ok: true };
  } catch (error) {
    console.error('[MongoDB] Failed to save app config:', error);
    return { ok: false, error: 'Failed to save config to MongoDB' };
  }
}

/**
 * Lightweight server check for MongoDB configuration & connectivity status.
 */
export async function getDatabaseStatusAction(): Promise<{
  configured: boolean;
  connected: boolean;
  database: string;
}> {
  const configured = isDatabaseConfigured();
  if (!configured) {
    return { configured: false, connected: false, database: MONGODB_DB_NAME };
  }
  const cols = await getCollections();
  return {
    configured: true,
    connected: Boolean(cols),
    database: MONGODB_DB_NAME,
  };
}
