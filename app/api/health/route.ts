import { NextResponse } from 'next/server';
import { getPostCount } from '@/lib/kv-storage';

export async function GET() {
  try {
    const lastDayCount = await getPostCount(1).catch(() => -1);
    return NextResponse.json({ ok: true, lastDayCount });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

