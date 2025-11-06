/**
 * Post Quality Scorer
 * Evaluates generated tweets on engagement, virality, and content type
 * Provides balanced scoring that values diverse content strategies
 */

export interface PostQualityScore {
  overall: number; // 0-10
  engagement: number; // 0-10 - How likely to get likes/comments
  virality: number; // 0-10 - How likely to be retweeted/shared
  contentType: {
    type: 'conversation-starter' | 'tips-tricks' | 'informative' | 'other';
    score: number; // 0-10
  };
  reasoning: string[];
  recommendation: 'post' | 'delete' | 'review'; // < 7 = delete, 7-8 = review, >= 8 = post
}

/**
 * Analyze a generated tweet and provide quality score
 * Balanced scoring: not all posts need to go viral
 * Mix of conversation starters, tips, and informative content
 */
export function scorePostQuality(text: string): PostQualityScore {
  const reasoning: string[] = [];

  // --- ENGAGEMENT SCORING (How likely to get likes/comments) ---
  let engagementScore = 5;

  // Questions increase engagement - people respond to questions
  const hasQuestion = /\?/.test(text);
  if (hasQuestion) {
    engagementScore += 2;
    reasoning.push('Contains question - encourages responses');
  }

  // Call-to-action increases engagement
  const cta = /what|what's your|how do you|do you|thoughts\?|your take|your experience|let me know|share your/i.test(text);
  if (cta) {
    engagementScore += 1.5;
    reasoning.push('Contains call-to-action - invites discussion');
  }

  // Personal opinion/perspective increases engagement
  const personalTone = /i (think|believe|found|learned|'ve|recommend)/i.test(text);
  if (personalTone) {
    engagementScore += 1;
    reasoning.push('Personal perspective - more relatable');
  }

  // Conversational language
  const casual = /don't|it's|you're|there's|isn't|won't|can't|shouldn't/i.test(text);
  if (casual) {
    engagementScore += 0.5;
    reasoning.push('Conversational tone - friendly and approachable');
  }

  // Emojis increase engagement (but not too many)
  const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
  if (emojiCount >= 1 && emojiCount <= 3) {
    engagementScore += 1;
    reasoning.push(`Appropriate emoji use (${emojiCount}) - adds visual interest`);
  } else if (emojiCount > 3) {
    engagementScore -= 1;
    reasoning.push(`Too many emojis (${emojiCount}) - can seem spammy`);
  }

  // Length optimization - be generous with length
  const wordCount = text.split(/\s+/).length;
  if (wordCount >= 10 && wordCount <= 100) {
    engagementScore += 1;
    reasoning.push('Optimal length - good substance');
  } else if (wordCount < 10) {
    engagementScore -= 0.5;
    reasoning.push('Short - but potentially punchy');
  }

  // Multiple sentences encourage interaction
  const sentenceCount = (text.match(/[.!?]/g) || []).length;
  if (sentenceCount >= 2 && sentenceCount <= 4) {
    engagementScore += 0.5;
    reasoning.push('Multiple thoughts - good discussion potential');
  }

  engagementScore = Math.min(10, Math.max(0, engagementScore));

  // --- VIRALITY SCORING (How likely to be shared/retweeted) ---
  let viralityScore = 4; // Virality is harder than engagement

  // Trending topics, tech, and industry discussions
  const trendingTopics = /ai|llm|coding|javascript|typescript|react|web|api|database|cloud|startup|tech|build|app|development/i.test(text);
  if (trendingTopics) {
    viralityScore += 2;
    reasoning.push('Tech/trending topic - more shareable');
  }

  // Data points and statistics increase virality
  const hasStats = /\d+%|\d+x|\d+ (million|billion|thousand|hours|minutes|days|weeks)/i.test(text);
  if (hasStats) {
    viralityScore += 2;
    reasoning.push('Contains data/metrics - more credible and shareable');
  }

  // Takes a stance (increases virality for opinionated content)
  const opinionated = /but|however|actually|really|honestly|the truth|the reality|fact is|here's the thing/i.test(text);
  if (opinionated) {
    viralityScore += 1;
    reasoning.push('Opinionated stance - increases discussion potential');
  }

  // Novel insight or perspective
  const insight = /new|first|unique|different|surprising|unexpected|never|realized|breakthrough/i.test(text);
  if (insight) {
    viralityScore += 1.5;
    reasoning.push('Novel insight - more likely to be shared');
  }

  // Humor increases virality
  const humor = /lol|😂|haha|funny|hilarious|😆|can't|won't|shouldn't/i.test(text);
  if (humor) {
    viralityScore += 1;
    reasoning.push('Humorous tone - people share funny content');
  }

  // Controversial or contrarian slightly boosts virality
  const contrarian = /everyone|nobody|wrong|myth|overrated|underrated|hate|love|obsessed/i.test(text);
  if (contrarian) {
    viralityScore += 0.5;
    reasoning.push('Contrarian angle - discussion-provoking');
  }

  // BUT: Too short lacks substance for virality
  if (wordCount < 15) {
    viralityScore -= 1;
    reasoning.push('Too short for significant reach');
  }

  viralityScore = Math.min(10, Math.max(0, viralityScore));

  // --- CONTENT TYPE CLASSIFICATION ---
  let contentType: PostQualityScore['contentType'] = {
    type: 'other',
    score: 5
  };

  // Conversation Starter Detection
  if (hasQuestion || cta) {
    contentType = {
      type: 'conversation-starter',
      score: engagementScore > 6 ? 8 : 6,
    };
    reasoning.push('Classified as conversation-starter - invites discussion');
  }
  // Tips & Tricks Detection
  else if (/tip|trick|hack|how to|guide|step|workflow|process|method|way to|best|practice/i.test(text)) {
    contentType = {
      type: 'tips-tricks',
      score: engagementScore > 6 ? 8 : 6,
    };
    reasoning.push('Classified as tips-tricks - practical value');
  }
  // Informative Detection
  else if (/learn|found|discovered|explained|understand|news|update|announce|release|feature|launch/i.test(text)) {
    contentType = {
      type: 'informative',
      score: engagementScore > 6 ? 7 : 5,
    };
    reasoning.push('Classified as informative - educational value');
  }

  // --- OVERALL SCORE (BALANCED APPROACH) ---
  // Weight virality higher since engagement base is conservative
  // Formula: if it has good length + some virality signals, it's good enough
  let overallScore = (viralityScore * 0.5 + engagementScore * 0.3 + contentType.score * 0.2);

  // Bonus for diverse content (not all viral-focused)
  if (contentType.type === 'conversation-starter' || contentType.type === 'tips-tricks') {
    overallScore += 0.8;
    reasoning.push('Conversation/tips format - good for audience engagement');
  }

  // Bonus for just being substantive and on-topic (base 1 point for having content)
  if (wordCount >= 10) {
    overallScore += 0.5;
    reasoning.push('Substantive content - worth sharing');
  }

  overallScore = Math.min(10, Math.max(0, Math.round(overallScore * 10) / 10));

  // --- RECOMMENDATION ---
  let recommendation: 'post' | 'delete' | 'review';
  if (overallScore >= 7.5) {
    recommendation = 'post';
  } else if (overallScore >= 6.5) {
    recommendation = 'review';
  } else {
    recommendation = 'delete';
  }

  return {
    overall: overallScore,
    engagement: Math.round(engagementScore * 10) / 10,
    virality: Math.round(viralityScore * 10) / 10,
    contentType,
    reasoning,
    recommendation
  };
}

/**
 * Batch score multiple posts
 */
export function scoreMultiplePosts(texts: string[]): PostQualityScore[] {
  return texts.map(text => scorePostQuality(text));
}

/**
 * Get statistics about a batch of posts
 */
export function getScoreStatistics(scores: PostQualityScore[]) {
  if (scores.length === 0) {
    return {
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      willPost: 0,
      willReview: 0,
      willDelete: 0,
      contentMix: {} as Record<string, number>
    };
  }

  const overallScores = scores.map(s => s.overall).sort((a, b) => a - b);
  const median = overallScores.length % 2 === 0
    ? (overallScores[overallScores.length / 2 - 1] + overallScores[overallScores.length / 2]) / 2
    : overallScores[Math.floor(overallScores.length / 2)];

  const contentMix: Record<string, number> = {
    'conversation-starter': 0,
    'tips-tricks': 0,
    'informative': 0,
    'other': 0
  };

  scores.forEach(s => {
    contentMix[s.contentType.type]++;
  });

  return {
    average: Math.round(scores.reduce((sum, s) => sum + s.overall, 0) / scores.length * 10) / 10,
    median: Math.round(median * 10) / 10,
    min: Math.min(...overallScores),
    max: Math.max(...overallScores),
    willPost: scores.filter(s => s.recommendation === 'post').length,
    willReview: scores.filter(s => s.recommendation === 'review').length,
    willDelete: scores.filter(s => s.recommendation === 'delete').length,
    contentMix
  };
}
