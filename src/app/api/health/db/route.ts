import { NextResponse } from 'next/server';
import { pingDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await pingDatabase();
  return NextResponse.json(status, { status: status.connected ? 200 : 503 });
}
