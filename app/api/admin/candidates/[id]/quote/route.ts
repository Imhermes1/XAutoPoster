import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { generateQuoteTweetComment } from '@/lib/content-generator';
import { markCandidateUsed } from '@/lib/candidates';
import { postToXAdvanced } from '@/lib/x-api';
import { savePostHistory } from '@/lib/kv-storage';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    let comment = (body?.comment || '').toString();
    const supabase = getSupabase();
    const { data, error } = await supabase.from('candidates').select('id, external_id, text, url').eq('id', params.id).single();
    if (error || !data) return NextResponse.json({ error: 'candidate not found' }, { status: 404 });

    // Generate AI comment if not provided
    if (!comment) {
      comment = await generateQuoteTweetComment(data.text || '');
    }

    const result = await postToXAdvanced({ text: comment, quote_tweet_id: data.external_id });
    if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 502 });
    await markCandidateUsed(params.id);
    await savePostHistory({ text: comment, postedAt: Date.now(), topicId: undefined, quoteTweetId: data.external_id });
    return NextResponse.json({ success: true, id: result.id });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

