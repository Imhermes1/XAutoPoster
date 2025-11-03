import { NextResponse } from 'next/server';
import { improveText } from '@/lib/content-generator';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = (body?.text || '').toString();
    if (!text.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 });
    const improved = await improveText(text);
    return NextResponse.json({ text: improved });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

