import { NextResponse } from 'next/server';
import { getRecentAutomationRuns } from '@/lib/automation-logger';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    console.log('[logs-automation] Fetching automation runs, limit:', limit);
    const logs = await getRecentAutomationRuns(limit);
    console.log('[logs-automation] Fetched', logs?.length || 0, 'automation runs');

    return NextResponse.json({ logs: logs || [], total: logs?.length || 0 });
  } catch (error: any) {
    console.error('[logs-automation] Error:', error);
    return NextResponse.json({ error: error.message, logs: [] }, { status: 500 });
  }
}
