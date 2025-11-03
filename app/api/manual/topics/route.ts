import { NextResponse } from 'next/server';
import { addManualTopic, getUnusedManualTopics } from '@/lib/kv-storage';

export async function GET() {
  try {
    const topics = await getUnusedManualTopics();
    return NextResponse.json({ topics });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topic = (body?.topic || '').toString().trim();
    if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });
    const added = await addManualTopic(topic);
    return NextResponse.json(added);
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

