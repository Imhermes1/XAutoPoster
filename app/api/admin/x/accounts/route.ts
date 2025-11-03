import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('sources_accounts').select('id, handle, active, user_id');
  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
  return NextResponse.json({ accounts: data || [] });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let handle = (body?.handle || '').toString().trim();
    if (!handle) return NextResponse.json({ error: 'handle required' }, { status: 400 });
    if (!handle.startsWith('@')) handle = '@' + handle;
    const supabase = getSupabase();
    const { error } = await supabase.from('sources_accounts').insert({ handle, active: true });
    if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

