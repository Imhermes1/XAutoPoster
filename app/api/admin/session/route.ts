import { NextResponse } from 'next/server';
import { setAdminCookie } from '@/lib/auth';

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD not set' }, { status: 500 });
  }
  if (password !== expected) {
    return NextResponse.json({ error: 'invalid password' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.headers.append('Set-Cookie', setAdminCookie());
  return res;
}

