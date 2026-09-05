'use server';

import { db } from '@/lib/db';
import { knowledgeNodes, knowledgeRelations, knowledgeClusters } from '@/lib/db/schema';
import { KnowledgeNode, KnowledgeRelation, KnowledgeCluster, KnowledgeGraphData } from '@/types/knowledge';
import { eq, and } from 'drizzle-orm';

/**
 * Fetch all nodes, relations, and clusters for a specific account.
 * Auto-seeds the initial multi-context Splunk/Knowledge architecture if empty.
 */
export async function getKnowledgeGraphAction(accountId: string): Promise<KnowledgeGraphData> {
  if (!db) {
    return { nodes: [], relations: [], clusters: [] };
  }

  try {
    const nodes = await db.select().from(knowledgeNodes).where(eq(knowledgeNodes.accountId, accountId));
    const relations = await db.select().from(knowledgeRelations).where(eq(knowledgeRelations.accountId, accountId));
    const clusters = await db.select().from(knowledgeClusters).where(eq(knowledgeClusters.accountId, accountId));

    // Auto-seed sample architecture demonstrating: Create Once -> Connect Once -> Reuse Everywhere
    if (nodes.length === 0 && clusters.length === 0) {
      return await seedSampleKnowledgeGraphAction(accountId);
    }

    return {
      nodes: nodes as KnowledgeNode[],
      relations: relations as KnowledgeRelation[],
      clusters: clusters as KnowledgeCluster[],
    };
  } catch (error) {
    console.error('Failed to fetch knowledge graph:', error);
    return { nodes: [], relations: [], clusters: [] };
  }
}

/**
 * Save or update an independent Knowledge Node.
 */
export async function saveKnowledgeNodeAction(node: Partial<KnowledgeNode> & { id: string; accountId: string; title: string }) {
  if (!db) return { ok: false, error: 'Database connection not available' };

  try {
    const existing = await db.select().from(knowledgeNodes).where(eq(knowledgeNodes.id, node.id));

    if (existing.length === 0) {
      await db.insert(knowledgeNodes).values({
        id: node.id,
        accountId: node.accountId,
        type: node.type || 'concept',
        title: node.title,
        summary: node.summary || '',
        content: node.content || '',
        visualShape: node.visualShape || 'hex',
        visualColor: node.visualColor || '#326ce5',
        tags: (node.tags as any) || [],
        jiraTaskKeys: (node.jiraTaskKeys as any) || [],
        metadata: node.metadata || {},
        updatedAt: new Date(),
      });
    } else {
      await db.update(knowledgeNodes).set({
        type: node.type || existing[0].type,
        title: node.title,
        summary: node.summary !== undefined ? node.summary : existing[0].summary,
        content: node.content !== undefined ? node.content : existing[0].content,
        visualShape: node.visualShape || existing[0].visualShape,
        visualColor: node.visualColor || existing[0].visualColor,
        tags: (node.tags as any) || existing[0].tags,
        jiraTaskKeys: (node.jiraTaskKeys as any) || existing[0].jiraTaskKeys,
        metadata: node.metadata || existing[0].metadata,
        updatedAt: new Date(),
      }).where(eq(knowledgeNodes.id, node.id));
    }

    return { ok: true };
  } catch (error: any) {
    console.error('Failed to save knowledge node:', error);
    return { ok: false, error: error?.message || 'Failed to save knowledge node' };
  }
}

/**
 * Delete a Knowledge Node and clean up associated relations and cluster references.
 */
export async function deleteKnowledgeNodeAction(nodeId: string, accountId: string) {
  if (!db) return { ok: false, error: 'Database connection not available' };

  try {
    // Delete relations involving this node
    await db.delete(knowledgeRelations).where(
      and(
        eq(knowledgeRelations.accountId, accountId),
        eq(knowledgeRelations.sourceNodeId, nodeId)
      )
    );
    await db.delete(knowledgeRelations).where(
      and(
        eq(knowledgeRelations.accountId, accountId),
        eq(knowledgeRelations.targetNodeId, nodeId)
      )
    );

    // Remove node ID from cluster reference lists
    const clusters = await db.select().from(knowledgeClusters).where(eq(knowledgeClusters.accountId, accountId));
    for (const cluster of clusters) {
      const nodeIds = (cluster.nodeIds as string[]) || [];
      if (nodeIds.includes(nodeId)) {
        const updated = nodeIds.filter((id) => id !== nodeId);
        await db.update(knowledgeClusters).set({
          nodeIds: updated as any,
          updatedAt: new Date(),
        }).where(eq(knowledgeClusters.id, cluster.id));
      }
    }

    // Delete node itself
    await db.delete(knowledgeNodes).where(
      and(
        eq(knowledgeNodes.id, nodeId),
        eq(knowledgeNodes.accountId, accountId)
      )
    );

    return { ok: true };
  } catch (error: any) {
    console.error('Failed to delete knowledge node:', error);
    return { ok: false, error: error?.message || 'Failed to delete knowledge node' };
  }
}

