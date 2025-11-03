import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('sources_keywords').select('id, query, active');
  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
  return NextResponse.json({ keywords: data || [] });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = (body?.query || '').toString().trim();
    if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 });
    const supabase = getSupabase();
    const { error } = await supabase.from('sources_keywords').insert({ query, active: true });
    if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

