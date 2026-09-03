export type StatusType = 'In Progress' | 'Done' | 'REVIEW' | 'on-hold' | 'To Do' | string;
export type PriorityType = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest' | 'None' | string;

export interface RawJiraIssue {
  id: string;
  key: string;
  parent_key?: string | null;
  title: string;
  start_date: string;
  updated_date?: string;
  official_deadline: string;
  status: StatusType;
  progress?: number;
  domain?: string;
  priority: PriorityType;
  issue_type: string;
  assignee: string;
  reporter: string;
  labels?: string[];
  in_active_sprint?: boolean;
}

export interface JiraTaskNode extends RawJiraIssue {
  children: JiraTaskNode[];
  _is_sprint?: boolean;
  _is_backlog?: boolean;
}

export interface NoteEntry {
  timestamp: string;
  note: string;
}

export interface UpdateEntry {
  timestamp: string;
  update: string;
}

export interface PersonalRecord {
  nickname?: string;
  self_target?: string;
  self_priority?: PriorityType;
  notes_log?: NoteEntry[];
  daily_updates?: UpdateEntry[];
  notes?: string; // legacy fallback
}

export type PersonalDataMap = Record<string, PersonalRecord>;

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  jiraUser: string;
  jiraDomain?: string;
  avatarInitials: string;
}
