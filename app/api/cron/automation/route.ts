import { NextRequest, NextResponse } from 'next/server';

/**
 * Unified cron job that handles both:
 * 1. Processing scheduled posts (every run)
 * 2. Generating new posts (at scheduled times only)
 *
 * This consolidates /api/cron/post and /api/cron/process-scheduled into one endpoint
 * to work within Vercel's free tier limit of 1 cron job.
 */
export async function GET(request: NextRequest) {
  try {
    const results: any = {
      scheduled_posts: null,
      new_post_generation: null,
    };

    // 1. Always process scheduled posts
    try {
      const scheduledRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron/process-scheduled`,
        { method: 'GET' }
      );
      results.scheduled_posts = await scheduledRes.json();
    } catch (error) {
      console.error('Error processing scheduled posts:', error);
      results.scheduled_posts = { error: 'Failed to process scheduled posts' };
    }

    // 2. Check if it's time to generate new posts (run at posting times)
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();

    // Fetch config to check posting times
    try {
      const configRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/config`,
        { method: 'GET' }
      );
      const { config } = await configRes.json();

      if (config && config.enabled && config.posting_times) {
        // Check if current time matches any posting time (within 15 min window)
        const shouldGenerate = config.posting_times.some((time: string) => {
          const [hours, minutes] = time.split(':').map(Number);
          const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (hours * 60 + minutes));
          return timeDiff <= 15; // 15 minute window
        });

        if (shouldGenerate) {
          const postRes = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron/post`,
            { method: 'GET' }
          );
          results.new_post_generation = await postRes.json();
        } else {
          results.new_post_generation = { skipped: 'Not a posting time' };
        }
      }
    } catch (error) {
      console.error('Error generating new posts:', error);
      results.new_post_generation = { error: 'Failed to generate new posts' };
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    console.error('Unified cron error:', error);
    return NextResponse.json(
      { error: error.message || 'Cron job failed' },
      { status: 500 }
    );
  }
}
