import { NextResponse } from 'next/server';
import { listCandidates } from '@/lib/candidates';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get('type') as any;
  const limit = Number(url.searchParams.get('limit') || 20);
  try {
    const items = await listCandidates(limit, type);
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

