import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabase();
  const { error } = await supabase.from('sources_keywords').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = getSupabase();
  const body = await req.json().catch(() => ({}));
  const { active } = body;
  const { error } = await supabase.from('sources_keywords').update({ active }).eq('id', params.id);
  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
  return NextResponse.json({ ok: true });
}

