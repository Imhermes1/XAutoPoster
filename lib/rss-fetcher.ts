import Parser from 'rss-parser';
import { RSS_FEEDS } from './constants';

const parser = new Parser();

export interface FeedItem {
  title: string;
  link: string;
  pubDate?: string;
  contentSnippet?: string;
  source: string;
}

export async function fetchRecentNews(): Promise<FeedItem[]> {
  const allFeeds: FeedItem[] = [];

  const feedUrls = [
    ...RSS_FEEDS.ai,
    ...RSS_FEEDS.ios,
    ...RSS_FEEDS.android,
    ...RSS_FEEDS.coding,
    ...RSS_FEEDS.appDev,
  ];

  for (const feedUrl of feedUrls) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const recentItems = feed.items
        .slice(0, 3)
        .map((item) => ({
          title: item.title || 'Untitled',
          link: item.link || '',
          pubDate: item.pubDate,
          contentSnippet: (item as any).contentSnippet || (item as any).content || '',
          source: feed.title || 'Unknown Source',
        }));
      allFeeds.push(...recentItems);
    } catch (error) {
      console.error(`Error fetching from ${feedUrl}:`, error);
    }
  }

  return allFeeds;
}

export async function searchNewsForTopic(topic: string): Promise<FeedItem[]> {
  const allNews = await fetchRecentNews();
  return allNews.filter(
    (item) =>
      item.title.toLowerCase().includes(topic.toLowerCase()) ||
      (item.contentSnippet || '').toLowerCase().includes(topic.toLowerCase())
  );
}

