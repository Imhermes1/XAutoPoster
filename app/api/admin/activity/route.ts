import { NextResponse } from 'next/server';
import { getRecentActivity } from '@/lib/automation-logger';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    console.log('[logs-activity] Fetching activity logs, limit:', limit);
    const activities = await getRecentActivity(limit);
    console.log('[logs-activity] Fetched', activities?.length || 0, 'activities');

    return NextResponse.json({ activities: activities || [], total: activities?.length || 0 });
  } catch (error: any) {
    console.error('[logs-activity] Error:', error);
    return NextResponse.json({ error: error.message, activities: [] }, { status: 500 });
  }
}
