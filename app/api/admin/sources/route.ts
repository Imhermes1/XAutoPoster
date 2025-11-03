import { NextResponse } from 'next/server';
import { addSource, listSources } from '@/lib/sources';

export async function GET() {
  try {
    const sources = await listSources();
    return NextResponse.json({ sources });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = (body?.url || '').toString().trim();
    const category = (body?.category || '').toString().trim() || undefined;
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });
    const src = await addSource(url, category);
    return NextResponse.json(src);
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

