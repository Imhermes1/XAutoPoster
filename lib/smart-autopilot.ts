/**
 * Smart Autopilot Service
 * Handles post spacing, content variety, and feed quality scoring
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Check if it's safe to post based on spacing rules
 * Returns: { canPost: boolean, reason?: string, hoursSinceLastPost?: number }
 */
export async function checkPostSpacing(minHoursBetween: number = 1) {
  try {
    // Get the last posted post
    const { data: lastPost, error } = await supabase
      .from('bulk_post_queue')
      .select('scheduled_for, posted_at')
      .in('status', ['posted', 'scheduled'])
      .order('scheduled_for', { ascending: false })
      .limit(1)
      .single();

    if (error || !lastPost) {
      return { canPost: true, hoursSinceLastPost: Infinity };
    }

    const lastPostTime = new Date(lastPost.posted_at || lastPost.scheduled_for);
    const now = new Date();
    const hoursSince = (now.getTime() - lastPostTime.getTime()) / (1000 * 60 * 60);

    if (hoursSince < minHoursBetween) {
      return {
        canPost: false,
        reason: `Only ${hoursSince.toFixed(1)} hours since last post. Need ${minHoursBetween} hours minimum.`,
        hoursSinceLastPost: hoursSince,
      };
    }

    return { canPost: true, hoursSinceLastPost: hoursSince };
  } catch (error) {
    console.error('Error checking post spacing:', error);
    return { canPost: true }; // Allow post on error
  }
}

/**
 * Check content variety - ensure we're not repeating the same topics
 * Returns: { isVaried: boolean, warnings: string[], topicCounts: Record<string, number> }
 */
export async function checkContentVariety(lookbackPosts: number = 10) {
  try {
    // Get recent posted content
    const { data: recentPosts, error } = await supabase
      .from('bulk_post_queue')
      .select('post_text, source_id, created_at')
      .eq('status', 'posted')
      .order('posted_at', { ascending: false })
      .limit(lookbackPosts);

    if (error || !recentPosts || recentPosts.length === 0) {
      return { isVaried: true, warnings: [], topicCounts: {} };
    }

    // Extract topics/keywords from posts
    const topicCounts: Record<string, number> = {};
    const posts = recentPosts;

    posts.forEach((post: any) => {
      // Simple keyword extraction from post text
      const text = post.post_text.toLowerCase();
      const words = text.split(/\s+/).filter((w: string) => w.length > 4);

      words.forEach((word: string) => {
        // Skip common words
        if (
          !['https', 'http', 'that', 'this', 'from', 'with', 'have', 'been'].includes(word)
        ) {
          topicCounts[word] = (topicCounts[word] || 0) + 1;
        }
      });
    });

    // Find repetitive topics
    const warnings: string[] = [];
    const repetitiveFactor = lookbackPosts * 0.3; // If a word appears in 30%+ of posts

    Object.entries(topicCounts).forEach(([topic, count]) => {
      const frequency = (count / posts.length) * 100;
      if (frequency > 30 && topic.length > 5) {
        warnings.push(
          `Topic "${topic}" appears in ${count}/${posts.length} recent posts (${frequency.toFixed(0)}%)`
        );
      }
    });

    return {
      isVaried: warnings.length === 0,
      warnings,
      topicCounts: Object.fromEntries(
        Object.entries(topicCounts).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 10)
      ),
    };
  } catch (error) {
    console.error('Error checking content variety:', error);
    return { isVaried: true, warnings: [], topicCounts: {} };
  }
}

/**
 * Score an RSS feed item for quality
 * Returns: { score: number (0-100), reasoning: string[], quality: 'excellent' | 'good' | 'fair' | 'poor' }
 */
export async function scoreFeedContent(content: {
  title: string;
  description: string;
  source?: string;
  pubDate?: Date;
}) {
  const reasoning: string[] = [];
  let score = 50;

  // Check title length (good range: 20-100 chars)
  if (content.title.length < 15) {
    score -= 15;
    reasoning.push('Title too short (<15 chars)');
  } else if (content.title.length > 150) {
    score -= 10;
    reasoning.push('Title too long (>150 chars)');
  } else {
    score += 10;
    reasoning.push('Title length good');
  }

  // Check for clickbait indicators
  const clickbaitIndicators = [
    'shocking',
    'unbelievable',
    'you wont believe',
    'doctors hate',
    'one weird trick',
    'click here',
    'must see',
  ];
  const titleLower = content.title.toLowerCase();
  if (clickbaitIndicators.some((indicator) => titleLower.includes(indicator))) {
    score -= 20;
    reasoning.push('Potential clickbait detected');
  }

  // Check description/body length
  if (!content.description || content.description.length < 50) {
    score -= 15;
    reasoning.push('Description too short or missing');
  } else if (content.description.length > 5000) {
    score -= 5;
    reasoning.push('Description very long');
  } else {
    score += 15;
    reasoning.push('Description length good');
  }

  // Check for common words indicating quality
  const qualityIndicators = [
    'analysis',
    'guide',
    'tutorial',
    'research',
    'study',
    'report',
    'insights',
    'explainer',
  ];
  const descLower = content.description.toLowerCase();
  const qualityMatches = qualityIndicators.filter((ind) => descLower.includes(ind)).length;
  if (qualityMatches > 0) {
    score += qualityMatches * 5;
    reasoning.push(`Found ${qualityMatches} quality indicator(s)`);
  }

  // Check for spammy indicators
  const spamIndicators = [
    'viagra',
    'casino',
    'lottery',
    'buy now',
    'limited time',
    'act fast',
    'call today',
  ];
  if (spamIndicators.some((ind) => descLower.includes(ind))) {
    score -= 40;
    reasoning.push('Spam indicators detected');
  }

  // Check freshness (prefer recent content)
  if (content.pubDate) {
    const daysSincePublish =
      (new Date().getTime() - content.pubDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePublish < 1) {
      score += 10;
      reasoning.push('Very recent content');
    } else if (daysSincePublish < 7) {
      score += 5;
      reasoning.push('Recent content');
    } else if (daysSincePublish > 30) {
      score -= 10;
      reasoning.push('Old content (>30 days)');
    }
  }

  // Clamp score between 0-100
  score = Math.max(0, Math.min(100, score));

  let quality: 'excellent' | 'good' | 'fair' | 'poor';
  if (score >= 80) quality = 'excellent';
  else if (score >= 60) quality = 'good';
  else if (score >= 40) quality = 'fair';
  else quality = 'poor';

  return { score, reasoning, quality };
}

/**
 * Get autopilot health check - shows current state of spacing, variety, and feed quality
 */
export async function getAutopilotHealthCheck() {
  const [spacingCheck, varietyCheck] = await Promise.all([
    checkPostSpacing(1),
    checkContentVariety(10),
  ]);

  return {
    spacing: spacingCheck,
    variety: varietyCheck,
    timestamp: new Date(),
    ready: spacingCheck.canPost && varietyCheck.isVaried,
  };
}
