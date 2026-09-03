'use server';

import { db } from '@/lib/db';
import { jiraTasks } from '@/lib/db/schema';
import { JiraDomainConfig } from '@/lib/app-config';
import { getAppConfigAction } from './config-actions';

interface JiraSyncResult {
  ok: boolean;
  totalFetched: number;
  domains: { url: string; count: number; error?: string }[];
  error?: string;
}

/**
 * Fetch issues from a single Jira domain using Jira Cloud REST API v3
 */
async function fetchFromDomain(domain: JiraDomainConfig): Promise<{ tasks: any[]; error?: string }> {
  const jql = 'issuetype is not null ORDER BY created DESC';
  const tasks: any[] = [];
  const maxResults = 50;
  let nextPageToken: string | null = null;

  const email = domain.email?.trim() || process.env.JIRA_EMAIL?.trim() || '';
  const token = domain.token?.trim() || process.env.JIRA_TOKEN?.trim() || '';

  if (!email || !token) {
    return { tasks: [], error: `Missing email or API token for ${domain.url}` };
  }

  const domainPrefix = domain.url.replace(/^https?:\/\//, '').split('.')[0];
  const auth = Buffer.from(`${email}:${token}`).toString('base64');

  while (true) {
    let url = `${domain.url.replace(/\/$/, '')}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=*all&maxResults=${maxResults}`;
    if (nextPageToken) {
      url += `&nextPageToken=${encodeURIComponent(nextPageToken)}`;
    }

    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        const text = await res.text();
        return { tasks, error: `HTTP ${res.status}: ${text.slice(0, 250)}` };
      }

      const data = await res.json();
      const issues = data.issues || [];

      if (issues.length === 0) break;

      for (const issue of issues) {
        const fields = issue.fields || {};
        const dueDate = fields.duedate || 'Not Set';
        const createdDate = (fields.created || '').slice(0, 10);
        const statusName = fields.status?.name || 'Unknown';

        // Parent key — check parent object or Epic Link custom field
        let parentKey: string | null = null;
        if (fields.parent?.key) {
          parentKey = fields.parent.key;
        } else if (fields.customfield_10014) {
          parentKey = fields.customfield_10014;
        }

        // Sprint detection
        let inActiveSprint = false;
        const sprintField = fields.customfield_10020 || fields.sprint;
        if (Array.isArray(sprintField)) {
          inActiveSprint = sprintField.some((s: any) => s.state === 'active');
        } else if (sprintField?.state === 'active') {
          inActiveSprint = true;
        }

        tasks.push({
          key: issue.key,
          parentKey: parentKey,
          issueType: fields.issuetype?.name || 'Task',
          title: fields.summary || '',
          status: statusName,
          assignee: fields.assignee?.displayName || 'Unassigned',
          reporter: fields.reporter?.displayName || 'Unknown',
          priority: fields.priority?.name || 'None',
          startDate: createdDate,
          officialDeadline: dueDate,
          inActiveSprint: inActiveSprint,
          domain: domainPrefix,
        });
      }

      if (data.isLast || !data.nextPageToken) break;
      nextPageToken = data.nextPageToken;

    } catch (error: any) {
      return { tasks, error: error.message || 'Network error' };
    }
  }

  return { tasks };
}

/**
 * Sync all configured Jira domains → upsert into Supabase jira_tasks table.
 */
export async function syncJiraDataAction(): Promise<JiraSyncResult> {
  if (!db) {
    return { 
      ok: false, 
      totalFetched: 0, 
      domains: [], 
      error: 'Database connection failed: DATABASE_URL environment variable is missing on Vercel. Please verify Vercel Project Settings → Environment Variables (Production enabled) and Redeploy.' 
    };
  }

  try {
    const config = await getAppConfigAction();
    const domainConfigs = config.jiraDomains || [];

    if (domainConfigs.length === 0) {
      return { ok: false, totalFetched: 0, domains: [], error: 'No Jira domains configured. Go to Account Config to add your Jira credentials.' };
    }

    const domainResults: { url: string; count: number; error?: string }[] = [];
    let totalFetched = 0;

    for (const domain of domainConfigs) {
      console.log(`[Jira Sync] Fetching from ${domain.url}...`);
      const { tasks, error } = await fetchFromDomain(domain);

      if (error) {
        console.error(`[Jira Sync] Error from ${domain.url}: ${error}`);
        domainResults.push({ url: domain.url, count: tasks.length, error });
      } else {
        domainResults.push({ url: domain.url, count: tasks.length });
      }

      // Upsert each task into Supabase
      for (const task of tasks) {
        try {
          await db.insert(jiraTasks).values({
            key: task.key,
            parentKey: task.parentKey,
            issueType: task.issueType,
            title: task.title,
            status: task.status,
            assignee: task.assignee,
            reporter: task.reporter,
            priority: task.priority,
            startDate: task.startDate,
            officialDeadline: task.officialDeadline,
            inActiveSprint: task.inActiveSprint,
            domain: task.domain,
          }).onConflictDoUpdate({
            target: jiraTasks.key,
            set: {
              parentKey: task.parentKey,
              issueType: task.issueType,
              title: task.title,
              status: task.status,
              assignee: task.assignee,
              reporter: task.reporter,
              priority: task.priority,
              startDate: task.startDate,
              officialDeadline: task.officialDeadline,
              inActiveSprint: task.inActiveSprint,
              domain: task.domain,
            },
          });
        } catch (upsertErr: any) {
          console.error(`[Jira Sync] Failed to upsert ${task.key}:`, upsertErr.message);
        }
      }

      totalFetched += tasks.length;
      console.log(`[Jira Sync] ${domain.url} → ${tasks.length} tasks synced.`);
    }

    const failedDomains = domainResults.filter((d) => d.error);
    if (totalFetched === 0 && failedDomains.length > 0) {
      const errorMsg = failedDomains
        .map((d) => `• ${d.url}: ${d.error}`)
        .join('\n');
      return {
        ok: false,
        totalFetched: 0,
        domains: domainResults,
        error: `Could not fetch live tasks from Jira:\n${errorMsg}\n\nPlease check your Atlassian Email and API Token.`,
      };
    }

    return { ok: true, totalFetched, domains: domainResults };

  } catch (error: any) {
    console.error('[Jira Sync] Fatal error:', error);
    return { ok: false, totalFetched: 0, domains: [], error: error.message || 'Unknown error' };
  }
}
