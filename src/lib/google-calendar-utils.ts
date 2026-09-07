import { TaskCalendarSchedule } from './app-config';
import { RawJiraIssue, PersonalRecord } from '@/types';

/**
 * Format a Date object to Google Calendar UTC timestamp string: YYYYMMDDTHHmmssZ
 */
export function formatToGoogleUtcString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const mins = pad(date.getUTCMinutes());
  const secs = pad(date.getUTCSeconds());
  return `${year}${month}${day}T${hours}${mins}${secs}Z`;
}

/**
 * Format a Date to YYYYMMDD (all-day event)
 */
export function formatToAllDayString(dateStr: string): string {
  return dateStr.replace(/[^0-9]/g, '').slice(0, 8);
}

export interface GoogleCalendarEventOptions {
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm (e.g. "10:00")
  endDate?: string;   // YYYY-MM-DD
  endTime?: string;   // HH:mm (e.g. "11:30")
  durationMinutes?: number;
  location?: string;
  accountEmail?: string;
}

/**
 * Build official Google Calendar Web Intent URL for 1-click scheduling.
 * https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&details=...&add=...
 */
export function buildGoogleCalendarUrl(options: GoogleCalendarEventOptions): string {
  const {
    title,
    description = '',
    startDate,
    startTime = '09:00',
    endDate,
    endTime,
    durationMinutes = 60,
    location = 'Dora Strategic Workspace',
    accountEmail,
  } = options;

  let datesParam = '';

  if (startDate && startTime) {
    // Timed event
    const startDt = new Date(`${startDate}T${startTime}:00`);
    let endDt: Date;

    if (endDate && endTime) {
      endDt = new Date(`${endDate}T${endTime}:00`);
    } else {
      endDt = new Date(startDt.getTime() + durationMinutes * 60 * 1000);
    }

    datesParam = `${formatToGoogleUtcString(startDt)}/${formatToGoogleUtcString(endDt)}`;
  } else if (startDate) {
    // All-day event
    const startFormatted = formatToAllDayString(startDate);
    const endFormatted = endDate ? formatToAllDayString(endDate) : startFormatted;
    datesParam = `${startFormatted}/${endFormatted}`;
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: datesParam,
    details: description,
    location: location,
  });

  if (accountEmail) {
    params.set('add', accountEmail);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Build contextual description for a task scheduled from Strategic Roadmap.
 */
export function buildTaskCalendarDescription(
  task: RawJiraIssue,
  personal?: PersonalRecord,
  notes?: string
): string {
  const lines: string[] = [];

  lines.push(`📌 Task: ${task.key} - ${task.title}`);
  if (personal?.nickname) lines.push(`🏷️ Alias: ${personal.nickname}`);
  lines.push(`⚡ Priority: ${task.priority} | Status: ${task.status} | Type: ${task.issue_type}`);
  lines.push(`👤 Assignee: ${task.assignee || 'Unassigned'}`);
  lines.push(`📅 Official Jira Deadline: ${task.official_deadline || 'Not set'}`);
  if (personal?.self_target) lines.push(`🎯 Personal Self-Target: ${personal.self_target}`);

  if (notes) {
    lines.push('\n📝 Focus Session Notes:');
    lines.push(notes);
  }

  if (personal?.notes_log && personal.notes_log.length > 0) {
    lines.push('\n📖 Recent Notes:');
    personal.notes_log.slice(-3).forEach(n => {
      lines.push(`• [${n.timestamp}] ${n.note}`);
    });
  }

  lines.push('\n━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('🚀 Dora — Personal Management & Strategic Roadmap');

  return lines.join('\n');
}

/**
 * Generate RFC 5545 iCalendar stream for an account's scheduled roadmap tasks.
 */
export function generateIcsFeed(
  accountName: string,
  accountEmail: string,
  schedules: TaskCalendarSchedule[],
  tasksMap: Map<string, RawJiraIssue>
): string {
  const nowUtc = formatToGoogleUtcString(new Date()).replace(/[-:]/g, '');

  const events: string[] = [];

  schedules.forEach((sch) => {
    const task = tasksMap.get(sch.taskKey);
    const summary = `[${sch.taskKey}] ${sch.title}`;
    const startDt = new Date(`${sch.startDate}T${sch.startTime || '09:00'}:00`);
    const endDt = new Date(`${sch.endDate || sch.startDate}T${sch.endTime || '10:00'}:00`);

    const dtStart = formatToGoogleUtcString(startDt).replace(/[-:]/g, '');
    const dtEnd = formatToGoogleUtcString(endDt).replace(/[-:]/g, '');

    const desc = (sch.description || '')
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');

    events.push([
      'BEGIN:VEVENT',
      `UID:dora-${sch.taskKey}-${sch.startDate}@dora-portal`,
      `DTSTAMP:${nowUtc}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${desc}`,
      `STATUS:${sch.status === 'completed' ? 'CONFIRMED' : 'TENTATIVE'}`,
      'CLASS:PUBLIC',
      'TRANSP:OPAQUE',
      'END:VEVENT',
    ].join('\r\n'));
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dora//Strategic Roadmap Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Dora Roadmap (${accountName})`,
    'X-WR-TIMEZONE:UTC',
    `X-WR-CALDESC:Scheduled Jira roadmap tasks and focus commitments for ${accountEmail}`,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}
