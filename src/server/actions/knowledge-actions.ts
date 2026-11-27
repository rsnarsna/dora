'use server';

import { z } from 'zod';
import { getCollections, isDatabaseConfigured, MONGODB_DB_NAME } from '@/lib/db';
import {
  KnowledgeNode,
  KnowledgeRelation,
  KnowledgeCluster,
  KnowledgeGraphData,
} from '@/types/knowledge';

const idSchema = z.string().trim().min(1).max(200);

const nodeTypeSchema = z.enum([
  'concept',
  'skill',
  'project',
  'topic',
  'tool',
  'constraint',
]);

const visualShapeSchema = z.enum([
  'hex',
  'box',
  'cylinder',
  'star',
  'shield',
  'platform',
]);

const relationTypeSchema = z.enum([
  'depends_on',
  'implements',
  'part_of',
  'monitors',
  'relates_to',
  'feeds',
]);

const saveNodeSchema = z.object({
  id: idSchema,
  accountId: idSchema,
  type: nodeTypeSchema.optional(),
  title: z.string().trim().min(1).max(300),
  summary: z.string().max(2000).optional(),
  content: z.string().max(50000).optional(),
  visualShape: visualShapeSchema.optional(),
  visualColor: z.string().max(40).optional(),
  tags: z.array(z.string().max(100)).optional(),
  jiraTaskKeys: z.array(z.string().max(100)).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const saveRelationSchema = z.object({
  id: idSchema,
  accountId: idSchema,
  sourceNodeId: idSchema,
  targetNodeId: idSchema,
  relationType: relationTypeSchema,
  label: z.string().max(200).optional(),
  animated: z.boolean().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

const pos2DSchema = z.object({ x: z.number(), y: z.number() });
const pos3DSchema = z.object({ x: z.number(), y: z.number(), z: z.number() });

const saveClusterSchema = z.object({
  id: idSchema,
  accountId: idSchema,
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  color: z.string().max(40).optional(),
  nodeIds: z.array(idSchema).optional(),
  positions2D: z.record(z.string(), pos2DSchema).optional(),
  positions3D: z.record(z.string(), pos3DSchema).optional(),
});

function dbUnavailableError(): string {
  return isDatabaseConfigured()
    ? `Unable to connect to MongoDB database "${MONGODB_DB_NAME}".`
    : 'MONGODB_URI is not configured in server environment secrets.';
}

/**
 * Fetch all nodes, relations, and clusters for a specific account from MongoDB.
 * Starts completely empty until the user creates concepts, relations, or clusters.
 */
export async function getKnowledgeGraphAction(accountId: string): Promise<KnowledgeGraphData> {
  const parsedAccount = idSchema.safeParse(accountId);
  if (!parsedAccount.success) {
    return { nodes: [], relations: [], clusters: [] };
  }

  const cols = await getCollections();
  if (!cols) {
    return { nodes: [], relations: [], clusters: [] };
  }

  try {
    const cleanAccountId = parsedAccount.data;
    const [nodes, relations, clusters] = await Promise.all([
      cols.knowledgeNodes.find({ accountId: cleanAccountId }, { projection: { _id: 0 } }).toArray(),
      cols.knowledgeRelations.find({ accountId: cleanAccountId }, { projection: { _id: 0 } }).toArray(),
      cols.knowledgeClusters.find({ accountId: cleanAccountId }, { projection: { _id: 0 } }).toArray(),
    ]);

    return {
      nodes: nodes.map((n) => ({
        ...n,
        createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : undefined,
        updatedAt: n.updatedAt ? new Date(n.updatedAt).toISOString() : undefined,
      })) as KnowledgeNode[],
      relations: relations.map((r) => ({
        ...r,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
      })) as KnowledgeRelation[],
      clusters: clusters.map((c) => ({
        ...c,
        createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : undefined,
        updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : undefined,
      })) as KnowledgeCluster[],
    };
  } catch (error) {
    console.error('[MongoDB] Failed to fetch knowledge graph:', error);
    return { nodes: [], relations: [], clusters: [] };
  }
}

/**
 * Save or update an independent Knowledge Node in MongoDB.
 */
export async function saveKnowledgeNodeAction(
  node: Partial<KnowledgeNode> & { id: string; accountId: string; title: string }
) {
  const parsed = saveNodeSchema.safeParse(node);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid knowledge node' };
  }

  const cols = await getCollections();
  if (!cols) return { ok: false, error: dbUnavailableError() };

  try {
    const data = parsed.data;
    const existing = await cols.knowledgeNodes.findOne(
      { id: data.id },
      { projection: { _id: 0 } }
    );

    const now = new Date();
    await cols.knowledgeNodes.updateOne(
      { id: data.id },
      {
        $set: {
          id: data.id,
          accountId: data.accountId,
          type: data.type ?? existing?.type ?? 'concept',
          title: data.title,
          summary: data.summary !== undefined ? data.summary : existing?.summary ?? '',
          content: data.content !== undefined ? data.content : existing?.content ?? '',
          visualShape: data.visualShape ?? existing?.visualShape ?? 'hex',
          visualColor: data.visualColor ?? existing?.visualColor ?? '#326ce5',
          tags: data.tags ?? existing?.tags ?? [],
          jiraTaskKeys: data.jiraTaskKeys ?? existing?.jiraTaskKeys ?? [],
          metadata: data.metadata ?? existing?.metadata ?? {},
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    return { ok: true };
  } catch (error: unknown) {
    console.error('[MongoDB] Failed to save knowledge node:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to save knowledge node',
    };
  }
}

/**
 * Delete a Knowledge Node and clean up associated relations and cluster references.
 */
export async function deleteKnowledgeNodeAction(nodeId: string, accountId: string) {
  const parsedNode = idSchema.safeParse(nodeId);
  const parsedAccount = idSchema.safeParse(accountId);
  if (!parsedNode.success || !parsedAccount.success) {
    return { ok: false, error: 'Invalid nodeId or accountId' };
  }

  const cols = await getCollections();
  if (!cols) return { ok: false, error: dbUnavailableError() };

  try {
    const cleanNodeId = parsedNode.data;
    const cleanAccountId = parsedAccount.data;

    await Promise.all([
      cols.knowledgeRelations.deleteMany({
        accountId: cleanAccountId,
        $or: [{ sourceNodeId: cleanNodeId }, { targetNodeId: cleanNodeId }],
      }),
      cols.knowledgeClusters.updateMany(
        { accountId: cleanAccountId, nodeIds: cleanNodeId },
        {
          $pull: { nodeIds: cleanNodeId },
          $set: { updatedAt: new Date() },
        }
      ),
      cols.knowledgeNodes.deleteOne({
        id: cleanNodeId,
        accountId: cleanAccountId,
      }),
    ]);

    return { ok: true };
  } catch (error: unknown) {
    console.error('[MongoDB] Failed to delete knowledge node:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to delete knowledge node',
    };
  }
}

/**
 * Save or update a semantic relationship edge in MongoDB.
 */
export async function saveKnowledgeRelationAction(relation: KnowledgeRelation) {
  const parsed = saveRelationSchema.safeParse(relation);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid relation' };
  }

  const cols = await getCollections();
  if (!cols) return { ok: false, error: dbUnavailableError() };

  try {
    const data = parsed.data;
    await cols.knowledgeRelations.updateOne(
      { id: data.id },
      {
        $set: {
          id: data.id,
          accountId: data.accountId,
          sourceNodeId: data.sourceNodeId,
          targetNodeId: data.targetNodeId,
          relationType: data.relationType || 'relates_to',
          label: data.label ?? '',
          animated: data.animated !== undefined ? data.animated : true,
          properties: data.properties ?? {},
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return { ok: true };
  } catch (error: unknown) {
    console.error('[MongoDB] Failed to save knowledge relation:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to save relation',
    };
  }
}

/**
 * Delete a relationship edge from MongoDB.
 */
export async function deleteKnowledgeRelationAction(relationId: string) {
  const parsed = idSchema.safeParse(relationId);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid relationId' };
  }

  const cols = await getCollections();
  if (!cols) return { ok: false, error: dbUnavailableError() };

  try {
    await cols.knowledgeRelations.deleteOne({ id: parsed.data });
    return { ok: true };
  } catch (error: unknown) {
    console.error('[MongoDB] Failed to delete knowledge relation:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to delete relation',
    };
  }
}

/**
 * Save or update a Knowledge Cluster / View context in MongoDB.
 */
export async function saveKnowledgeClusterAction(cluster: KnowledgeCluster) {
  const parsed = saveClusterSchema.safeParse(cluster);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid cluster' };
  }

  const cols = await getCollections();
  if (!cols) return { ok: false, error: dbUnavailableError() };

  try {
    const data = parsed.data;
    const existing = await cols.knowledgeClusters.findOne(
      { id: data.id },
      { projection: { _id: 0 } }
    );

    const now = new Date();
    await cols.knowledgeClusters.updateOne(
      { id: data.id },
      {
        $set: {
          id: data.id,
          accountId: data.accountId,
          name: data.name,
          description: data.description !== undefined ? data.description : existing?.description ?? '',
          color: data.color ?? existing?.color ?? '#0052cc',
          nodeIds: data.nodeIds ?? existing?.nodeIds ?? [],
          positions2D: data.positions2D ?? existing?.positions2D ?? {},
          positions3D: data.positions3D ?? existing?.positions3D ?? {},
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    return { ok: true };
  } catch (error: unknown) {
    console.error('[MongoDB] Failed to save knowledge cluster:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to save cluster',
    };
  }
}

/**
 * Delete a Knowledge Cluster (nodes remain intact).
 */
export async function deleteKnowledgeClusterAction(clusterId: string) {
  const parsed = idSchema.safeParse(clusterId);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid clusterId' };
  }

  const cols = await getCollections();
  if (!cols) return { ok: false, error: dbUnavailableError() };

  try {
    await cols.knowledgeClusters.deleteOne({ id: parsed.data });
    return { ok: true };
  } catch (error: unknown) {
    console.error('[MongoDB] Failed to delete knowledge cluster:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to delete cluster',
    };
  }
}

/**
 * Clear all knowledge playground documents for an account, leaving collections cleanly empty.
 */
export async function resetKnowledgeGraphAction(accountId: string): Promise<KnowledgeGraphData> {
  const parsed = idSchema.safeParse(accountId);
  if (!parsed.success) {
    return { nodes: [], relations: [], clusters: [] };
  }

  const cols = await getCollections();
  if (!cols) return { nodes: [], relations: [], clusters: [] };

  try {
    const cleanAccountId = parsed.data;
    await Promise.all([
      cols.knowledgeRelations.deleteMany({ accountId: cleanAccountId }),
      cols.knowledgeClusters.deleteMany({ accountId: cleanAccountId }),
      cols.knowledgeNodes.deleteMany({ accountId: cleanAccountId }),
    ]);
    return { nodes: [], relations: [], clusters: [] };
  } catch (error) {
    console.error('[MongoDB] Failed to reset knowledge graph:', error);
    return { nodes: [], relations: [], clusters: [] };
  }
}
