import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generatePost } from '@/lib/content-generator';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const { topic, count, model, scheduled_times, save_as_draft } = await request.json();

    if (!topic || count < 1 || count > 20) {
      return NextResponse.json(
        { error: 'Invalid topic or count (1-20)' },
        { status: 400 }
      );
    }

    // Validate scheduled_times if provided
    if (scheduled_times && (!Array.isArray(scheduled_times) || scheduled_times.length !== count)) {
      return NextResponse.json(
        { error: 'scheduled_times must be an array matching count' },
        { status: 400 }
      );
    }

    const batchId = crypto.randomUUID();
    const posts = [];

    // Determine status: draft, pending, or default (pending)
    const status = save_as_draft ? 'draft' : 'pending';

    // Generate posts
    for (let i = 0; i < count; i++) {
      try {
        const post = await generatePost(topic);
        const postData: any = {
          batch_id: batchId,
          post_text: post,
          status: status,
          created_at: new Date().toISOString(),
        };

        // Add scheduled_for if times provided and not saving as draft
        if (scheduled_times && scheduled_times[i] && !save_as_draft) {
          postData.scheduled_for = new Date(scheduled_times[i]).toISOString();
        }

        posts.push(postData);

        // Small delay between generations to avoid rate limits
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Failed to generate post ${i + 1}:`, error);
        posts.push({
          batch_id: batchId,
          post_text: `[Failed to generate post ${i + 1}]`,
          status: 'failed',
          error_message: String(error),
          created_at: new Date().toISOString(),
        });
      }
    }

    // Insert posts into queue
    const { data, error } = await supabase
      .from('bulk_post_queue')
      .insert(posts)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      batch_id: batchId,
      posts_generated: count,
      posts: data,
    });
  } catch (error) {
    console.error('Bulk generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate posts' },
      { status: 500 }
    );
  }
}
