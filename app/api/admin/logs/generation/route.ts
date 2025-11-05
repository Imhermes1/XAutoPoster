import { NextResponse } from 'next/server';
import { getPostGenerationHistory } from '@/lib/automation-logger';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    console.log('[logs-generation] Fetching post generation logs, limit:', limit);
    const logs = await getPostGenerationHistory(limit);
    console.log('[logs-generation] Fetched', logs?.length || 0, 'generation logs');

    return NextResponse.json({ logs: logs || [], total: logs?.length || 0 });
  } catch (error: any) {
    console.error('[logs-generation] Error:', error);
    return NextResponse.json({ error: error.message, logs: [] }, { status: 500 });
  }
}