/**
 * Save or update a semantic relationship edge.
 */
export async function saveKnowledgeRelationAction(relation: KnowledgeRelation) {
  if (!db) return { ok: false, error: 'Database connection not available' };

  try {
    const existing = await db.select().from(knowledgeRelations).where(eq(knowledgeRelations.id, relation.id));

    if (existing.length === 0) {
      await db.insert(knowledgeRelations).values({
        id: relation.id,
        accountId: relation.accountId,
        sourceNodeId: relation.sourceNodeId,
        targetNodeId: relation.targetNodeId,
        relationType: relation.relationType || 'relates_to',
        label: relation.label || '',
        animated: relation.animated !== undefined ? relation.animated : true,
        properties: relation.properties || {},
      });
    } else {
      await db.update(knowledgeRelations).set({
        sourceNodeId: relation.sourceNodeId,
        targetNodeId: relation.targetNodeId,
        relationType: relation.relationType,
        label: relation.label,
        animated: relation.animated,
        properties: relation.properties,
      }).where(eq(knowledgeRelations.id, relation.id));
    }

    return { ok: true };
  } catch (error: any) {
    console.error('Failed to save knowledge relation:', error);
    return { ok: false, error: error?.message || 'Failed to save relation' };
  }
}

/**
 * Delete a relationship edge.
 */
export async function deleteKnowledgeRelationAction(relationId: string) {
  if (!db) return { ok: false, error: 'Database connection not available' };

  try {
    await db.delete(knowledgeRelations).where(eq(knowledgeRelations.id, relationId));
    return { ok: true };
  } catch (error: any) {
    console.error('Failed to delete knowledge relation:', error);
    return { ok: false, error: error?.message || 'Failed to delete relation' };
  }
}

/**
 * Save or update a Knowledge Cluster / View context.
 */
export async function saveKnowledgeClusterAction(cluster: KnowledgeCluster) {
  if (!db) return { ok: false, error: 'Database connection not available' };

  try {
    const existing = await db.select().from(knowledgeClusters).where(eq(knowledgeClusters.id, cluster.id));

    if (existing.length === 0) {
      await db.insert(knowledgeClusters).values({
        id: cluster.id,
        accountId: cluster.accountId,
        name: cluster.name,
        description: cluster.description || '',
        color: cluster.color || '#0052cc',
        nodeIds: (cluster.nodeIds as any) || [],
        positions2D: (cluster.positions2D as any) || {},
        positions3D: (cluster.positions3D as any) || {},
        updatedAt: new Date(),
      });
    } else {
      await db.update(knowledgeClusters).set({
        name: cluster.name,
        description: cluster.description,
        color: cluster.color,
        nodeIds: (cluster.nodeIds as any) || existing[0].nodeIds,
        positions2D: (cluster.positions2D as any) || existing[0].positions2D,
        positions3D: (cluster.positions3D as any) || existing[0].positions3D,
        updatedAt: new Date(),
      }).where(eq(knowledgeClusters.id, cluster.id));
    }

    return { ok: true };
  } catch (error: any) {
    console.error('Failed to save knowledge cluster:', error);
    return { ok: false, error: error?.message || 'Failed to save cluster' };
  }
}

/**
 * Delete a Knowledge Cluster (nodes remain intact!).
 */
export async function deleteKnowledgeClusterAction(clusterId: string) {
  if (!db) return { ok: false, error: 'Database connection not available' };

  try {
    await db.delete(knowledgeClusters).where(eq(knowledgeClusters.id, clusterId));
    return { ok: true };
  } catch (error: any) {
    console.error('Failed to delete knowledge cluster:', error);
    return { ok: false, error: error?.message || 'Failed to delete cluster' };
  }
}

