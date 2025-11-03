import { oauthFetch } from '@/lib/x-api';
import { addCandidateIfNew } from '@/lib/candidates';
import { getSupabase } from '@/lib/supabase';

export async function resolveUserId(handle: string): Promise<string | null> {
  const username = handle.replace(/^@/, '');
  const url = `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}`;
  const res = await oauthFetch(url, 'GET');
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data?.id || null;
}

export async function fetchUserTweets(userId: string, max = 5) {
  const params = new URLSearchParams({
    max_results: String(Math.min(max, 100)),
    expansions: 'attachments.media_keys',
    'media.fields': 'url,preview_image_url',
    'tweet.fields': 'created_at',
  });
  const url = `https://api.x.com/2/users/${userId}/tweets?${params.toString()}`;
  const res = await oauthFetch(url, 'GET');
  if (!res.ok) return null;
  return res.json();
}

export async function searchTweets(query: string, max = 10) {
  const params = new URLSearchParams({
    query,
    max_results: String(Math.min(max, 100)),
    expansions: 'attachments.media_keys',
    'media.fields': 'url,preview_image_url',
    'tweet.fields': 'created_at',
  });
  const url = `https://api.x.com/2/tweets/search/recent?${params.toString()}`;
  const res = await oauthFetch(url, 'GET');
  if (!res.ok) return null;
  return res.json();
}

export async function ingestFromAccountsAndKeywords(): Promise<{ inserted: number }> {
  const supabase = getSupabase();
  let inserted = 0;
  const [accRes, keyRes] = await Promise.all([
    supabase.from('sources_accounts').select('id, handle, user_id, active'),
    supabase.from('sources_keywords').select('id, query, active'),
  ]);
  const mediaUrlByKey: Record<string, string | undefined> = {};

  // Helper to normalize result set
  const normalize = (payload: any) => {
    const media = (payload.includes?.media || []) as any[];
    for (const m of media) {
      if (m.media_key) mediaUrlByKey[m.media_key] = m.url || m.preview_image_url;
    }
    const data = payload.data || [];
    return data.map((t: any) => ({
      id: t.id as string,
      text: t.text as string,
      image_url: (t.attachments?.media_keys || []).map((k: string) => mediaUrlByKey[k]).find(Boolean),
    }));
  };

  // Accounts
  for (const acc of accRes.data || []) {
    if (!acc.active) continue;
    const userId = acc.user_id || (await resolveUserId(acc.handle));
    if (!userId) continue;
    if (!acc.user_id) await supabase.from('sources_accounts').update({ user_id: userId }).eq('id', acc.id);
    const payload = await fetchUserTweets(userId, 5);
    if (!payload) continue;
    const tweets = normalize(payload);
    for (const tw of tweets) {
      await addCandidateIfNew({
        type: 'tweet',
        source: acc.handle,
        external_id: tw.id,
        url: `https://x.com/${acc.handle.replace(/^@/, '')}/status/${tw.id}`,
        text: tw.text,
        image_url: tw.image_url,
      });
      inserted++;
    }
  }

  // Keywords
  for (const kw of keyRes.data || []) {
    if (!kw.active) continue;
    const payload = await searchTweets(kw.query, 10);
    if (!payload) continue;
    const tweets = normalize(payload);
    for (const tw of tweets) {
      await addCandidateIfNew({
        type: 'tweet',
        source: kw.query,
        external_id: tw.id,
        url: `https://x.com/i/web/status/${tw.id}`,
        text: tw.text,
        image_url: tw.image_url,
      });
      inserted++;
    }
  }

  return { inserted };
}

