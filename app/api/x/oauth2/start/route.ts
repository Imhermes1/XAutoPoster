import { NextRequest, NextResponse } from 'next/server';

function base64url(input: Uint8Array) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function GET(req: NextRequest) {
  const clientId = process.env.X_OAUTH_CLIENT_ID;
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || '').trim();
  const redirectUri = base ? `${base}/api/x/oauth2/callback` : `${origin}/api/x/oauth2/callback`;

  if (!clientId) {
    return NextResponse.json({ error: 'Missing X_OAUTH_CLIENT_ID' }, { status: 500 });
  }

  // PKCE values
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const encoder = new TextEncoder();
  const challengeBytes = await crypto.subtle.digest('SHA-256', encoder.encode(verifier));
  const challenge = base64url(new Uint8Array(challengeBytes));

  const state = base64url(crypto.getRandomValues(new Uint8Array(16)));

  const authUrl = new URL('https://x.com/i/oauth2/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'tweet.read tweet.write users.read offline.access');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set('x_oauth2_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600 });
  res.cookies.set('x_oauth2_verifier', verifier, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600 });
  res.cookies.set('x_oauth2_redirect', redirectUri, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600 });
  return res;
}
