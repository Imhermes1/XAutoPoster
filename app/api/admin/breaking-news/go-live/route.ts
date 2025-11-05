import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { uploadMediaFromUrl, postToXAdvanced } from '@/lib/x-api';

interface GeneratedTweet {
  id: string;
  text: string;
  imageUrl?: string;
  order: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tweets } = body;

    if (!tweets || !Array.isArray(tweets) || tweets.length === 0) {
      return NextResponse.json({ error: 'No tweets provided' }, { status: 400 });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const now = new Date();
    const results: any[] = [];

    // Sort tweets by order
    const sortedTweets: GeneratedTweet[] = [...tweets].sort((a, b) => a.order - b.order);

    // First tweet posts immediately, rest schedule every 15 minutes
    for (let i = 0; i < sortedTweets.length; i++) {
      const tweet = sortedTweets[i];
      const isFirst = i === 0;

      // Calculate scheduled time: first tweet = now, subsequent tweets = +15 minutes each
      const scheduledFor = new Date(now.getTime() + (i * 15 * 60 * 1000));

      // For first tweet, post immediately
      if (isFirst) {
        try {
          // Upload media if present
          let mediaIds: string[] = [];
          if (tweet.imageUrl) {
            const uploadResult = await uploadMediaFromUrl(tweet.imageUrl);
            if (uploadResult.success && uploadResult.media_id) {
              mediaIds.push(uploadResult.media_id);
            } else {
              console.warn('[breaking-news-go-live] Failed to upload image for first tweet:', uploadResult.error);
            }
          }

          // Post to X immediately
          const postResult = await postToXAdvanced({
            text: tweet.text,
            media_ids: mediaIds.length > 0 ? mediaIds : undefined,
          });

          if (postResult.success) {
            // Add to queue as 'posted'
            await supabase.from('bulk_post_queue').insert({
              text: tweet.text,
              media_url: tweet.imageUrl || null,
              status: 'posted',
              scheduled_for: scheduledFor.toISOString(),
              posted_at: now.toISOString(),
              x_tweet_id: postResult.id || null,
              metadata: { breaking_news: true, order: i },
            });

            results.push({
              order: i,
              status: 'posted',
              tweetId: postResult.id,
              scheduledFor: scheduledFor.toISOString(),
            });

            console.log('[breaking-news-go-live] Posted tweet immediately:', postResult.id);
          } else {
            throw new Error(postResult.error || 'Failed to post tweet');
          }
        } catch (error) {
          console.error('[breaking-news-go-live] Error posting first tweet:', error);
          // If first tweet fails, still add to queue as pending
          await supabase.from('bulk_post_queue').insert({
            text: tweet.text,
            media_url: tweet.imageUrl || null,
            status: 'pending',
            scheduled_for: scheduledFor.toISOString(),
            metadata: { breaking_news: true, order: i, error: String(error) },
          });

          results.push({
            order: i,
            status: 'error',
            error: String(error),
            scheduledFor: scheduledFor.toISOString(),
          });
        }
      } else {
        // Subsequent tweets: add to queue as 'pending' with scheduled_for
        await supabase.from('bulk_post_queue').insert({
          text: tweet.text,
          media_url: tweet.imageUrl || null,
          status: 'pending',
          scheduled_for: scheduledFor.toISOString(),
          metadata: { breaking_news: true, order: i },
        });

        results.push({
          order: i,
          status: 'scheduled',
          scheduledFor: scheduledFor.toISOString(),
        });

        console.log('[breaking-news-go-live] Scheduled tweet', i + 1, 'for', scheduledFor.toISOString());
      }
    }

    console.log('[breaking-news-go-live] Complete:', results.length, 'tweets processed');

    return NextResponse.json({
      success: true,
      results,
      message: `First tweet posted immediately. ${sortedTweets.length - 1} tweets scheduled every 15 minutes.`,
    });

  } catch (error) {
    console.error('[breaking-news-go-live] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to publish breaking news tweets'
    }, { status: 500 });
  }
}
