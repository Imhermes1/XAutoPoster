import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { postToX } from '@/lib/x-api';
import { savePostHistory } from '@/lib/kv-storage';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET() {
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
      return NextResponse.json(
        { error: 'Failed to fetch scheduled posts' },
        { status: 500 }
      );
    }

    const duePosts = duePostsData || [];
    console.log(`Found ${duePosts.length} posts due for posting`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      posts: [] as any[],
    };

    // Process each post
    for (const post of duePosts) {
      try {
        console.log(`Posting scheduled tweet: ${post.id}`);

        // Post to X
        const result = await postToX(post.post_text);

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

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Scheduled post processor failed:', error);
    return NextResponse.json(
      { error: 'Failed to process scheduled posts' },
      { status: 500 }
    );
  }
}
