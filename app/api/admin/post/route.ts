import { NextResponse } from 'next/server';
import { postToX } from '@/lib/x-api';
import { savePostHistory } from '@/lib/kv-storage';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = (body?.text || '').toString();
    if (!text.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 });
    const result = await postToX(text);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 502 });
    }
    await savePostHistory({ text, postedAt: Date.now(), topicId: undefined });
    return NextResponse.json({ success: true, id: result.id });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

