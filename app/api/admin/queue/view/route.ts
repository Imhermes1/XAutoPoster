import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

/**
 * View all posts in bulk_post_queue with full details
 * GET /api/admin/queue/view
 */
export async function GET(req: Request) {
  try {
    const supabase = getSupabase();
    const url = new URL(req.url);
    const status = url.searchParams.get('status'); // Filter by status
    const limit = Number(url.searchParams.get('limit') || 100);

    let query = supabase
      .from('bulk_post_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch queue', details: error },
        { status: 500 }
      );
    }

    // Calculate statistics
    const stats = {
      total: data?.length || 0,
      by_status: {
        draft: data?.filter((p: any) => p.status === 'draft').length || 0,
        pending: data?.filter((p: any) => p.status === 'pending').length || 0,
        posted: data?.filter((p: any) => p.status === 'posted').length || 0,
        failed: data?.filter((p: any) => p.status === 'failed').length || 0,
      },
      by_quality: {
        excellent: data?.filter((p: any) => p.quality_score >= 9).length || 0,
        good: data?.filter((p: any) => p.quality_score >= 7.5 && p.quality_score < 9).length || 0,
        okay: data?.filter((p: any) => p.quality_score >= 6.5 && p.quality_score < 7.5).length || 0,
        low: data?.filter((p: any) => p.quality_score < 6.5).length || 0,
      }
    };

    return NextResponse.json({
      success: true,
      stats,
      posts: data || [],
      filtered_by_status: status || 'all'
    });
  } catch (error: any) {
    console.error('[queue-view] Error:', error);
    return NextResponse.json(
      { error: 'Failed to view queue', details: error.message },
      { status: 500 }
    );
  }
}
