import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[DB] DATABASE_URL environment variable is missing.');
}

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

// Prevent crashing if DATABASE_URL is missing during build time & cache connection to avoid leaks
const client = globalForDb.conn ?? (connectionString ? postgres(connectionString, { prepare: false, ssl: 'require' }) : null);
if (process.env.NODE_ENV !== 'production' && client) {
  globalForDb.conn = client;
}

export const db = client ? drizzle(client, { schema }) : null;
