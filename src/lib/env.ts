/**
 * Centralized server-only environment configuration.
 * Secrets (such as MONGODB_URI and JIRA_TOKEN) are read dynamically from
 * server-side process.env and must be configured in Settings -> Secrets.
 */
function resolveMongoUri(): string {
  const direct = process.env.MONGODB_URI?.trim() || process.env.MONGO_URI?.trim();
  if (direct) return direct;

  const fallbackDbUrl = process.env.DATABASE_URL?.trim() || '';
  if (fallbackDbUrl.startsWith('mongodb://') || fallbackDbUrl.startsWith('mongodb+srv://')) {
    return fallbackDbUrl;
  }

  return '';
}

export const env = {
  get mongodbUri(): string {
    return resolveMongoUri();
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
