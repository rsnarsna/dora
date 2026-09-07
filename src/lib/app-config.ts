import { UserAccount } from '@/types';

/**
 * Centralized App Configuration — loaded from Supabase `app_config` table.
 * All UI customizations live here instead of being hardcoded in components.
 */
export interface JiraDomainConfig {
  url: string;       // e.g. "https://softmania-ps.atlassian.net"
  email: string;     // Jira account email
  token: string;     // API token
  label?: string;    // Display name
}

export interface RoadmapGroup {
  id: string;
  name: string;
  color?: string;
  taskKeys: string[];
}

export interface TaskCalendarSchedule {
  taskKey: string;
  startDate: string;       // YYYY-MM-DD
  startTime: string;       // HH:mm (e.g. "10:00")
  endDate: string;         // YYYY-MM-DD
  endTime: string;         // HH:mm (e.g. "11:30")
  durationMinutes: number; // e.g. 90
  title: string;
  description?: string;
  googleCalendarUrl?: string;
  syncedAt: string;        // ISO timestamp
  status: 'scheduled' | 'tentative' | 'completed';
}

export interface AppConfig {
  app: {
    title: string;
    description: string;
  };
  sidebar: {
    width: string;
    defaultOpen: boolean;
  };
  accounts: UserAccount[];
  jiraDomains: JiraDomainConfig[];
  roadmapGroups: RoadmapGroup[];
  roadmapGroupsByAccount?: Record<string, RoadmapGroup[]>;
  calendarSchedulesByAccount?: Record<string, Record<string, TaskCalendarSchedule>>;
  statusColors: Record<string, string>;
  statusThemes: Record<string, { bg: string; fg: string; border: string }>;
}

/**
 * Fallback config used when no row exists in Supabase yet.
 */
export const DEFAULT_CONFIG: AppConfig = {
  app: {
    title: 'Dora',
    description: 'Personal Jira Management Dashboard & Strategic Execution Roadmap',
  },
  sidebar: {
    width: '22rem',
    defaultOpen: true,
  },
  accounts: [
    {
      id: 'account-1',
      name: 'Narayanan S (Softmania PS)',
      email: 'narayanansubramani14@gmail.com',
      role: 'Product Manager',
      jiraUser: 'Narayanan S',
      jiraDomain: 'softmania-ps',
      avatarInitials: 'SM',
    },
    {
      id: 'account-2',
      name: 'Narayanan Personal (TNTAI)',
      email: 'narayanansubramani14@gmail.com',
      role: 'Personal Workspace',
      jiraUser: 'none',
      jiraDomain: 'narayanansubramani14-1785036189516',
      avatarInitials: 'NP',
    },
  ],
  jiraDomains: [
    {
      url: 'https://softmania-ps.atlassian.net',
      email: 'narayanansubramani14@gmail.com',
      token: '',
      label: 'Softmania PS',
    },
    {
      url: 'https://narayanansubramani14-1785036189516.atlassian.net',
      email: 'narayanansubramani14@gmail.com',
      token: '',
      label: 'Narayanan Personal',
    },
  ],
  roadmapGroups: [
    {
      id: 'group-1',
      name: 'Week 1: Core Setup & Prereqs',
      color: '#0052cc',
      taskKeys: ['SCRUM-179', 'SCRUM-180'],
    },
    {
      id: 'group-2',
      name: 'Week 2: Security & Splunk Ingestion',
      color: '#00875a',
      taskKeys: ['SCRUM-181', 'SCRUM-182', 'SCRUM-168'],
    },
    {
      id: 'group-3',
      name: 'Upcoming Deliverables & Review',
      color: '#6554c0',
      taskKeys: ['SCRUM-97', 'SCRUM-98', 'SCRUM-135'],
    },
  ],
  roadmapGroupsByAccount: {
    'account-1': [
      {
        id: 'group-1',
        name: 'Week 1: Core Setup & Prereqs',
        color: '#0052cc',
        taskKeys: ['SCRUM-179', 'SCRUM-180'],
      },
      {
        id: 'group-2',
        name: 'Week 2: Security & Splunk Ingestion',
        color: '#00875a',
        taskKeys: ['SCRUM-181', 'SCRUM-182', 'SCRUM-168'],
      },
      {
        id: 'group-3',
        name: 'Upcoming Deliverables & Review',
        color: '#6554c0',
        taskKeys: ['SCRUM-97', 'SCRUM-98', 'SCRUM-135'],
      },
    ],
    'account-2': [
      {
        id: 'group-np-1',
        name: 'Milestone 1: Workspace & Setup',
        color: '#0052cc',
        taskKeys: [],
      },
      {
        id: 'group-np-2',
        name: 'Milestone 2: Execution & Review',
        color: '#00875a',
        taskKeys: [],
      },
    ],
  },
  statusColors: {
    'In Progress': '#0052cc',
    'Done': '#00875a',
    'REVIEW': '#6554c0',
    'on-hold': '#ff5630',
    'To Do': '#97a0af',
  },
  statusThemes: {
    'In Progress': { bg: '#deebff', fg: '#0052cc', border: '#0052cc' },
    'Done': { bg: '#e3fcef', fg: '#006644', border: '#00875a' },
    'REVIEW': { bg: '#eae6ff', fg: '#403294', border: '#6554c0' },
    'on-hold': { bg: '#ffebe6', fg: '#bf2600', border: '#ff5630' },
    'To Do': { bg: '#f4f5f7', fg: '#5e6c84', border: '#97a0af' },
  },
};

/** Get a status dot color, with fallback */
export function getStatusColor(statusColors: Record<string, string>, status: string): string {
  return statusColors[status] || '#97a0af';
}

/** Get a full status theme (bg/fg/border), with fallback */
export function getStatusTheme(
  statusThemes: Record<string, { bg: string; fg: string; border: string }>,
  status: string
): { bg: string; fg: string; border: string } {
  return statusThemes[status] || { bg: '#f4f5f7', fg: '#5e6c84', border: '#97a0af' };
}
