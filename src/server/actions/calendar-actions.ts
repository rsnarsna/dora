'use server';

import { getAppConfigAction, saveAppConfigAction } from './config-actions';
import { TaskCalendarSchedule, AppConfig } from '@/lib/app-config';
import { revalidatePath } from 'next/cache';

/**
 * Save or update a task calendar schedule for a specific user account.
 */
export async function saveTaskCalendarScheduleAction(
  accountId: string,
  schedule: TaskCalendarSchedule
) {
  try {
    const config = await getAppConfigAction();
    const currentByAccount = config.calendarSchedulesByAccount || {};
    const accountSchedules = { ...(currentByAccount[accountId] || {}) };

    accountSchedules[schedule.taskKey] = {
      ...schedule,
      syncedAt: new Date().toISOString(),
    };

    const updatedConfig: AppConfig = {
      ...config,
      calendarSchedulesByAccount: {
        ...currentByAccount,
        [accountId]: accountSchedules,
      },
    };

    const result = await saveAppConfigAction(updatedConfig);
    if (!result.ok) {
      return { ok: false, error: result.error || 'Failed to save schedule' };
    }

    revalidatePath('/dashboard/roadmap');
    return { ok: true, schedule: accountSchedules[schedule.taskKey] };
  } catch (error: any) {
    console.error('Failed to save task calendar schedule:', error);
    return { ok: false, error: error?.message || 'Failed to save calendar schedule' };
  }
}

/**
 * Remove a scheduled task from Google Calendar schedule in Dora.
 */
export async function removeTaskCalendarScheduleAction(
  accountId: string,
  taskKey: string
) {
  try {
    const config = await getAppConfigAction();
    const currentByAccount = config.calendarSchedulesByAccount || {};
    const accountSchedules = { ...(currentByAccount[accountId] || {}) };

    delete accountSchedules[taskKey];

    const updatedConfig: AppConfig = {
      ...config,
      calendarSchedulesByAccount: {
        ...currentByAccount,
        [accountId]: accountSchedules,
      },
    };

    const result = await saveAppConfigAction(updatedConfig);
    if (!result.ok) {
      return { ok: false, error: result.error || 'Failed to remove schedule' };
    }

    revalidatePath('/dashboard/roadmap');
    return { ok: true };
  } catch (error: any) {
    console.error('Failed to remove task calendar schedule:', error);
    return { ok: false, error: error?.message || 'Failed to remove calendar schedule' };
  }
}

/**
 * Get all calendar schedules for a specific account.
 */
export async function getAccountCalendarSchedulesAction(
  accountId: string
): Promise<Record<string, TaskCalendarSchedule>> {
  try {
    const config = await getAppConfigAction();
    return config.calendarSchedulesByAccount?.[accountId] || {};
  } catch (error) {
    console.error('Failed to fetch calendar schedules:', error);
    return {};
  }
}
