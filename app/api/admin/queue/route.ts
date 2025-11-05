import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get('limit') || 100);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('bulk_post_queue')
      .select('id, post_text, status, created_at, batch_id')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ items: data || [] });
  } catch (e: any) {
    console.error('[admin-queue] Error:', e);
    return NextResponse.json({ error: String(e), items: [] }, { status: 500 });
  }
}
