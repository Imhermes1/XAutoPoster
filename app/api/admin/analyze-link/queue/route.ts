import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { uploadMediaFromUrl } from '@/lib/x-api';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: Request) {
  try {
    const { tweets, url, image_url } = await req.json();

    if (!tweets || !Array.isArray(tweets) || tweets.length === 0) {
      return NextResponse.json(
        { error: 'No tweets provided' },
        { status: 400 }
      );
    }

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Upload image if provided
    let mediaIds: string[] = [];
    if (image_url) {
      const media = await uploadMediaFromUrl(image_url);
      if (media.success && media.media_id) {
        mediaIds = [media.media_id];
      }
    }

    const batchId = crypto.randomUUID();
    const postsToInsert = tweets.map((text) => ({
      batch_id: batchId,
      post_text: text,
      link_url: url,
      status: 'draft',
      created_at: new Date().toISOString(),
      ...(mediaIds.length > 0 && { media_ids: mediaIds }),
    }));

    const { data, error } = await supabase
      .from('bulk_post_queue')
      .insert(postsToInsert)
      .select();

    if (error) {
      console.error('[analyze-link-queue] Insert error:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      batch_id: batchId,
      tweets_queued: tweets.length,
      posts: data,
    });
  } catch (error: any) {
    console.error('[analyze-link-queue] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to queue tweets' },
      { status: 500 }
    );
  }
}
