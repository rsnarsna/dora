'use server';

import { db } from '@/lib/db';
import { jiraTasks } from '@/lib/db/schema';
import { RawJiraIssue } from '@/types';
import { eq } from 'drizzle-orm';

/**
 * Fetch all Jira Tasks from Supabase
 */
export async function getJiraTasksAction(): Promise<RawJiraIssue[]> {
  try {
    if (!db) return [];
    
    const tasks = await db.select().from(jiraTasks);
    return tasks.map((t) => ({
      id: t.key,
      key: t.key,
      parent_key: t.parentKey,
      issue_type: t.issueType,
      title: t.title,
      status: t.status,
      assignee: t.assignee || '',
      reporter: t.reporter || '',
      priority: t.priority,
      start_date: t.startDate || '',
      official_deadline: t.officialDeadline || '',
      in_active_sprint: t.inActiveSprint || false,
      domain: t.domain || '',
    }));
  } catch (error) {
    console.error('Failed to get Jira tasks:', error);
    return [];
  }
}

/**
 * Create a new custom task manually in Supabase.
 */
export async function createTaskAction(data: { title: string; issueType: string; priority: string; domain?: string }) {
  if (!db) throw new Error('Database connection not established');
  
  // Generate a key (e.g. MANUAL-XYZ)
  const rand = Math.floor(1000 + Math.random() * 9000);
  const key = `MANUAL-${rand}`;

  await db.insert(jiraTasks).values({
    key,
    title: data.title,
    issueType: data.issueType,
    priority: data.priority,
    status: 'To Do',
    domain: data.domain || 'softmania-ps',
  });

  return { ok: true, key };
}

/**
 * Seed Jira Tasks into Supabase from the local JSON file.
 * (Deprecated: Data has been migrated to Supabase)
 */
export async function seedJiraTasksAction() {
  return { success: false, error: 'Data already migrated. JSON file has been removed.' };
}
