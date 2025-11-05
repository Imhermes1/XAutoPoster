import { NextRequest, NextResponse } from 'next/server';
import { ingestFromRSSFeeds } from '@/lib/twitter-reader';
import { logActivity } from '@/lib/automation-logger';

/**
 * Endpoint to manually fetch RSS feeds or check if it's time to fetch based on schedule
 *
 * Usage:
 * - POST with no body: Manually fetch now
 * - GET with ?check=true: Check if it's time to fetch based on schedule
 */
export async function POST(request: NextRequest) {
  try {
    const secretHeader = request.headers.get('x-cron-secret');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && secretHeader !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    console.log('[fetch-rss] Starting manual RSS fetch');

    // Fetch from all RSS sources
    const result = await ingestFromRSSFeeds();

    const duration = Date.now() - startTime;

    // Log activity
    await logActivity({
      category: 'ingestion',
      severity: result.inserted > 0 ? 'success' : 'info',
      title: 'RSS Fetch (Manual)',
      description: `Manually fetched RSS feeds: ${result.inserted} new items inserted`,
      metadata: { ...result, duration_ms: duration }
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
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    // Default schedule: Every 6 hours (can be customized via env or config)
    // Fetch at: 12am, 6am, 12pm, 6pm
    const fetchHours = [0, 6, 12, 18];
    const shouldFetch = fetchHours.includes(hours) && minutes < 10; // Fetch in first 10 minutes of hour

    const nextFetchHour = fetchHours.find(h => h * 60 > currentMinutes) || fetchHours[0];
    const nextFetchTime = new Date(now);
    nextFetchTime.setHours(nextFetchHour, 0, 0, 0);
    if (nextFetchHour === fetchHours[0] && nextFetchHour < hours) {
      nextFetchTime.setDate(nextFetchTime.getDate() + 1); // Tomorrow
    }

    return NextResponse.json({
      should_fetch: shouldFetch,
      current_hour: hours,
      current_minutes: minutes,
      scheduled_hours: fetchHours,
      next_fetch_time: nextFetchTime.toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
