import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const cookieState = req.cookies.get('x_oauth2_state')?.value;
  const verifier = req.cookies.get('x_oauth2_verifier')?.value;
  const redirectCookie = req.cookies.get('x_oauth2_redirect')?.value;

  if (!code || !state || !cookieState || state !== cookieState || !verifier) {
    return NextResponse.json({ error: 'invalid oauth state' }, { status: 400 });
  }

  const clientId = process.env.X_OAUTH_CLIENT_ID;
  const clientSecret = process.env.X_OAUTH_CLIENT_SECRET;
  const redirectUri = redirectCookie || `${url.protocol}//${url.host}/api/x/oauth2/callback`;
  if (!clientId) {
    return NextResponse.json({ error: 'Missing X_OAUTH_CLIENT_ID' }, { status: 500 });
  }

  const tokenUrl = 'https://api.x.com/2/oauth2/token';
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
    client_id: clientId,
  });
  if (clientSecret) params.set('client_secret', clientSecret);

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return NextResponse.json({ error: 'token exchange failed', detail: text }, { status: 500 });
  }

  const data = (await tokenRes.json()) as any;
  const access = data.access_token as string;
  const refresh = data.refresh_token as string | undefined;
  const expiresIn = (data.expires_in as number) || 7200;
  const scope = data.scope as string | undefined;

  const supabase = getSupabase();
  await supabase.from('automation_config').update({
    oauth2_access_token: access,
    oauth2_refresh_token: refresh || null,
    oauth2_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    oauth2_scope: scope || null,
    updated_at: new Date().toISOString(),
  }).neq('id', '00000000-0000-0000-0000-000000000000');

  const res = NextResponse.redirect('/');
  res.cookies.delete('x_oauth2_state');
  res.cookies.delete('x_oauth2_verifier');
  res.cookies.delete('x_oauth2_redirect');
  return res;
}

