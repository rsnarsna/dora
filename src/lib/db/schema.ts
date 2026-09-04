import { pgTable, text, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";

export const personalRecords = pgTable("personal_records", {
  taskId: text("task_id").primaryKey(),
  nickname: text("nickname").default(''),
  selfTarget: text("self_target").default(''),
  selfPriority: text("self_priority").default('None'),
  notesLog: jsonb("notes_log").default([]),
  dailyUpdates: jsonb("daily_updates").default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const jiraTasks = pgTable("jira_tasks", {
  key: text("key").primaryKey(),
  parentKey: text("parent_key"),
  issueType: text("issue_type").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  assignee: text("assignee"),
  reporter: text("reporter"),
  priority: text("priority").notNull(),
  startDate: text("start_date"),
  officialDeadline: text("official_deadline"),
  inActiveSprint: boolean("in_active_sprint").default(false),
  domain: text("domain"),
});

export const appConfig = pgTable("app_config", {
  id: text("id").primaryKey().default('default'),
  config: jsonb("config").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const knowledgeNodes = pgTable("knowledge_nodes", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  type: text("type").notNull().default("concept"),
  title: text("title").notNull(),
  summary: text("summary").default(""),
  content: text("content").default(""),
  visualShape: text("visual_shape").default("hex"),
  visualColor: text("visual_color").default("#326ce5"),
  tags: jsonb("tags").default([]),
  jiraTaskKeys: jsonb("jira_task_keys").default([]),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const knowledgeRelations = pgTable("knowledge_relations", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  sourceNodeId: text("source_node_id").notNull(),
  targetNodeId: text("target_node_id").notNull(),
  relationType: text("relation_type").notNull().default("relates_to"),
  label: text("label").default(""),
  animated: boolean("animated").default(true),
  properties: jsonb("properties").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const knowledgeClusters = pgTable("knowledge_clusters", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  name: text("name").notNull(),
  description: text("description").default(""),
  color: text("color").default("#0052cc"),
  nodeIds: jsonb("node_ids").default([]),
  positions2D: jsonb("positions_2d").default({}),
  positions3D: jsonb("positions_3d").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

