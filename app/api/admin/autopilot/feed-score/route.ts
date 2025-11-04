import { NextRequest, NextResponse } from 'next/server';
import { scoreFeedContent } from '@/lib/smart-autopilot';
import { isAdminAuthorized } from '@/lib/auth';

/**
 * POST /api/admin/autopilot/feed-score
 * Score a piece of content for quality before auto-posting
 */
export async function POST(request: NextRequest) {
  try {
    const cookies = request.headers.get('cookie');
    if (!isAdminAuthorized(cookies)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, source, pubDate } = await request.json();

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description required' },
        { status: 400 }
      );
    }

    const result = await scoreFeedContent({
      title,
      description,
      source,
      pubDate: pubDate ? new Date(pubDate) : undefined,
    });

    return NextResponse.json({
      score: result.score,
      quality: result.quality,
      reasoning: result.reasoning,
      shouldAutoPost: result.score >= 60, // Auto-post if score >= 60
    });
  } catch (error) {
    console.error('Error scoring feed content:', error);
    return NextResponse.json(
      { error: 'Failed to score content' },
      { status: 500 }
    );
  }
}
