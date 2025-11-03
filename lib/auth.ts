import { createHmac } from 'crypto';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-secret';

function sign(value: string) {
  const sig = createHmac('sha256', ADMIN_SECRET).update(value).digest('hex');
  return `${value}.${sig}`;
}

function verify(signed: string) {
  const [value, sig] = signed.split('.');
  if (!value || !sig) return false;
  const expected = createHmac('sha256', ADMIN_SECRET).update(value).digest('hex');
  return sig === expected ? value : false;
}

export function setAdminCookie(): string {
  const token = sign('admin');
  const cookie = `admin=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`;
  return cookie;
}

export function isAdminAuthorized(cookies: string | null): boolean {
  if (!cookies) return false;
  const match = cookies.match(/(?:^|; )admin=([^;]+)/);
  if (!match) return false;
  const token = decodeURIComponent(match[1]);
  return !!verify(token);
}

