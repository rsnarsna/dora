import { MongoClient, ServerApiVersion, type Db } from 'mongodb';
import { env } from '@/lib/env';
import { ensureIndexes, getTypedCollections, type DoraCollections } from './collections';

export const MONGODB_DB_NAME = env.mongodbDbName;

const globalForMongo = globalThis as unknown as {
  mongoClientPromise?: Promise<MongoClient>;
  mongoIndexesReady?: boolean;
};

export function isDatabaseConfigured(): boolean {
  return Boolean(env.mongodbUri);
}

async function getClient(): Promise<MongoClient | null> {
  const uri = env.mongodbUri;
  if (!uri) {
    return null;
  }

  if (!globalForMongo.mongoClientPromise) {
    const client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    });

    globalForMongo.mongoClientPromise = client.connect().catch((err) => {
      // Clear cached rejected promise so subsequent requests can retry
      globalForMongo.mongoClientPromise = undefined;
      throw err;
    });
  }

  return globalForMongo.mongoClientPromise;
}

export async function getDb(): Promise<Db | null> {
  try {
    const client = await getClient();
    if (!client) return null;

    const db = client.db(MONGODB_DB_NAME);

    if (!globalForMongo.mongoIndexesReady) {
      await ensureIndexes(db);
      globalForMongo.mongoIndexesReady = true;
    }

    return db;
  } catch (error) {
    console.error('[MongoDB] Connection failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function getCollections(): Promise<DoraCollections | null> {
  const db = await getDb();
  if (!db) return null;
  return getTypedCollections(db);
}

export { COLLECTIONS } from './collections';
export type { DoraCollections } from './collections';
