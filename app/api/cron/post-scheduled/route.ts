import { NextResponse } from 'next/server';
import { postToX } from '@/lib/x-api';
import { getSupabase } from '@/lib/supabase';
import { logActivity } from '@/lib/automation-logger';

/**
 * Post scheduled tweets from bulk_post_queue
 * Called by GitHub Actions or Vercel cron
 */
export async function GET(req: Request) {
  return handlePostScheduled(req);
}

export async function POST(req: Request) {
  return handlePostScheduled(req);
}

async function handlePostScheduled(req: Request) {
  const supabase = getSupabase();
  let postsCreated = 0;
  let errors = 0;

  try {
    // Get current time
    const now = new Date();
    console.log(`[post-scheduled] Checking for scheduled tweets at ${now.toISOString()}`);

    // Get tweets that should be posted now
    // scheduled_for should be in the past and status should be 'pending'
    const { data: scheduledTweets, error: queryError } = await supabase
      .from('bulk_post_queue')
      .select('id, post_text, scheduled_for, batch_id')
      .eq('status', 'pending')
      .lte('scheduled_for', now.toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(5); // Post max 5 at a time

    if (queryError) {
      console.error('[post-scheduled] Query error:', queryError);
      return NextResponse.json({ error: 'Query failed', details: queryError }, { status: 500 });
    }

    if (!scheduledTweets || scheduledTweets.length === 0) {
      console.log('[post-scheduled] No scheduled tweets ready to post');
      return NextResponse.json({
        success: true,
        message: 'No tweets ready to post',
        posted: 0,
        errors: 0
      });
    }

    console.log(`[post-scheduled] Found ${scheduledTweets.length} tweets ready to post`);

    // Post each tweet
    for (const tweet of scheduledTweets) {
      try {
        console.log(`[post-scheduled] Posting tweet ${tweet.id}: "${tweet.post_text.substring(0, 50)}..."`);

        // Post to X
        const result = await postToX(tweet.post_text);

        if (result.success) {
          console.log(`[post-scheduled] Successfully posted tweet ${tweet.id} to X as ${result.id}`);

          // Update status to posted and add X post ID if field exists
          const updatePayload: any = { status: 'posted' };

          // Try to add optional fields if they exist in schema
          if (result.id) {
            updatePayload.x_post_id = result.id;
          }
          updatePayload.posted_at = new Date().toISOString();

          const { error: updateError } = await supabase
            .from('bulk_post_queue')
            .update(updatePayload)
            .eq('id', tweet.id);

          if (updateError) {
            console.error(`[post-scheduled] Failed to update tweet ${tweet.id}:`, updateError);
            errors++;
          } else {
            postsCreated++;

            // Log activity
            await logActivity({
              category: 'posting',
              severity: 'success',
              title: 'Tweet Posted',
              description: `Posted tweet: "${tweet.post_text.substring(0, 100)}..."`,
              metadata: {
                tweet_id: tweet.id,
                batch_id: tweet.batch_id,
                x_post_id: result.id
              }
            });
          }
        } else {
          console.error(`[post-scheduled] Failed to post tweet ${tweet.id}:`, result.error);
          errors++;

          // Log activity
          await logActivity({
            category: 'posting',
            severity: 'error',
            title: 'Tweet Post Failed',
            description: `Failed to post tweet: ${result.error}`,
            metadata: {
              tweet_id: tweet.id,
              error: result.error
            }
          });
        }
      } catch (err: any) {
        console.error(`[post-scheduled] Exception posting tweet ${tweet.id}:`, err);
        errors++;
      }
    }

    const response = {
      success: true,
      posted: postsCreated,
      failed: errors,
      total_processed: scheduledTweets.length,
      message: `Posted ${postsCreated} tweets, ${errors} failed`
    };

    console.log(`[post-scheduled] Completed:`, response);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[post-scheduled] Fatal error:', error);
    return NextResponse.json(
      { error: 'Fatal error', details: error.message },
      { status: 500 }
    );
  }
}
