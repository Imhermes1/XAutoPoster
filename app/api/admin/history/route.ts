import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get('limit') || 20);
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('posts_history')
      .select('id, text, posted_at, topic_id')
      .order('posted_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return NextResponse.json({ items: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

