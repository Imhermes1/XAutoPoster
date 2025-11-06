import Parser from 'rss-parser';
import { RSS_FEEDS, RSS_FEED_TIMEOUT_MS } from './constants';
import { getSupabase } from '@/lib/supabase';
import { getCircuitBreaker } from './circuit-breaker';

const parser = new Parser();

export interface FeedItem {
  title: string;
  link: string;
  pubDate?: string;
  contentSnippet?: string;
  source: string;
  imageUrl?: string;
}

async function fetchDbFeeds(): Promise<string[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('sources')
      .select('url')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((r: any) => r.url as string).filter(Boolean);
  } catch {
    return [];
  }
}

export async function fetchRecentNews(): Promise<FeedItem[]> {
  const circuitBreaker = getCircuitBreaker('rssFeeds');
  const allFeeds: FeedItem[] = [];
  const dbFeeds = await fetchDbFeeds();
  const feedUrls = dbFeeds.length
    ? dbFeeds
    : [
        ...RSS_FEEDS.ai,
        ...RSS_FEEDS.ios,
        ...RSS_FEEDS.android,
        ...RSS_FEEDS.coding,
        ...RSS_FEEDS.appDev,
      ];

  for (const feedUrl of feedUrls) {
    try {
      // Check if circuit breaker is open before attempting
      const metrics = circuitBreaker.getMetrics();
      if (metrics.state === 'OPEN') {
        console.warn(`[rss-fetcher] Circuit breaker is OPEN, skipping feeds until recovery`);
        break; // Stop trying feeds if circuit is open
      }

      const recentItems = await circuitBreaker.execute(async () => {
        // Wrap fetch in Promise.race with timeout
        const feedPromise = parser.parseURL(feedUrl);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Feed fetch timeout (${RSS_FEED_TIMEOUT_MS}ms)`)), RSS_FEED_TIMEOUT_MS)
        );

        const feed = await Promise.race([feedPromise, timeoutPromise]);
        return (feed as any).items
          .slice(0, 3)
          .map((item: any) => ({
            title: item.title || 'Untitled',
            link: item.link || '',
            pubDate: item.pubDate,
            contentSnippet: (item as any).contentSnippet || (item as any).content || '',
            source: (feed as any).title || 'Unknown Source',
            imageUrl: extractImage(item as any),
          }));
      });
      allFeeds.push(...recentItems);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`[rss-fetcher] Error fetching from ${feedUrl}: ${errorMsg}`);
      // Continue with next feed on error instead of failing entirely
    }
  }

  return allFeeds;
}

function extractImage(item: any): string | undefined {
  // enclosure
  if (item?.enclosure?.url && typeof item.enclosure.url === 'string') {
    const type = item.enclosure.type || '';
    if (!type || type.startsWith('image/')) return item.enclosure.url;
  }
  // content HTML
  const html = (item?.content || item?.['content:encoded'] || '') as string;
  if (typeof html === 'string') {
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match) return match[1];
  }
  return undefined;
}

export async function searchNewsForTopic(topic: string): Promise<FeedItem[]> {
  const allNews = await fetchRecentNews();
  return allNews.filter(
    (item) =>
      item.title.toLowerCase().includes(topic.toLowerCase()) ||
      (item.contentSnippet || '').toLowerCase().includes(topic.toLowerCase())
  );
}
