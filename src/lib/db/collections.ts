import type { Collection, Db } from 'mongodb';
import type { AppConfig } from '@/lib/app-config';
import type { NoteEntry, UpdateEntry } from '@/types';
import type {
  KnowledgeNodeType,
  KnowledgeRelationType,
  KnowledgeVisualShape,
} from '@/types/knowledge';

export const COLLECTIONS = {
  APP_CONFIG: 'app_config',
  JIRA_TASKS: 'jira_tasks',
  PERSONAL_RECORDS: 'personal_records',
  KNOWLEDGE_NODES: 'knowledge_nodes',
  KNOWLEDGE_RELATIONS: 'knowledge_relations',
  KNOWLEDGE_CLUSTERS: 'knowledge_clusters',
} as const;

export interface AppConfigDocument {
  id: string;
  config: AppConfig;
  updatedAt: Date;
}

export interface JiraTaskDocument {
  key: string;
  parentKey: string | null;
  issueType: string;
  title: string;
  status: string;
  assignee: string;
  reporter: string;
  priority: string;
  startDate: string;
  officialDeadline: string;
  inActiveSprint: boolean;
  domain: string;
  updatedAt: Date;
}

export interface PersonalRecordDocument {
  taskId: string;
  nickname: string;
  selfTarget: string;
  selfPriority: string;
  notesLog: NoteEntry[];
  dailyUpdates: UpdateEntry[];
  updatedAt: Date;
}

export interface KnowledgeNodeDocument {
  id: string;
  accountId: string;
  type: KnowledgeNodeType;
  title: string;
  summary: string;
  content: string;
  visualShape: KnowledgeVisualShape;
  visualColor: string;
  tags: string[];
  jiraTaskKeys: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeRelationDocument {
  id: string;
  accountId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: KnowledgeRelationType;
  label: string;
  animated: boolean;
  properties: Record<string, unknown>;
  createdAt: Date;
}

export interface KnowledgeClusterDocument {
  id: string;
  accountId: string;
  name: string;
  description: string;
  color: string;
  nodeIds: string[];
  positions2D: Record<string, { x: number; y: number }>;
  positions3D: Record<string, { x: number; y: number; z: number }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DoraCollections {
  appConfig: Collection<AppConfigDocument>;
  jiraTasks: Collection<JiraTaskDocument>;
  personalRecords: Collection<PersonalRecordDocument>;
  knowledgeNodes: Collection<KnowledgeNodeDocument>;
  knowledgeRelations: Collection<KnowledgeRelationDocument>;
  knowledgeClusters: Collection<KnowledgeClusterDocument>;
}

export function getTypedCollections(db: Db): DoraCollections {
  return {
    appConfig: db.collection<AppConfigDocument>(COLLECTIONS.APP_CONFIG),
    jiraTasks: db.collection<JiraTaskDocument>(COLLECTIONS.JIRA_TASKS),
    personalRecords: db.collection<PersonalRecordDocument>(COLLECTIONS.PERSONAL_RECORDS),
    knowledgeNodes: db.collection<KnowledgeNodeDocument>(COLLECTIONS.KNOWLEDGE_NODES),
    knowledgeRelations: db.collection<KnowledgeRelationDocument>(COLLECTIONS.KNOWLEDGE_RELATIONS),
    knowledgeClusters: db.collection<KnowledgeClusterDocument>(COLLECTIONS.KNOWLEDGE_CLUSTERS),
  };
}

export async function ensureIndexes(db: Db): Promise<void> {
  const cols = getTypedCollections(db);
  await Promise.all([
    cols.appConfig.createIndex({ id: 1 }, { unique: true }),
    cols.jiraTasks.createIndex({ key: 1 }, { unique: true }),
    cols.jiraTasks.createIndex({ domain: 1 }),
    cols.personalRecords.createIndex({ taskId: 1 }, { unique: true }),
    cols.knowledgeNodes.createIndex({ id: 1 }, { unique: true }),
    cols.knowledgeNodes.createIndex({ accountId: 1 }),
    cols.knowledgeRelations.createIndex({ id: 1 }, { unique: true }),
    cols.knowledgeRelations.createIndex({ accountId: 1 }),
    cols.knowledgeRelations.createIndex({ accountId: 1, sourceNodeId: 1 }),
    cols.knowledgeRelations.createIndex({ accountId: 1, targetNodeId: 1 }),
    cols.knowledgeClusters.createIndex({ id: 1 }, { unique: true }),
    cols.knowledgeClusters.createIndex({ accountId: 1 }),
  ]);
}
