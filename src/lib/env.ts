/**
 * Centralized server-only environment configuration.
 * Secrets (such as MONGODB_URI and JIRA_TOKEN) are read dynamically from
 * server-side process.env and must be configured in Settings -> Secrets.
 */
export const env = {
  get mongodbUri(): string {
    return process.env.MONGODB_URI?.trim() || '';
  },
  get mongodbDbName(): string {
    return process.env.MONGODB_DB_NAME?.trim() || 'DoraMangement';
  },
  get jiraEmail(): string {
    return process.env.JIRA_EMAIL?.trim() || '';
  },
  get jiraToken(): string {
    return process.env.JIRA_TOKEN?.trim() || '';
  },
};
