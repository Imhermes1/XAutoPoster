import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminAuthorized } from '@/lib/auth';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function DELETE(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    // Check auth
    const cookies = request.headers.get('cookie');
    if (!isAdminAuthorized(cookies)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = params;

    const { error } = await supabase
      .from('bulk_post_queue')
      .delete()
      .eq('id', postId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
