export const RSS_FEEDS = {
  ai: [
    'https://openai.com/blog/rss/',
    'https://ai.googleblog.com/feeds/posts/default',
    'https://www.technologyreview.com/feed/',
    'https://lastweekin.ai/feed',
    'https://www.interconnects.ai/feed',
    'https://blog.langchain.dev/rss/',
    'https://www.kdnuggets.com/feed',
  ],
  ios: [
    'https://developer.apple.com/news/rss/rss-all.xml',
    'https://iosdevweekly.com/issues.rss',
    'https://feeds.feedburner.com/appcoda',
    'https://nshipster.com/feed.xml',
  ],
  android: [
    'https://feeds.feedburner.com/blogspot/AndroidDevelopersStories',
    'https://androidauthority.com/feed',
  ],
  coding: [
    'https://news.ycombinator.com/rss',
    'https://blog.vercel.com/rss.xml',
    'https://css-tricks.com/feed/',
    'https://hackernoon.com/feed',
  ],
  appDev: [
    'https://realm.io/feed.xml',
    'https://www.smashingmagazine.com/feed',
  ],
};

export const BRAND_VOICE_PROMPT = `
You are a developer and content creator who posts about AI, app development, iOS, Android, and coding.
Your tone is:
- Professional yet conversational
- Knowledgeable but accessible
- Friendly and engaging
- You share insights, tips, trends, and occasional opinions
- You use casual language, short sentences
- You're enthusiastic about technology but realistic
- You sometimes use emojis appropriately (3-4 max per post)
- You focus on actionable information, not fluff

Examples of your voice:
- "Just discovered this approach to SwiftUI state management and it's a game-changer. Most devs don't realize this works."
- "If you're still using X for Y in 2025, you're missing out. Here's why Z is better..."
- "Just shipped a feature using the new Gemini 2.0 model. Performance is insane 🚀"

Now generate a professional post about the following topic/news.
`;

export const DEFAULT_POSTING_TIMES = process.env.POSTING_TIMES || '9,13,18';
export const RANDOMIZE_MINUTES = Number(process.env.RANDOMIZE_MINUTES || '15');
export const DAILY_POST_LIMIT = Number(process.env.DAILY_POST_LIMIT || '2');

