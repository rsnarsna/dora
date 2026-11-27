'use server';

import { getCollections, isDatabaseConfigured, MONGODB_DB_NAME } from '@/lib/db';
import { env } from '@/lib/env';
import type { JiraTaskDocument } from '@/lib/db/collections';
import { JiraDomainConfig } from '@/lib/app-config';
import { getAppConfigAction } from './config-actions';

interface JiraSyncResult {
  ok: boolean;
  totalFetched: number;
  domains: { url: string; count: number; error?: string }[];
  error?: string;
}

function validateJiraDomainUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:') {
      return null;
    }
    const host = parsed.hostname.toLowerCase();
    // Block loopback, link-local, and private network hostnames to prevent SSRF
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.startsWith('169.254.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Fetch issues from a single Jira domain using Jira Cloud REST API v3
 */
async function fetchFromDomain(
  domain: JiraDomainConfig
): Promise<{ tasks: JiraTaskDocument[]; error?: string }> {
  const jql = 'issuetype is not null ORDER BY created DESC';
  const tasks: JiraTaskDocument[] = [];
  const maxResults = 50;
  let nextPageToken: string | null = null;

  const parsedUrl = validateJiraDomainUrl(domain.url || '');
  if (!parsedUrl) {
    return {
      tasks: [],
      error: `Invalid Jira URL "${domain.url}". Must be a valid public https:// Jira Cloud domain.`,
    };
  }

  const email = domain.email?.trim() || env.jiraEmail;
  const token = domain.token?.trim() || env.jiraToken;

  if (!email || !token) {
    return { tasks: [], error: `Missing email or API token for ${domain.url}` };
  }

  const domainPrefix = parsedUrl.hostname.split('.')[0];
  const baseOrigin = parsedUrl.origin;
  const auth = Buffer.from(`${email}:${token}`).toString('base64');

  while (true) {
    let url = `${baseOrigin}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=*all&maxResults=${maxResults}`;
    if (nextPageToken) {
      url += `&nextPageToken=${encodeURIComponent(nextPageToken)}`;
    }

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
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

        let parentKey: string | null = null;
        if (fields.parent?.key) {
          parentKey = String(fields.parent.key);
        } else if (fields.customfield_10014) {
          parentKey = String(fields.customfield_10014);
        }

        let inActiveSprint = false;
        const sprintField = fields.customfield_10020 || fields.sprint;
        if (Array.isArray(sprintField)) {
          inActiveSprint = sprintField.some((s: { state?: string }) => s?.state === 'active');
        } else if (sprintField?.state === 'active') {
          inActiveSprint = true;
        }

        tasks.push({
          key: String(issue.key),
          parentKey,
          issueType: String(fields.issuetype?.name || 'Task'),
          title: String(fields.summary || ''),
          status: String(statusName),
          assignee: String(fields.assignee?.displayName || 'Unassigned'),
          reporter: String(fields.reporter?.displayName || 'Unknown'),
          priority: String(fields.priority?.name || 'None'),
          startDate: String(createdDate),
          officialDeadline: String(dueDate),
          inActiveSprint,
          domain: domainPrefix,
          updatedAt: new Date(),
        });
      }

      if (data.isLast || !data.nextPageToken) break;
      nextPageToken = data.nextPageToken;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Network error';
      return { tasks, error: message };
    }
  }

  return { tasks };
}

/**
 * Sync all configured Jira domains → bulk upsert into MongoDB (`DoraMangement.jira_tasks`).
 */
export async function syncJiraDataAction(): Promise<JiraSyncResult> {
  const cols = await getCollections();
  if (!cols) {
    return {
      ok: false,
      totalFetched: 0,
      domains: [],
      error: isDatabaseConfigured()
        ? `Could not connect to MongoDB database "${MONGODB_DB_NAME}". Check your MONGODB_URI and MongoDB Atlas IP access list.`
        : 'MONGODB_URI environment variable is not configured. Add MONGODB_URI to your server secrets and restart.',
    };
  }

  try {
    const config = await getAppConfigAction();
    const domainConfigs = config.jiraDomains || [];

    if (domainConfigs.length === 0) {
      return {
        ok: false,
        totalFetched: 0,
        domains: [],
        error: 'No Jira domains configured. Open Account Config to add your Jira credentials.',
      };
    }

    const domainResults: { url: string; count: number; error?: string }[] = [];
    let totalFetched = 0;

    for (const domain of domainConfigs) {
      const { tasks, error } = await fetchFromDomain(domain);

      if (error) {
        console.error(`[Jira Sync] Error from ${domain.url}: ${error}`);
        domainResults.push({ url: domain.url, count: tasks.length, error });
      } else {
        domainResults.push({ url: domain.url, count: tasks.length });
      }

      if (tasks.length > 0) {
        const ops = tasks.map((task) => ({
          updateOne: {
            filter: { key: task.key },
            update: { $set: task },
            upsert: true,
          },
        }));

        await cols.jiraTasks.bulkWrite(ops, { ordered: false });
      }

      totalFetched += tasks.length;
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
  } catch (error: unknown) {
    console.error('[Jira Sync] Fatal error:', error);
    return {
      ok: false,
      totalFetched: 0,
      domains: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
