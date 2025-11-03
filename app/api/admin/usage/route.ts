import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get API usage stats for today
    const { data: usageData, error: usageError } = await supabase
      .from('api_usage_tracking')
      .select('*')
      .gte('timestamp', today.toISOString())
      .order('timestamp', { ascending: false });

    if (usageError) throw usageError;

    // Get posts written today
    const { data: postsData, error: postsError } = await supabase
      .from('posts_history')
      .select('*')
      .gte('posted_at', today.toISOString());

    if (postsError) throw postsError;

    // Calculate stats
    const stats = {
      posts_read: 0, // Would need feed fetching tracking
      posts_written: postsData?.length || 0,
      api_calls: usageData?.length || 0,
      estimated_cost: (usageData?.reduce((sum, call) => sum + (call.cost_usd || 0), 0) || 0).toFixed(4),
      last_updated: new Date().toISOString(),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch usage stats:', error);
    return NextResponse.json({ error: 'Failed to fetch usage stats' }, { status: 500 });
  }
}
