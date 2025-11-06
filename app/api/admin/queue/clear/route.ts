import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

/**
 * Admin endpoint to clear the bulk_post_queue
 * DELETE /api/admin/queue/clear
 */
export async function DELETE(req: Request) {
  try {
    const supabase = getSupabase();

    // Get count before
    const { count: beforeCount } = await supabase
      .from('bulk_post_queue')
      .select('*', { count: 'exact', head: true });

    console.log(`[queue-clear] Queue before: ${beforeCount} tweets`);

    // Delete all rows
    const { error: deleteError, data } = await supabase
      .from('bulk_post_queue')
      .delete()
      .neq('id', ''); // Delete all rows

    if (deleteError) {
      console.error('[queue-clear] Delete failed:', deleteError);
      return NextResponse.json(
        { error: 'Failed to clear queue', details: deleteError },
        { status: 500 }
      );
    }

    // Verify it's empty
    const { count: afterCount } = await supabase
      .from('bulk_post_queue')
      .select('*', { count: 'exact', head: true });

    console.log(`[queue-clear] Queue after: ${afterCount} tweets`);

    return NextResponse.json({
      success: true,
      message: 'Queue cleared successfully',
      cleared_count: beforeCount || 0,
      remaining_count: afterCount || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[queue-clear] Error:', error);
    return NextResponse.json(
      { error: 'Failed to clear queue', details: error.message },
      { status: 500 }
    );
  }
}
