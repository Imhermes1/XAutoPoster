import { NextResponse } from 'next/server';
import { DAILY_POST_LIMIT } from '@/lib/constants';
import { fetchRecentNews } from '@/lib/rss-fetcher';
import { generatePost } from '@/lib/content-generator';
import { postToX } from '@/lib/x-api';
import { getPostCount, getUnusedManualTopics, markTopicAsUsed, savePostHistory } from '@/lib/kv-storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handlePost();
}

export async function POST() {
  return handlePost();
}

async function handlePost() {
  try {
    const count = await getPostCount(1);
    if (count >= DAILY_POST_LIMIT) {
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

