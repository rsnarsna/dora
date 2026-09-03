'use server';

import { db } from '@/lib/db';
import { personalRecords } from '@/lib/db/schema';
import { PersonalRecord } from '@/types';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function savePersonalRecordAction(payload: any) {
  const taskId = payload.task_id;
  if (!taskId) {
    return { error: 'task_id is required' };
  }

  if (!db) {
    return { error: 'Database connection failed' };
  }

  try {
    // 1. Fetch existing record
    const existingResult = await db.select().from(personalRecords).where(eq(personalRecords.taskId, taskId));
    const existing = existingResult[0] || {};
    
    // 2. Prepare new data
    const nickname = payload.nickname !== undefined ? payload.nickname.trim() : (existing.nickname || '');
    const self_target = payload.self_target !== undefined ? payload.self_target : (existing.selfTarget || '');
    const self_priority = payload.self_priority !== undefined ? payload.self_priority : (existing.selfPriority || 'None');
    
    const notes_log: any[] = Array.isArray(existing.notesLog) ? [...existing.notesLog] : [];
    const newNote = payload.new_note?.trim();
    if (newNote) {
      const now = new Date();
      const ts = payload.timestamp || `${now.getDate()} ${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      notes_log.push({ timestamp: ts, note: newNote });
    }

    const daily_updates: any[] = Array.isArray(existing.dailyUpdates) ? [...existing.dailyUpdates] : [];
    const newUpdate = payload.new_update?.trim();
    if (newUpdate) {
      const now = new Date();
      const ts = payload.timestamp || `${now.getDate()} ${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      daily_updates.push({ timestamp: ts, update: newUpdate });
    }

    // 3. Upsert into database
    await db.insert(personalRecords).values({
      taskId,
      nickname,
      selfTarget: self_target,
      selfPriority: self_priority,
      notesLog: notes_log,
      dailyUpdates: daily_updates,
    }).onConflictDoUpdate({
      target: personalRecords.taskId,
      set: {
        nickname,
        selfTarget: self_target,
        selfPriority: self_priority,
        notesLog: notes_log,
        dailyUpdates: daily_updates,
        updatedAt: new Date(),
      }
    });

    revalidatePath('/');
    return { ok: true };
  } catch (error) {
    console.error('Failed to save personal record:', error);
    return { error: 'Failed to save to database' };
  }
}

export async function getPersonalRecordsAction() {
  if (!db) return {};

  try {
    const data = await db.select().from(personalRecords);
    const formattedMap: Record<string, PersonalRecord> = {};
    
    data.forEach((row) => {
      formattedMap[row.taskId] = {
        nickname: row.nickname || undefined,
        self_target: row.selfTarget || undefined,
        self_priority: (row.selfPriority as any) || undefined,
        notes_log: (row.notesLog as any) || [],
        daily_updates: (row.dailyUpdates as any) || [],
      };
    });
    
    return formattedMap;
  } catch (e) {
    console.error('Failed to fetch personal records:', e);
    return {};
  }
}
