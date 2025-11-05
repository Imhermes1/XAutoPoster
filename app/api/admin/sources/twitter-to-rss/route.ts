import { NextRequest, NextResponse } from 'next/server';

/**
 * Converts a Twitter username to a Nitter RSS feed URL
 * This allows users to add Twitter profiles as RSS feeds without needing API access
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'username required' },
        { status: 400 }
      );
    }

    // Clean up username (remove @ if present)
    const cleanUsername = username.replace(/^@/, '').trim();

    if (!cleanUsername) {
      return NextResponse.json(
        { error: 'invalid username' },
        { status: 400 }
      );
    }

    // Validate username format (alphanumeric, underscores, only)
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return NextResponse.json(
        { error: 'invalid username format' },
        { status: 400 }
      );
    }

    // Create Nitter RSS feed URL
    // Using nitter.net as the primary instance
    const rssUrl = `https://nitter.net/${cleanUsername}/rss`;

    // Optionally verify the feed works (optional - can be slow)
    // const feedCheck = await fetch(rssUrl, { method: 'HEAD' }).catch(() => null);
    // if (!feedCheck?.ok) {
    //   return NextResponse.json(
    //     { error: 'Feed not found - username may not exist or Nitter may be down' },
    //     { status: 404 }
    //   );
    // }

    return NextResponse.json({
      success: true,
      username: cleanUsername,
      rssUrl,
      source: 'nitter.net',
      note: 'This RSS feed fetches tweets from the specified Twitter profile'
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // GET endpoint for testing - returns example
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({
      example: {
        request: { username: 'elonmusk' },
        response: {
          username: 'elonmusk',
          rssUrl: 'https://nitter.net/elonmusk/rss',
          source: 'nitter.net'
        }
      },
      usage: 'POST with { "username": "twitter_handle" }'
    });
  }

  // If username provided as query param, convert it
  const cleanUsername = username.replace(/^@/, '').trim();
  const rssUrl = `https://nitter.net/${cleanUsername}/rss`;

  return NextResponse.json({
    success: true,
    username: cleanUsername,
    rssUrl,
    source: 'nitter.net'
  });
}
