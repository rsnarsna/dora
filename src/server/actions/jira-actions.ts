'use server';

import { z } from 'zod';
import { getCollections, isDatabaseConfigured, MONGODB_DB_NAME } from '@/lib/db';
import { RawJiraIssue } from '@/types';

const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(300),
  issueType: z.string().trim().min(1).max(60),
  priority: z.string().trim().min(1).max(40),
  domain: z.string().trim().max(120).optional(),
});

/**
 * Fetch all Jira Tasks from MongoDB (`DoraMangement.jira_tasks`).
 */
export async function getJiraTasksAction(): Promise<RawJiraIssue[]> {
  try {
    const cols = await getCollections();
    if (!cols) return [];

    const tasks = await cols.jiraTasks
      .find({}, { projection: { _id: 0 } })
      .sort({ updatedAt: -1 })
      .toArray();

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
      in_active_sprint: Boolean(t.inActiveSprint),
      domain: t.domain || '',
    }));
  } catch (error) {
    console.error('[MongoDB] Failed to get Jira tasks:', error);
    return [];
  }
}

/**
 * Create a new custom task manually in MongoDB (`DoraMangement.jira_tasks`).
 */
export async function createTaskAction(data: {
  title: string;
  issueType: string;
  priority: string;
  domain?: string;
}) {
  const parsed = createTaskSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid task input');
  }

  const cols = await getCollections();
  if (!cols) {
    throw new Error(
      isDatabaseConfigured()
        ? `Unable to connect to MongoDB database "${MONGODB_DB_NAME}".`
        : 'MONGODB_URI is not configured in server environment secrets.'
    );
  }

  const rand = Math.floor(1000 + Math.random() * 9000);
  const key = `MANUAL-${rand}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
  const today = new Date().toISOString().slice(0, 10);

  await cols.jiraTasks.insertOne({
    key,
    parentKey: null,
    title: parsed.data.title,
    issueType: parsed.data.issueType,
    priority: parsed.data.priority,
    status: 'To Do',
    assignee: 'Unassigned',
    reporter: 'Manual',
    startDate: today,
    officialDeadline: 'Not Set',
    inActiveSprint: false,
    domain: parsed.data.domain || 'softmania-ps',
    updatedAt: new Date(),
  });

  return { ok: true, key };
}

/**
 * Legacy seed action — collections start empty by design until created or synced.
 */
export async function seedJiraTasksAction() {
  return {
    success: false,
    error: `Collections in ${MONGODB_DB_NAME} start empty. Create tasks manually or run Sync Jira.`,
  };
}
