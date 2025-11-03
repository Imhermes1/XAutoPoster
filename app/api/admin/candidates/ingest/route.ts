import { NextResponse } from 'next/server';
import { ingestFromAccountsAndKeywords } from '@/lib/twitter-reader';

export async function POST() {
  try {
    const res = await ingestFromAccountsAndKeywords();
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

