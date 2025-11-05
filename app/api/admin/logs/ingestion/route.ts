import { NextResponse } from 'next/server';
import { getIngestionHistory } from '@/lib/automation-logger';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    console.log('[logs-ingestion] Fetching ingestion logs, limit:', limit);
    const logs = await getIngestionHistory(undefined, limit);
    console.log('[logs-ingestion] Fetched', logs?.length || 0, 'ingestion logs');

    return NextResponse.json({ logs: logs || [], total: logs?.length || 0 });
  } catch (error: any) {
    console.error('[logs-ingestion] Error:', error);
    return NextResponse.json({ error: error.message, logs: [] }, { status: 500 });
  }
}
