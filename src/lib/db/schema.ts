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
