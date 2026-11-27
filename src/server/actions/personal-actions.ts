'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getCollections, isDatabaseConfigured, MONGODB_DB_NAME } from '@/lib/db';
import { PersonalRecord } from '@/types';

const savePersonalRecordSchema = z.object({
  task_id: z.string().trim().min(1, 'task_id is required').max(120),
  nickname: z.string().max(300).optional(),
  self_target: z.string().max(60).optional(),
  self_priority: z.string().max(40).optional(),
  new_note: z.string().max(5000).optional(),
  new_update: z.string().max(5000).optional(),
  timestamp: z.string().max(100).optional(),
});

export async function savePersonalRecordAction(payload: unknown) {
  const parsed = savePersonalRecordSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid personal record payload' };
  }

  const data = parsed.data;
  const cols = await getCollections();
  if (!cols) {
    return {
      error: isDatabaseConfigured()
        ? `Unable to connect to MongoDB database "${MONGODB_DB_NAME}".`
        : 'MONGODB_URI is not configured in server environment secrets.',
    };
  }

  try {
    const existing = await cols.personalRecords.findOne(
      { taskId: data.task_id },
      { projection: { _id: 0 } }
    );

    const nickname =
      data.nickname !== undefined ? data.nickname.trim() : existing?.nickname || '';
    const selfTarget =
      data.self_target !== undefined ? data.self_target : existing?.selfTarget || '';
    const selfPriority =
      data.self_priority !== undefined ? data.self_priority : existing?.selfPriority || 'None';

    const notesLog = Array.isArray(existing?.notesLog) ? [...existing.notesLog] : [];
    const newNote = data.new_note?.trim();
    if (newNote) {
      const now = new Date();
      const ts =
        data.timestamp ||
        `${now.getDate()} ${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      notesLog.push({ timestamp: ts, note: newNote });
    }

    const dailyUpdates = Array.isArray(existing?.dailyUpdates)
      ? [...existing.dailyUpdates]
      : [];
    const newUpdate = data.new_update?.trim();
    if (newUpdate) {
      const now = new Date();
      const ts =
        data.timestamp ||
        `${now.getDate()} ${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      dailyUpdates.push({ timestamp: ts, update: newUpdate });
    }

    await cols.personalRecords.updateOne(
      { taskId: data.task_id },
      {
        $set: {
          taskId: data.task_id,
          nickname,
          selfTarget,
          selfPriority,
          notesLog,
          dailyUpdates,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    revalidatePath('/');
    return { ok: true };
  } catch (error) {
    console.error('[MongoDB] Failed to save personal record:', error);
    return { error: 'Failed to save to MongoDB' };
  }
}

export async function getPersonalRecordsAction(): Promise<Record<string, PersonalRecord>> {
  const cols = await getCollections();
  if (!cols) return {};

  try {
    const docs = await cols.personalRecords
      .find({}, { projection: { _id: 0 } })
      .toArray();

    const formattedMap: Record<string, PersonalRecord> = {};
    for (const row of docs) {
      formattedMap[row.taskId] = {
        nickname: row.nickname || undefined,
        self_target: row.selfTarget || undefined,
        self_priority: row.selfPriority || undefined,
        notes_log: Array.isArray(row.notesLog) ? row.notesLog : [],
        daily_updates: Array.isArray(row.dailyUpdates) ? row.dailyUpdates : [],
      };
    }

    return formattedMap;
  } catch (error) {
    console.error('[MongoDB] Failed to fetch personal records:', error);
    return {};
  }
}
