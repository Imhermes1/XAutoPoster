import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET() {
  try {
    // Fetch all draft posts
    const { data, error } = await supabase
      .from('bulk_post_queue')
      .select('*')
      .eq('status', 'draft')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Group by batch_id
    const batches: Record<string, any[]> = {};
    for (const post of data || []) {
      if (!batches[post.batch_id]) {
        batches[post.batch_id] = [];
      }
      batches[post.batch_id].push(post);
    }

    // Convert to array format with batch metadata
    const result = Object.entries(batches).map(([batch_id, posts]) => ({
      batch_id,
      post_count: posts.length,
      created_at: posts[0]?.created_at,
      posts: posts.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    }));

    return NextResponse.json({
      success: true,
      batch_count: result.length,
      batches: result,
    });
  } catch (error) {
    console.error('Failed to fetch drafts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drafts' },
      { status: 500 }
    );
  }
}
