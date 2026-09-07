import { NextRequest, NextResponse } from 'next/server';
import { getAppConfigAction } from '@/server/actions/config-actions';
import { getJiraTasksAction } from '@/server/actions/jira-actions';
import { generateIcsFeed } from '@/lib/google-calendar-utils';
import { RawJiraIssue } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const config = await getAppConfigAction();
    const accountId = searchParams.get('accountId') || config.accounts?.[0]?.id || 'account-1';

    const account = config.accounts?.find((a) => a.id === accountId) || {
      id: accountId,
      name: 'Dora User',
      email: 'narayanansubramani14@gmail.com',
    };

    const schedulesMap = config.calendarSchedulesByAccount?.[accountId] || {};
    const schedulesList = Object.values(schedulesMap);

    const tasks = await getJiraTasksAction();
    const tasksMap = new Map<string, RawJiraIssue>();
    tasks.forEach((t) => tasksMap.set(t.key, t));

    const icsContent = generateIcsFeed(
      account.name,
      account.email,
      schedulesList,
      tasksMap
    );

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `inline; filename="dora-roadmap-${accountId}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Failed to generate iCal feed:', error);
    return new NextResponse('Failed to generate calendar feed', { status: 500 });
  }
}
