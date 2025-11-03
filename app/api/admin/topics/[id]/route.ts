import { NextResponse } from 'next/server';
import { setManualTopicRemaining } from '@/lib/kv-storage';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json();
    const remaining = Number(body?.remaining);
    if (Number.isNaN(remaining)) return NextResponse.json({ error: 'remaining required' }, { status: 400 });
    await setManualTopicRemaining(id, remaining);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

