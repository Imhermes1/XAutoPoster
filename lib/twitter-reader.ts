import { oauthFetch } from '@/lib/x-api';
import { addCandidateIfNew } from '@/lib/candidates';
import { getSupabase } from '@/lib/supabase';
import { startIngestionLog, completeIngestionLog, logActivity } from '@/lib/automation-logger';
import { fetchRecentNews } from '@/lib/rss-fetcher';

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
    'tweet.fields': 'created_at,public_metrics',
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
    'tweet.fields': 'created_at,public_metrics',
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
    supabase.from('sources_accounts').select('id, handle, user_id, active, last_fetched_at'),
    supabase.from('sources_keywords').select('id, query, active, last_fetched_at'),
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
      likes_count: t.public_metrics?.like_count || 0,
      retweets_count: t.public_metrics?.retweet_count || 0,
      replies_count: t.public_metrics?.reply_count || 0,
    }));
  };

  // Accounts
  for (const acc of accRes.data || []) {
    if (!acc.active) continue;

    // Skip if fetched recently (within last 24 hours to conserve API calls for free tier)
    if (acc.last_fetched_at) {
      const lastFetch = new Date(acc.last_fetched_at).getTime();
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      if (lastFetch > twentyFourHoursAgo) {
        console.log(`Skipping ${acc.handle} - fetched recently`);
        continue;
      }
    }

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
          likes_count: tw.likes_count,
          retweets_count: tw.retweets_count,
          replies_count: tw.replies_count,
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
    } finally {
      // Always update last_fetched_at timestamp (even on failure) to throttle API calls
      await supabase.from('sources_accounts').update({ last_fetched_at: new Date().toISOString() }).eq('id', acc.id);
    }
  }

  // Keywords
  for (const kw of keyRes.data || []) {
    if (!kw.active) continue;

    // Skip if fetched recently (within last 24 hours to conserve API calls for free tier)
    if (kw.last_fetched_at) {
      const lastFetch = new Date(kw.last_fetched_at).getTime();
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      if (lastFetch > twentyFourHoursAgo) {
        console.log(`Skipping keyword "${kw.query}" - fetched recently`);
        continue;
      }
    }

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
          likes_count: tw.likes_count,
          retweets_count: tw.retweets_count,
          replies_count: tw.replies_count,
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
    } finally {
      // Always update last_fetched_at timestamp (even on failure) to throttle API calls
      await supabase.from('sources_keywords').update({ last_fetched_at: new Date().toISOString() }).eq('id', kw.id);
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

export async function ingestFromRSSFeeds(): Promise<{ inserted: number }> {
  const supabase = getSupabase();
  let inserted = 0;
  let totalFound = 0;
  let duplicates = 0;

  const logId = await startIngestionLog({
    source_type: 'rss',
    source_id: 'batch',
    source_identifier: 'RSS Feeds',
  });

  try {
    // Fetch recent news from all configured RSS feeds
    const newsItems = await fetchRecentNews();
    totalFound = newsItems.length;
    console.log(`[ingestFromRSSFeeds] Fetched ${totalFound} items from RSS feeds`);

    if (totalFound === 0) {
      await completeIngestionLog(logId!, {
        status: 'completed',
        items_found: 0,
        items_new: 0,
        items_duplicate: 0,
      });
      return { inserted };
    }

    // Add each item as a candidate if it's new
    for (const item of newsItems) {
      const result = await addCandidateIfNew({
        type: 'rss',
        source: item.source,
        external_id: item.link, // Use URL as unique identifier
        url: item.link,
        title: item.title,
        text: item.contentSnippet || '',
        image_url: item.imageUrl,
      });

      if (result) {
        inserted++;
      } else {
        duplicates++;
      }
    }

    console.log(`[ingestFromRSSFeeds] Added ${inserted} new items, ${duplicates} duplicates`);

    await completeIngestionLog(logId!, {
      status: 'completed',
      items_found: totalFound,
      items_new: inserted,
      items_duplicate: duplicates,
    });
  } catch (error: any) {
    console.error('[ingestFromRSSFeeds] Error:', error);
    await completeIngestionLog(logId!, {
      status: 'failed',
      error_message: error.message,
    });
  }

  return { inserted };
}

