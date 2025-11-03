import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if X API credentials are configured
    const hasXApiKey = !!process.env.X_API_KEY;
    const hasXApiSecret = !!process.env.X_API_SECRET;
    const hasXAccessToken = !!process.env.X_ACCESS_TOKEN;
    const hasXAccessTokenSecret = !!process.env.X_ACCESS_TOKEN_SECRET;

    const isAuthenticated = hasXApiKey && hasXApiSecret && hasXAccessToken && hasXAccessTokenSecret;

    // Extract username from access token if available (format: userid-token)
    let username = null;
    if (process.env.X_ACCESS_TOKEN) {
      // The access token format is typically: {user_id}-{token}
      // We can't get the username without making an API call, so we'll just show the user ID
      const userId = process.env.X_ACCESS_TOKEN.split('-')[0];
      username = `User ID: ${userId}`;
    }

    return NextResponse.json({
      authenticated: isAuthenticated,
      username,
      hasCredentials: {
        apiKey: hasXApiKey,
        apiSecret: hasXApiSecret,
        accessToken: hasXAccessToken,
        accessTokenSecret: hasXAccessTokenSecret,
      },
    });
  } catch (error) {
    console.error('Failed to check auth status:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Failed to check authentication status' },
      { status: 500 }
    );
  }
}
