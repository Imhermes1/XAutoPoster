import { NextResponse } from 'next/server';
import { DAILY_POST_LIMIT } from '@/lib/constants';
import { fetchRecentNews } from '@/lib/rss-fetcher';
import { generatePost } from '@/lib/content-generator';
import { postToX, postToXAdvanced, uploadMediaFromUrl } from '@/lib/x-api';
import { getPostCount, getUnusedManualTopics, markTopicAsUsed, savePostHistory } from '@/lib/kv-storage';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

async function getAutomationConfig() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return null;
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('automation_config')
      .select('*')
      .single();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  return handlePost(req);
}

export async function POST(req: Request) {
  return handlePost(req);
}

async function handlePost(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.get('authorization') || '';
      const expected = `Bearer ${secret}`;
      if (auth !== expected) {
        return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
      }
    }

    // Check if automation is enabled
    const config = await getAutomationConfig();
    if (config && !config.enabled) {
      return NextResponse.json({ skipped: true, reason: 'automation disabled' });
    }

    // Use dynamic limit from config, fallback to env/default
    const dailyLimit = config?.daily_limit || DAILY_POST_LIMIT;
    const count = await getPostCount(1);
    if (count >= dailyLimit) {
      return NextResponse.json({ skipped: true, reason: 'daily limit reached', count });
    }

    let topicText: string | null = null;
    let manualId: string | undefined;

    const manual = await getUnusedManualTopics();
    if (manual.length > 0) {
      const t = manual[Math.floor(Math.random() * manual.length)];
      topicText = t.topic;
      manualId = t.id;
    } else {
      const news = await fetchRecentNews();
      if (news.length > 0) {
        const item = news[Math.floor(Math.random() * news.length)];
        topicText = `${item.title} — ${item.source} ${item.link}`.trim();
        // If RSS provides image, try to upload and attach
        if (item.imageUrl) {
          const media = await uploadMediaFromUrl(item.imageUrl);
          if (media.success && media.media_id) {
            const post = await generatePost(topicText!);
            const result = await postToXAdvanced({ text: post, media_ids: [media.media_id] });
            if (!result.success) {
              return NextResponse.json({ success: false, error: result.error }, { status: 500 });
            }
            await savePostHistory({ text: post, postedAt: Date.now(), topicId: manualId });
            if (manualId) await markTopicAsUsed(manualId);
            return NextResponse.json({ success: true, id: result.id, text: post, media: true });
          }
        }
      } else {
        topicText = 'Latest trends in AI, app dev, iOS, Android, and coding';
      }
    }

    const post = await generatePost(topicText!);
    const result = await postToX(post);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    await savePostHistory({ text: post, postedAt: Date.now(), topicId: manualId });
    if (manualId) await markTopicAsUsed(manualId);

    return NextResponse.json({ success: true, id: result.id, text: post });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