/**
 * Seed initial multi-context demonstration showing:
 * [Indexer], [Search Head], [Dashboard], [Monitoring]
 * The same [Indexer] belongs simultaneously to Splunk Cluster, Monitoring, and Learning.
 */
export async function seedSampleKnowledgeGraphAction(accountId: string): Promise<KnowledgeGraphData> {
  const sampleNodes: KnowledgeNode[] = [
    {
      id: `node-indexer-${accountId}`,
      accountId,
      type: 'concept',
      title: 'Indexer',
      summary: 'Parses, transforms, and indexes high-throughput machine data into searchable time-series buckets.',
      content: `### Splunk Indexer\n\n**Core Role**: Ingestion & Storage Pipeline.\n\n- Decouples raw event ingestion from search tier\n- Distributes warm/cold buckets across NVMe storage\n- Clustered via Indexer Discovery and Cluster Master\n\n#### Personal Mental Note\n*Always evaluate index-time field extractions vs search-time extractions to preserve disk I/O performance.*`,
      visualShape: 'box',
      visualColor: '#0052cc',
      tags: ['Splunk', 'Ingestion', 'Storage', 'High-Throughput'],
      jiraTaskKeys: ['SCRUM-181', 'SCRUM-182'],
      metadata: { importance: 'Critical', tier: 'Data Tier' },
    },
    {
      id: `node-search-${accountId}`,
      accountId,
      type: 'skill',
      title: 'Search Head',
      summary: 'Distributes search jobs to indexers, collates time-series streams, and applies knowledge objects.',
      content: `### Search Head Cluster (SHC)\n\n**Core Role**: Query Coordination & User Analytics.\n\n- Dispatches map-reduce searches across indexer pool\n- Knowledge objects: Lookups, Tags, Eventtypes, Field Extractions\n- Raft-based consensus across search head captain nodes`,
      visualShape: 'hex',
      visualColor: '#6554c0',
      tags: ['Search', 'Analytics', 'MapReduce'],
      jiraTaskKeys: ['SCRUM-168'],
      metadata: { importance: 'High', tier: 'Compute Tier' },
    },
    {
      id: `node-dashboard-${accountId}`,
      accountId,
      type: 'project',
      title: 'Executive Dashboard',
      summary: 'Real-time telemetry, KPI monitoring panels, and automated drill-down alerts.',
      content: `### Operational Dashboard & Visualization\n\n**Core Role**: Situational Clarity.\n\n- Formats structured insights for rapid human triage\n- Configurable alert thresholds and webhook relays\n- Direct correlation to active Jira sprint deliverables`,
      visualShape: 'star',
      visualColor: '#00875a',
      tags: ['UI', 'Telemetry', 'KPIs', 'Executive'],
      jiraTaskKeys: ['SCRUM-135'],
      metadata: { importance: 'High', tier: 'Presentation Tier' },
    },
    {
      id: `node-monitoring-${accountId}`,
      accountId,
      type: 'tool',
      title: 'Monitoring & SRE',
      summary: 'Observability platform tracking indexing throughput, latency, and cluster node health.',
      content: `### Monitoring & SRE Observability\n\n**Core Role**: System Health & Feedback Loop.\n\n- Real-time indexing pipeline queues\n- Search latency and concurrent quota tracking\n- Heartbeat probes across worker nodes`,
      visualShape: 'shield',
      visualColor: '#ff5630',
      tags: ['SRE', 'Observability', 'Health', 'DevOps'],
      jiraTaskKeys: ['SCRUM-179'],
      metadata: { importance: 'Critical', tier: 'Operations Tier' },
    },
  ];

  const sampleRelations: KnowledgeRelation[] = [
    {
      id: `rel-search-indexer-${accountId}`,
      accountId,
      sourceNodeId: sampleNodes[1].id, // Search Head
      targetNodeId: sampleNodes[0].id, // Indexer
      relationType: 'depends_on',
      label: 'Dispatches Queries',
      animated: true,
      properties: { bandwidth: 'High' },
    },
    {
      id: `rel-dashboard-search-${accountId}`,
      accountId,
      sourceNodeId: sampleNodes[2].id, // Dashboard
      targetNodeId: sampleNodes[1].id, // Search Head
      relationType: 'feeds',
      label: 'Executes Analytics',
      animated: true,
      properties: {},
    },
    {
      id: `rel-monitoring-indexer-${accountId}`,
      accountId,
      sourceNodeId: sampleNodes[3].id, // Monitoring
      targetNodeId: sampleNodes[0].id, // Indexer
      relationType: 'monitors',
      label: 'Tracks Pipeline Latency',
      animated: true,
      properties: {},
    },
    {
      id: `rel-monitoring-search-${accountId}`,
      accountId,
      sourceNodeId: sampleNodes[3].id, // Monitoring
      targetNodeId: sampleNodes[1].id, // Search Head
      relationType: 'monitors',
      label: 'Tracks Search Concurrency',
      animated: true,
      properties: {},
    },
  ];

  const sampleClusters: KnowledgeCluster[] = [
    {
      id: `cluster-splunk-${accountId}`,
      accountId,
      name: 'Splunk Core Architecture',
      description: 'End-to-end data pipeline from raw ingestion to analytical presentation.',
      color: '#0052cc',
      nodeIds: [sampleNodes[0].id, sampleNodes[1].id, sampleNodes[2].id], // Indexer, Search, Dashboard
      positions2D: {
        [sampleNodes[0].id]: { x: -200, y: 0 },
        [sampleNodes[1].id]: { x: 0, y: 0 },
        [sampleNodes[2].id]: { x: 200, y: 0 },
      },
      positions3D: {
        [sampleNodes[0].id]: { x: -8, y: 0, z: 0 },
        [sampleNodes[1].id]: { x: 0, y: 0, z: 0 },
        [sampleNodes[2].id]: { x: 8, y: 0, z: 0 },
      },
    },
    {
      id: `cluster-monitoring-${accountId}`,
      accountId,
      name: 'Observability & SRE',
      description: 'Telemetry loops, health probes, and real-time operational monitoring.',
      color: '#ff5630',
      nodeIds: [sampleNodes[0].id, sampleNodes[1].id, sampleNodes[3].id], // Indexer, Search, Monitoring
      positions2D: {
        [sampleNodes[0].id]: { x: -160, y: 120 },
        [sampleNodes[1].id]: { x: 160, y: 120 },
        [sampleNodes[3].id]: { x: 0, y: -100 },
      },
      positions3D: {
        [sampleNodes[0].id]: { x: -6, y: 0, z: 5 },
        [sampleNodes[1].id]: { x: 6, y: 0, z: 5 },
        [sampleNodes[3].id]: { x: 0, y: 0, z: -6 },
      },
    },
    {
      id: `cluster-learning-${accountId}`,
      accountId,
      name: 'Strategic Architecture & Research',
      description: 'Foundational concepts and technical trade-offs for personal mastery.',
      color: '#6554c0',
      nodeIds: [sampleNodes[0].id, sampleNodes[2].id, sampleNodes[3].id], // Indexer, Dashboard, Monitoring
      positions2D: {
        [sampleNodes[0].id]: { x: -180, y: -80 },
        [sampleNodes[2].id]: { x: 180, y: -80 },
        [sampleNodes[3].id]: { x: 0, y: 140 },
      },
      positions3D: {
        [sampleNodes[0].id]: { x: -7, y: 0, z: -4 },
        [sampleNodes[2].id]: { x: 7, y: 0, z: -4 },
        [sampleNodes[3].id]: { x: 0, y: 0, z: 6 },
      },
    },
  ];

  if (db) {
    for (const n of sampleNodes) {
      await saveKnowledgeNodeAction(n);
    }
    for (const r of sampleRelations) {
      await saveKnowledgeRelationAction(r);
    }
    for (const c of sampleClusters) {
      await saveKnowledgeClusterAction(c);
    }
  }

  return {
    nodes: sampleNodes,
    relations: sampleRelations,
    clusters: sampleClusters,
  };
}

/**
 * Reset knowledge playground data for an account and re-seed the full multi-cluster architecture.
 */
export async function resetKnowledgeGraphAction(accountId: string): Promise<KnowledgeGraphData> {
  if (!db) return { nodes: [], relations: [], clusters: [] };

  try {
    await db.delete(knowledgeRelations).where(eq(knowledgeRelations.accountId, accountId));
    await db.delete(knowledgeClusters).where(eq(knowledgeClusters.accountId, accountId));
    await db.delete(knowledgeNodes).where(eq(knowledgeNodes.accountId, accountId));
    return await seedSampleKnowledgeGraphAction(accountId);
  } catch (error) {
    console.error('Failed to reset knowledge graph:', error);
    return { nodes: [], relations: [], clusters: [] };
  }
}
