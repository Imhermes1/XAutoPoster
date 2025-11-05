import { NextResponse } from 'next/server';
import { getContentAnalysisLogs } from '@/lib/automation-logger';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    console.log('[logs-analysis] Fetching content analysis logs, limit:', limit);
    const logs = await getContentAnalysisLogs(undefined, limit);
    console.log('[logs-analysis] Fetched', logs?.length || 0, 'analysis logs');

    return NextResponse.json({ logs: logs || [], total: logs?.length || 0 });
  } catch (error: any) {
    console.error('[logs-analysis] Error:', error);
    return NextResponse.json({ error: error.message, logs: [] }, { status: 500 });
  }
}
