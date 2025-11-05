import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';

export async function GET() {
  try {
    const apiKey = process.env.X_API_KEY;
    const apiSecret = process.env.X_API_SECRET;
    const accessToken = process.env.X_ACCESS_TOKEN;
    const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
      return NextResponse.json({
        success: false,
        error: 'Missing credentials'
      }, { status: 400 });
    }

    // Test by verifying credentials with X API
    const url = 'https://api.x.com/2/users/me';

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: apiKey,
      oauth_token: accessToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_version: '1.0',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: Math.random().toString(36).substring(2, 15),
    };

    const paramString = Object.entries(oauthParams)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    const baseString = [
      'GET',
      encodeURIComponent(url),
      encodeURIComponent(paramString),
    ].join('&');

    const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessTokenSecret)}`;
    const signature = createHmac('sha1', signingKey).update(baseString).digest('base64');
    (oauthParams as any).oauth_signature = signature;

    const authHeader = 'OAuth ' + Object.entries(oauthParams)
      .map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
      .join(', ');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `X API returned ${response.status}`,
        details: data,
        message: 'Your X API tokens may be invalid or expired. Please regenerate them in the X Developer Portal.'
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      user: data.data,
      message: 'X API credentials are valid!'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
