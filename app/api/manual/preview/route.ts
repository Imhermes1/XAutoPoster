import { NextResponse } from 'next/server';
import { generatePost } from '@/lib/content-generator';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const topic = (body?.topic || '').toString().trim();
    const context = (body?.context || '').toString().trim() || undefined;
    if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });
    const post = await generatePost(topic, context);
    return NextResponse.json({ post });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
