import { NextRequest, NextResponse } from 'next/server';
import { ingestFromRSSFeeds } from '@/lib/twitter-reader';
import { logActivity } from '@/lib/automation-logger';
import { shouldRunAtUTCHour, getNextFetchTime } from '@/lib/timezone-utils';

/**
 * Endpoint to manually fetch RSS feeds or check if it's time to fetch based on schedule
 *
 * Usage:
 * - POST with no body: Manually fetch now
 * - GET with ?check=true: Check if it's time to fetch based on schedule
 */
export async function POST(request: NextRequest) {
  try {
    // Require CRON_SECRET for all calls - fail closed for security
    const secretHeader = request.headers.get('x-cron-secret');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[fetch-rss] CRON_SECRET not configured - refusing all requests');
      return NextResponse.json(
        { error: 'CRON_SECRET not configured on server' },
        { status: 500 }
      );
    }

    if (secretHeader !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    console.log('[fetch-rss] Starting manual RSS fetch');

    // Fetch from all RSS sources
    // Note: ingestFromRSSFeeds already logs to ingestion_logs internally
    const result = await ingestFromRSSFeeds();

    const duration = Date.now() - startTime;

    // Log activity for visibility
    await logActivity({
      category: 'ingestion',
      severity: result.inserted > 0 ? 'success' : 'info',
      title: 'RSS Fetch (Manual)',
      description: `Manually fetched RSS feeds: ${result.inserted} new items inserted`,
      metadata: { inserted: result.inserted, duration_ms: duration }
    });

    console.log(`[fetch-rss] Completed in ${duration}ms:`, result);

    return NextResponse.json({
      success: true,
      ...result,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[fetch-rss] Error:', error);

    await logActivity({
      category: 'ingestion',
      severity: 'error',
      title: 'RSS Fetch Failed',
      description: `Error during manual RSS fetch: ${String(error)}`
    });

    return NextResponse.json(
      { error: String(error), success: false },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action');

    if (action === 'check-schedule') {
      // Check if it's time to fetch based on custom schedule
      return checkFetchSchedule();
    }

    // Default: return status/help
    return NextResponse.json({
      endpoint: '/api/cron/fetch-rss',
      usage: {
        manualFetch: 'POST /api/cron/fetch-rss (with x-cron-secret header)',
        checkSchedule: 'GET /api/cron/fetch-rss?action=check-schedule'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Check if current time matches any configured fetch schedule window
 * Returns whether to fetch and the next scheduled fetch time
 */
function checkFetchSchedule(): NextResponse {
  try {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();

    // Default schedule: Every 6 hours at UTC hour boundaries
    // Fetch at: 00:00 UTC, 06:00 UTC, 12:00 UTC, 18:00 UTC
    const fetchHours = [0, 6, 12, 18];
    const shouldFetch = shouldRunAtUTCHour(fetchHours); // Uses UTC hours

    const nextFetchTime = getNextFetchTime(6); // 6-hour intervals

    return NextResponse.json({
      should_fetch: shouldFetch,
      current_utc_hour: utcHours,
      current_utc_minutes: utcMinutes,
      scheduled_utc_hours: fetchHours,
      next_fetch_time: nextFetchTime.toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
