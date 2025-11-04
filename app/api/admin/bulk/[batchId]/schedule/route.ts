import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface PostSchedule {
  id: string;
  scheduled_for: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const { post_schedules }: { post_schedules: PostSchedule[] } = await request.json();

    if (!post_schedules || !Array.isArray(post_schedules)) {
      return NextResponse.json(
        { error: 'post_schedules must be an array' },
        { status: 400 }
      );
    }

    // Validate all times are in the future
    const now = new Date();
    for (const schedule of post_schedules) {
      const scheduledTime = new Date(schedule.scheduled_for);
      if (scheduledTime <= now) {
        return NextResponse.json(
          { error: `Scheduled time must be in the future: ${schedule.id}` },
          { status: 400 }
        );
      }
    }

    // Update each post with its scheduled time and change status from draft to pending
    const updates = [];
    for (const schedule of post_schedules) {
      const { data, error } = await supabase
        .from('bulk_post_queue')
        .update({
          scheduled_for: new Date(schedule.scheduled_for).toISOString(),
          status: 'pending',
        })
        .eq('id', schedule.id)
        .eq('batch_id', params.batchId)
        .select()
        .single();

      if (error) {
        console.error(`Failed to update post ${schedule.id}:`, error);
        return NextResponse.json(
          { error: `Failed to update post ${schedule.id}: ${error.message}` },
          { status: 500 }
        );
      }

      updates.push(data);
    }

    return NextResponse.json({
      success: true,
      updated: updates.length,
      posts: updates,
    });
  } catch (error) {
    console.error('Scheduling failed:', error);
    return NextResponse.json(
      { error: 'Failed to schedule posts' },
      { status: 500 }
    );
  }
}
