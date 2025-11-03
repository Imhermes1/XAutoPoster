import { NextResponse } from 'next/server';
import { deleteSource } from '@/lib/sources';

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    await deleteSource(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

