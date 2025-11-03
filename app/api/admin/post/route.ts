import { NextResponse } from 'next/server';
import { postToX, postToXAdvanced, uploadMediaFromUrl } from '@/lib/x-api';
import { savePostHistory } from '@/lib/kv-storage';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = (body?.text || '').toString();
    const imageUrl = (body?.image_url || '').toString();
    let quoteId = (body?.quote_tweet_id || '').toString();
    // Accept full URL by extracting last path segment as ID
    if (quoteId && /https?:\/\//i.test(quoteId)) {
      const m = quoteId.match(/status\/(\d+)/) || quoteId.match(/status%2F(\d+)/);
      if (m) quoteId = m[1];
    }
    if (!text.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 });
    // If both quote and image are provided, prefer quote (X may not allow both together)
    if (quoteId) {
      const result = await postToXAdvanced({ text, quote_tweet_id: quoteId });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 502 });
      await savePostHistory({ text, postedAt: Date.now(), topicId: undefined });
      return NextResponse.json({ success: true, id: result.id });
    }

    if (imageUrl) {
      const media = await uploadMediaFromUrl(imageUrl);
      if (!media.success || !media.media_id) {
        return NextResponse.json({ success: false, error: media.error || 'media upload failed' }, { status: 502 });
      }
      const result = await postToXAdvanced({ text, media_ids: [media.media_id] });
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 502 });
      await savePostHistory({ text, postedAt: Date.now(), topicId: undefined });
      return NextResponse.json({ success: true, id: result.id });
    }

    const result = await postToX(text);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 502 });
    }
    await savePostHistory({ text, postedAt: Date.now(), topicId: undefined });
    return NextResponse.json({ success: true, id: result.id });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
