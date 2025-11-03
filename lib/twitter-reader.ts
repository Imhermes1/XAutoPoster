import { oauthFetch } from '@/lib/x-api';
import { addCandidateIfNew } from '@/lib/candidates';
import { getSupabase } from '@/lib/supabase';
import { startIngestionLog, completeIngestionLog, logActivity } from '@/lib/automation-logger';

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
  let totalFound = 0;
  let duplicates = 0;

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

    const logId = await startIngestionLog({
      source_type: 'account',
      source_id: acc.id,
      source_identifier: acc.handle,
    });

    try {
      const userId = acc.user_id || (await resolveUserId(acc.handle));
      if (!userId) {
        await completeIngestionLog(logId!, {
          status: 'failed',
          error_message: 'Could not resolve user ID',
        });
        continue;
      }

      if (!acc.user_id) await supabase.from('sources_accounts').update({ user_id: userId }).eq('id', acc.id);

      const payload = await fetchUserTweets(userId, 5);
      if (!payload) {
        await completeIngestionLog(logId!, {
          status: 'failed',
          error_message: 'Failed to fetch tweets',
        });
        continue;
      }

      const tweets = normalize(payload);
      let newCount = 0;
      let dupCount = 0;

      for (const tw of tweets) {
        const result = await addCandidateIfNew({
          type: 'tweet',
          source: acc.handle,
          external_id: tw.id,
          url: `https://x.com/${acc.handle.replace(/^@/, '')}/status/${tw.id}`,
          text: tw.text,
          image_url: tw.image_url,
        });
        if (result) {
          newCount++;
          inserted++;
        } else {
          dupCount++;
          duplicates++;
        }
      }

      totalFound += tweets.length;

      await completeIngestionLog(logId!, {
        status: 'completed',
        items_found: tweets.length,
        items_new: newCount,
        items_duplicate: dupCount,
      });
    } catch (error: any) {
      await completeIngestionLog(logId!, {
        status: 'failed',
        error_message: error.message,
      });
    }
  }

  // Keywords
  for (const kw of keyRes.data || []) {
    if (!kw.active) continue;

    const logId = await startIngestionLog({
      source_type: 'keyword',
      source_id: kw.id,
      source_identifier: kw.query,
    });

    try {
      const payload = await searchTweets(kw.query, 10);
      if (!payload) {
        await completeIngestionLog(logId!, {
          status: 'failed',
          error_message: 'Failed to search tweets',
        });
        continue;
      }

      const tweets = normalize(payload);
      let newCount = 0;
      let dupCount = 0;

      for (const tw of tweets) {
        const result = await addCandidateIfNew({
          type: 'tweet',
          source: kw.query,
          external_id: tw.id,
          url: `https://x.com/i/web/status/${tw.id}`,
          text: tw.text,
          image_url: tw.image_url,
        });
        if (result) {
          newCount++;
          inserted++;
        } else {
          dupCount++;
          duplicates++;
        }
      }

      totalFound += tweets.length;

      await completeIngestionLog(logId!, {
        status: 'completed',
        items_found: tweets.length,
        items_new: newCount,
        items_duplicate: dupCount,
      });
    } catch (error: any) {
      await completeIngestionLog(logId!, {
        status: 'failed',
        error_message: error.message,
      });
    }
  }

  // Log overall ingestion activity
  await logActivity({
    category: 'ingestion',
    severity: 'success',
    title: 'Ingestion Complete',
    description: `Processed ${totalFound} items: ${inserted} new, ${duplicates} duplicates`,
    metadata: { totalFound, inserted, duplicates },
  });

  return { inserted };
}

