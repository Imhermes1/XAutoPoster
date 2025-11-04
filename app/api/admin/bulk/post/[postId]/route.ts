import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const { postId } = params;
    console.log(`[delete-post] Attempting to delete post: ${postId}`);

    const { error, data } = await supabase
      .from('bulk_post_queue')
      .delete()
      .eq('id', postId)
      .select();

    console.log(`[delete-post] Delete response:`, { error, data });

    if (error) {
      console.error(`[delete-post] Error deleting post ${postId}:`, error);
      throw error;
    }

    console.log(`[delete-post] Successfully deleted post ${postId}`);
    return NextResponse.json({ success: true, deleted: postId });
  } catch (error) {
    console.error('[delete-post] Failed:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
