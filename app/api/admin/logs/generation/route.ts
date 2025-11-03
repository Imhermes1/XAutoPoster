import { NextResponse } from 'next/server';
import { getPostGenerationHistory } from '@/lib/automation-logger';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const logs = await getPostGenerationHistory(limit);

    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
