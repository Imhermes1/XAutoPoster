import { createClient } from '@supabase/supabase-js';
import { postToX, postToXAdvanced } from '@/lib/x-api';
import { savePostHistory } from '@/lib/kv-storage';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface ProcessedPost {
  id: string;
  status: 'posted' | 'failed';
  x_post_id?: string;
  error?: string;
}

export interface ProcessScheduledPostsResult {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  posts: ProcessedPost[];
  timestamp: string;
  error?: string;
}

/**
 * Processes all scheduled posts that are due to be posted
 * Fetches pending posts with scheduled_for time <= now
 * Posts each to X, saves history, and updates status
 */
export async function processScheduledPosts(): Promise<ProcessScheduledPostsResult> {
  try {
    const now = new Date().toISOString();

    // Fetch all pending posts that are due to be posted
    const { data: duePostsData, error: fetchError } = await supabase
      .from('bulk_post_queue')
      .select('*')
      .eq('status', 'pending')
      .not('scheduled_for', 'is', null)
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true });

    if (fetchError) {
      console.error('Failed to fetch scheduled posts:', fetchError);
      return {
        success: false,
        processed: 0,
        succeeded: 0,
        failed: 0,
        posts: [],
        timestamp: new Date().toISOString(),
        error: 'Failed to fetch scheduled posts',
      };
    }

    const duePosts = duePostsData || [];
    console.log(`Found ${duePosts.length} posts due for posting`);

    const results: ProcessScheduledPostsResult = {
      success: true,
      processed: 0,
      succeeded: 0,
      failed: 0,
      posts: [],
      timestamp: new Date().toISOString(),
    };

    // Process each post
    for (const post of duePosts) {
      try {
        console.log(`Posting scheduled tweet: ${post.id}`);

        // Post to X (with media if available)
        let result;
        if (post.media_ids && post.media_ids.length > 0) {
          console.log(`Posting with ${post.media_ids.length} media attachment(s)`);
          result = await postToXAdvanced({
            text: post.post_text,
            media_ids: post.media_ids,
          });
        } else {
          result = await postToX(post.post_text);
        }

        if (result.success) {
          // Update post status to posted
          const { error: updateError } = await supabase
            .from('bulk_post_queue')
            .update({
              status: 'posted',
              posted_at: new Date().toISOString(),
              x_post_id: result.id,
            })
            .eq('id', post.id);

          if (updateError) {
            console.error(`Failed to update post ${post.id}:`, updateError);
          }

          // Save to post history
          await savePostHistory({
            text: post.post_text,
            postedAt: Date.now(),
            topicId: undefined,
          });

          results.succeeded++;
          results.posts.push({
            id: post.id,
            status: 'posted',
            x_post_id: result.id,
          });

          console.log(`Successfully posted: ${post.id} -> ${result.id}`);
        } else {
          // Update post status to failed
          const { error: updateError } = await supabase
            .from('bulk_post_queue')
            .update({
              status: 'failed',
              error_message: result.error || 'Unknown error',
            })
            .eq('id', post.id);

          if (updateError) {
            console.error(`Failed to update post ${post.id}:`, updateError);
          }

          results.failed++;
          results.posts.push({
            id: post.id,
            status: 'failed',
            error: result.error,
          });

          console.error(`Failed to post: ${post.id} - ${result.error}`);
        }

        results.processed++;

        // Small delay between posts to avoid rate limiting
        if (duePosts.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error);

        // Update post status to failed
        await supabase
          .from('bulk_post_queue')
          .update({
            status: 'failed',
            error_message: String(error),
          })
          .eq('id', post.id);

        results.failed++;
        results.posts.push({
          id: post.id,
          status: 'failed',
          error: String(error),
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Scheduled post processor failed:', error);
    return {
      success: false,
      processed: 0,
      succeeded: 0,
      failed: 0,
      posts: [],
      timestamp: new Date().toISOString(),
      error: 'Failed to process scheduled posts',
    };
  }
}
