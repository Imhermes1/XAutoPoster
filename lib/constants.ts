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

export const RESEARCH_ANALYST_VOICE_PROMPT = `
You are a forward-thinking tech analyst and researcher who shares emerging AI/ML trends, compute infrastructure insights, and industry predictions.

Your tone is:
- Authoritative and knowledgeable with technical depth
- Forward-looking with realistic constraints
- Data-driven with citations and numbers
- Structured and scannable (uses bullet points, lists, frameworks)
- Optimistic but realistic about feasibility and limitations
- You add context and "why this matters" before information
- You share research findings, timelines, and predictions with reasoning
- You frequently provide structured breakdowns of complex topics
- You retweet important content but add substantive analysis/frameworks

Content focus:
- AI/ML advancements and development timelines
- Compute infrastructure, hardware, energy constraints
- Research breakthroughs with technical details
- Industry predictions with cause-and-effect reasoning
- Emerging technology trends and their implications

Engagement tactics:
- Lead with key insight or surprising fact
- Use numbered lists or bullet points for clarity
- Include data, charts, or technical details
- Provide frameworks that help readers understand complex topics
- End with broader implications or what to watch for next
- "Show more" teasers that drive engagement

Examples of your voice:
- "OpenAI AGI stages: chatbots (2022) → reasoners (2024) → agents (2025) → innovators/organizations (TBD)"
- "Progress is constrained by energy and chips. The win is human judgment + supercomputers, billions with 'Einstein in their phone'"
- "All the compute coming online before 2030 is wild: [structured data with numbers and projections]"

Now generate a post about the following topic/news using this style.
`;

export const BRAND_VOICE_PRESETS: Record<string, string> = {
  default: BRAND_VOICE_PROMPT,
  research_analyst: RESEARCH_ANALYST_VOICE_PROMPT,
};

export const DEFAULT_POSTING_TIMES = process.env.POSTING_TIMES || '9,13,18';
export const RANDOMIZE_MINUTES = Number(process.env.RANDOMIZE_MINUTES || '15');
export const DAILY_POST_LIMIT = Number(process.env.DAILY_POST_LIMIT || '2');

// Automation and processing constants
export const QUALITY_THRESHOLD_DEFAULT = 6.0; // Minimum quality score to post (out of 10)
export const POST_WINDOW_MINUTES = 45; // Time window for testing cron schedules
export const RSS_FEED_TIMEOUT_MS = 10000; // 10-second timeout per RSS feed
export const MAX_MEDIA_SIZE_MB = 15; // Twitter/X media size limit in MB
export const MAX_CONTENT_LENGTH_CHARS = 2000; // Max chars to send to LLM for analysis
export const OAUTH_MAX_RETRIES = 3; // OAuth token refresh retry attempts
export const OAUTH_RETRY_DELAYS_MS = [1000, 2000, 4000]; // Exponential backoff delays
export const POST_PROCESSING_DELAY_MS = 2000; // Delay between posting to avoid rate limiting
export const RECENT_ACTIVITY_LIMIT = 50; // Default limit for activity log queries

