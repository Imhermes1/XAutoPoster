import { NextResponse } from 'next/server';
import { getRecentActivity } from '@/lib/automation-logger';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const activities = await getRecentActivity(limit);

    return NextResponse.json({ activities });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
