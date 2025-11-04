import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/auth';

/**
 * Manual endpoint to generate and queue posts for review
 * Call this to generate draft posts that you can review and tweak before they're posted
 *
 * Example: POST /api/admin/generate-posts with body: { count: 3 }
 */
export async function POST(req: Request) {
  try {
    // Check auth
    const cookies = req.headers.get('cookie');
    if (!isAdminAuthorized(cookies)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { count = 3 } = await req.json().catch(() => ({}));
    const numPosts = Math.min(Math.max(1, count), 10); // 1-10 posts

    // Call the cron/post endpoint directly to generate posts
    // This triggers the same logic as the automated posting but without the timing check
    const postReq = new Request('http://localhost/api/cron/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`,
      },
      body: JSON.stringify({ manual: true, count: numPosts }),
    });

    // Import the POST handler from cron/post
    const { POST: postHandler } = await import('../../../api/cron/post/route');
    const response = await postHandler(postReq);
    const result = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: `Generated ${result.posts_created || 0} draft posts. Check your Queue tab to review and publish!`,
        details: result,
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to generate posts' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[generate-posts]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate posts' },
      { status: 500 }
    );
  }
}
