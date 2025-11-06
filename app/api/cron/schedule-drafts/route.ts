import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logActivity } from '@/lib/automation-logger';
import { createScheduledTimeUTC } from '@/lib/timezone-utils';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Automatically schedules draft tweets to pending status with configured posting times
 * This allows the automated pipeline to work without manual user intervention
 */
export async function POST(request: NextRequest) {
  try {
    const secretHeader = request.headers.get('x-cron-secret');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[schedule-drafts] CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'CRON_SECRET not configured on server' },
        { status: 500 }
      );
    }

    if (secretHeader !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get automation config (includes posting times and timezone)
    const { data: config, error: configError } = await supabase
      .from('automation_config')
      .select('*')
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: 'Failed to fetch automation config' },
        { status: 500 }
      );
    }

    const postingTimes: string[] = config.posting_times || [
      '08:00', '10:00', '12:00', '14:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
    ];
    const timezone = config.timezone || 'Australia/Sydney';

    // Get all draft posts that haven't been scheduled yet
    const { data: drafts, error: draftsError } = await supabase
      .from('bulk_post_queue')
      .select('id, created_at, batch_id')
      .eq('status', 'draft')
      .is('scheduled_for', null)
      .order('created_at', { ascending: true });

    if (draftsError) {
      console.error('Failed to fetch drafts:', draftsError);
      return NextResponse.json(
        { error: 'Failed to fetch drafts' },
        { status: 500 }
      );
    }

    if (!drafts || drafts.length === 0) {
      return NextResponse.json({
        success: true,
        scheduled: 0,
        message: 'No unscheduled drafts found'
      });
    }

    // Group drafts by batch and schedule them
    const batchMap = new Map<string | null, typeof drafts>();
    for (const draft of drafts) {
      const batchId = draft.batch_id || 'single';
      if (!batchMap.has(batchId)) {
        batchMap.set(batchId, []);
      }
      batchMap.get(batchId)!.push(draft);
    }

    let totalScheduled = 0;
    const updates: any[] = [];

    // Schedule each batch across the posting times
    for (const [batchId, batchDrafts] of batchMap.entries()) {
      const postsInBatch = batchDrafts.length;

      // Distribute posts across available posting times
      for (let i = 0; i < postsInBatch; i++) {
        const timeIndex = i % postingTimes.length;
        const postingTime = postingTimes[timeIndex];

        // Create scheduled time using proper timezone conversion
        let scheduledDate = createScheduledTimeUTC(postingTime, timezone, 0);
        const now = new Date();

        // If the time has already passed today, schedule for tomorrow
        if (scheduledDate < now) {
          scheduledDate = createScheduledTimeUTC(postingTime, timezone, 1);
        }

        const draftId = batchDrafts[i].id;
        updates.push({
          id: draftId,
          batch_id: batchDrafts[i].batch_id,
          scheduled_for: scheduledDate.toISOString(),
          status: 'pending'
        });

        totalScheduled++;
      }
    }

    // Batch update all scheduled posts
    if (updates.length > 0) {
      const { error: updateError } = await supabase
        .from('bulk_post_queue')
        .upsert(updates, { onConflict: 'id' });

      if (updateError) {
        console.error('Failed to schedule drafts:', updateError);
        return NextResponse.json(
          { error: 'Failed to schedule drafts' },
          { status: 500 }
        );
      }
    }

    // Log activity
    await logActivity({
      category: 'system',
      severity: 'success',
      title: 'Draft Posts Scheduled',
      description: `Automatically scheduled ${totalScheduled} draft posts across ${postingTimes.length} daily posting times`,
      metadata: { scheduled_count: totalScheduled, posting_times: postingTimes }
    });

    return NextResponse.json({
      success: true,
      scheduled: totalScheduled,
      posting_times: postingTimes,
      timezone
    });
  } catch (error) {
    console.error('Error in schedule-drafts:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Allow GET for testing
  return POST(request);
}
