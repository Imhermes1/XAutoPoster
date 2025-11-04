import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generatePost } from '@/lib/content-generator';
import { uploadMediaFromUrl } from '@/lib/x-api';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const { topic, count, model, scheduled_times, save_as_draft, image_url, custom_instructions } = await request.json();

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

    // Upload image if provided (once for all posts)
    let mediaId: string | null = null;
    if (image_url && typeof image_url === 'string' && image_url.trim()) {
      try {
        console.log('Uploading image for batch:', image_url);
        const mediaUpload = await uploadMediaFromUrl(image_url);
        if (mediaUpload.success && mediaUpload.media_id) {
          mediaId = mediaUpload.media_id;
          console.log('Image uploaded successfully, media_id:', mediaId);
        } else {
          console.warn('Image upload failed:', mediaUpload.error);
          // Continue without image - don't fail the entire batch
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        // Continue without image - don't fail the entire batch
      }
    }

    // Generate posts
    for (let i = 0; i < count; i++) {
      try {
        const post = await generatePost(topic, undefined, custom_instructions);

        // Skip empty posts
        if (!post || post.trim().length === 0) {
          console.log(`Skipping empty post ${i + 1}`);
          continue;
        }

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

        // Add media_ids if image was uploaded
        if (mediaId) {
          postData.media_ids = [mediaId];
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
