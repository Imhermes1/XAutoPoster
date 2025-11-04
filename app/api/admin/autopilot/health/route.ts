import { NextRequest, NextResponse } from 'next/server';
import { getAutopilotHealthCheck } from '@/lib/smart-autopilot';
import { isAdminAuthorized } from '@/lib/auth';

/**
 * GET /api/admin/autopilot/health
 * Get current autopilot health status (spacing, variety, feed quality)
 */
export async function GET(request: NextRequest) {
  try {
    const cookies = request.headers.get('cookie');
    if (!isAdminAuthorized(cookies)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const health = await getAutopilotHealthCheck();

    return NextResponse.json({
      status: health.ready ? 'healthy' : 'warning',
      spacing: health.spacing,
      variety: health.variety,
      timestamp: health.timestamp,
      ready: health.ready,
    });
  } catch (error) {
    console.error('Error getting autopilot health:', error);
    return NextResponse.json(
      { error: 'Failed to get autopilot health' },
      { status: 500 }
    );
  }
}
