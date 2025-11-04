import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET() {
  try {
    // Fetch all pending and posted posts
    const { data, error } = await supabase
      .from('bulk_post_queue')
      .select('*')
      .in('status', ['pending', 'posted', 'failed'])
      .order('scheduled_for', { ascending: true, nullsFirst: false });

    if (error) throw error;

    const now = new Date();
    const pending = (data || []).filter((p: any) => p.status === 'pending');
    const posted = (data || []).filter((p: any) => p.status === 'posted');
    const failed = (data || []).filter((p: any) => p.status === 'failed');

    return NextResponse.json({
      success: true,
      total: data?.length || 0,
      pending: pending.length,
      posted: posted.length,
      failed: failed.length,
      current_time: now.toISOString(),
      posts: data,
    });
  } catch (error) {
    console.error('Failed to fetch queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue' },
      { status: 500 }
    );
  }
}
