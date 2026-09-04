export type KnowledgeNodeType = 
  | 'concept' 
  | 'skill' 
  | 'project' 
  | 'topic' 
  | 'tool' 
  | 'constraint';

export type KnowledgeVisualShape = 
  | 'hex'        // Skills, concepts, pods
  | 'box'        // Systems, projects, deployments
  | 'cylinder'   // Data stores, volumes, statefulsets
  | 'star'       // Interfaces, APIs, goals, services
  | 'shield'     // Policies, security, constraints
  | 'platform';  // Foundations, nodes, infrastructure

export type KnowledgeRelationType = 
  | 'depends_on' 
  | 'implements' 
  | 'part_of' 
  | 'monitors' 
  | 'relates_to' 
  | 'feeds';

export interface KnowledgeNode {
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
  metadata: Record<string, any>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface KnowledgeRelation {
  id: string;
  accountId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: KnowledgeRelationType;
  label: string;
  animated: boolean;
  properties: Record<string, any>;
  createdAt?: string | Date;
}

export interface KnowledgeCluster {
  id: string;
  accountId: string;
  name: string;
  description: string;
  color: string;
  nodeIds: string[];
  positions2D: Record<string, { x: number; y: number }>;
  positions3D: Record<string, { x: number; y: number; z: number }>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface KnowledgeGraphData {
  nodes: KnowledgeNode[];
  relations: KnowledgeRelation[];
  clusters: KnowledgeCluster[];
}
