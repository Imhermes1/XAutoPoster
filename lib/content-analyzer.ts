/**
 * AI Content Analyzer
 * Scores and evaluates content before posting
 */

import OpenAI from 'openai';
import { logContentAnalysis } from './automation-logger';

export interface ContentScores {
  relevance_score: number; // 0-1: How relevant to topics/audience
  quality_score: number; // 0-1: Writing quality, credibility
  brand_fit_score: number; // 0-1: Matches brand voice/tone
  engagement_potential: number; // 0-1: Likely to get interactions
  overall_score: number; // 0-1: Weighted average
}

export interface AnalysisResult {
  scores: ContentScores;
  reasoning: string;
  strengths: string[];
  concerns: string[];
  decision: 'approved' | 'rejected' | 'pending';
  rejection_reason?: string;
}

interface AnalysisContext {
  brand_voice?: string;
  topics?: string[];
  required_keywords?: string[];
  blocked_keywords?: string[];
  min_score?: number;
}

/**
 * Analyze content using AI to determine if it should be posted
 */
export async function analyzeContent(
  candidate: {
    id: string;
    type: 'tweet' | 'rss';
    title?: string;
    text?: string;
    url?: string;
    source: string;
    likes_count?: number;
    retweets_count?: number;
    replies_count?: number;
  },
  context: AnalysisContext = {},
  automationRunId?: string
): Promise<AnalysisResult> {
  const startTime = Date.now();

  try {
    // Get LLM configuration
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.LLM_MODEL || 'google/gemini-2.0-flash-exp:free';

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    });

    // Build analysis prompt
    const contentText = candidate.type === 'rss'
      ? `${candidate.title || ''}\n${candidate.text || ''}`
      : candidate.text || '';

    const prompt = buildAnalysisPrompt(contentText, candidate, context);

    // Call AI for analysis
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a content quality analyzer for social media. Evaluate content objectively and provide scores with clear reasoning.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Low temperature for consistent scoring
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from AI');
    }

    // Parse AI response
    const aiResult = JSON.parse(response);

    // Calculate scores
    const scores: ContentScores = {
      relevance_score: clampScore(aiResult.relevance_score),
      quality_score: clampScore(aiResult.quality_score),
      brand_fit_score: clampScore(aiResult.brand_fit_score),
      engagement_potential: clampScore(aiResult.engagement_potential),
      overall_score: 0,
    };

    // Calculate weighted overall score
    scores.overall_score = (
      scores.relevance_score * 0.30 +
      scores.quality_score * 0.30 +
      scores.brand_fit_score * 0.20 +
      scores.engagement_potential * 0.20
    );

    // Boost score for high-engagement tweets (trending detection)
    if (candidate.type === 'tweet') {
      const engagementScore =
        (candidate.likes_count || 0) * 1.0 +
        (candidate.retweets_count || 0) * 2.0 +
        (candidate.replies_count || 0) * 0.5;

      // Apply engagement boost for viral content
      if (engagementScore > 500) {
        // Very high engagement (500+) - significant boost
        scores.overall_score = Math.min(1.0, scores.overall_score + 0.15);
      } else if (engagementScore > 200) {
        // High engagement (200+) - moderate boost
        scores.overall_score = Math.min(1.0, scores.overall_score + 0.10);
      } else if (engagementScore > 100) {
        // Medium engagement (100+) - small boost
        scores.overall_score = Math.min(1.0, scores.overall_score + 0.05);
      }
    }

    // Apply filters and make decision
    const minScore = context.min_score ?? 0.7;
    const { decision, rejection_reason } = makeDecision(
      scores,
      contentText,
      context,
      minScore
    );

    const result: AnalysisResult = {
      scores,
      reasoning: aiResult.reasoning || 'Content analyzed',
      strengths: aiResult.strengths || [],
      concerns: aiResult.concerns || [],
      decision,
      rejection_reason,
    };

    // Log the analysis
    const durationMs = Date.now() - startTime;
    await logContentAnalysis({
      candidate_id: candidate.id,
      automation_run_id: automationRunId,
      scores,
      reasoning: result.reasoning,
      concerns: result.concerns,
      strengths: result.strengths,
      decision,
      rejection_reason,
      model_used: model,
      tokens_used: completion.usage?.total_tokens,
      analysis_duration_ms: durationMs,
    });

    return result;
  } catch (error: any) {
    console.error('Content analysis failed:', error);

    // Log failed analysis
    await logContentAnalysis({
      candidate_id: candidate.id,
      automation_run_id: automationRunId,
      scores: {
        relevance_score: 0,
        quality_score: 0,
        brand_fit_score: 0,
        engagement_potential: 0,
        overall_score: 0,
      },
      reasoning: `Analysis failed: ${error.message}`,
      concerns: ['Analysis error'],
      strengths: [],
      decision: 'rejected',
      rejection_reason: `Error: ${error.message}`,
      analysis_duration_ms: Date.now() - startTime,
    });

    // Return safe fallback
    return {
      scores: {
        relevance_score: 0,
        quality_score: 0,
        brand_fit_score: 0,
        engagement_potential: 0,
        overall_score: 0,
      },
      reasoning: 'Analysis failed due to error',
      strengths: [],
      concerns: ['Analysis error'],
      decision: 'rejected',
      rejection_reason: error.message,
    };
  }
}

/**
 * Build the analysis prompt for AI
 */
function buildAnalysisPrompt(
  content: string,
  candidate: any,
  context: AnalysisContext
): string {
  const sections = [
    `Analyze this content for social media posting:`,
    ``,
    `CONTENT:`,
    `${content}`,
    ``,
    `SOURCE: ${candidate.source} (${candidate.type})`,
  ];

  if (context.brand_voice) {
    sections.push(``, `BRAND VOICE:`, context.brand_voice);
  }

  if (context.topics && context.topics.length > 0) {
    sections.push(``, `RELEVANT TOPICS:`, context.topics.join(', '));
  }

  if (context.required_keywords && context.required_keywords.length > 0) {
    sections.push(``, `REQUIRED KEYWORDS:`, context.required_keywords.join(', '));
  }

  if (context.blocked_keywords && context.blocked_keywords.length > 0) {
    sections.push(``, `BLOCKED KEYWORDS:`, context.blocked_keywords.join(', '));
  }

  sections.push(
    ``,
    `Provide a JSON response with:`,
    `{`,
    `  "relevance_score": 0.0-1.0,  // How relevant to the topics/audience`,
    `  "quality_score": 0.0-1.0,    // Writing quality, credibility, depth`,
    `  "brand_fit_score": 0.0-1.0,  // Matches the brand voice and tone`,
    `  "engagement_potential": 0.0-1.0, // Likely to get likes/retweets`,
    `  "reasoning": "Brief explanation of the scores",`,
    `  "strengths": ["strength 1", "strength 2", ...],`,
    `  "concerns": ["concern 1", "concern 2", ...]`,
    `}`,
    ``,
    `Be honest and objective. Score fairly based on the criteria.`
  );

  return sections.join('\n');
}

/**
 * Make posting decision based on scores and filters
 */
function makeDecision(
  scores: ContentScores,
  content: string,
  context: AnalysisContext,
  minScore: number
): { decision: 'approved' | 'rejected'; rejection_reason?: string } {
  const contentLower = content.toLowerCase();

  // Check blocked keywords
  if (context.blocked_keywords && context.blocked_keywords.length > 0) {
    const blocked = context.blocked_keywords.find(kw =>
      contentLower.includes(kw.toLowerCase())
    );
    if (blocked) {
      return {
        decision: 'rejected',
        rejection_reason: `Contains blocked keyword: ${blocked}`,
      };
    }
  }

  // Check required keywords
  if (context.required_keywords && context.required_keywords.length > 0) {
    const hasRequired = context.required_keywords.some(kw =>
      contentLower.includes(kw.toLowerCase())
    );
    if (!hasRequired) {
      return {
        decision: 'rejected',
        rejection_reason: `Missing required keywords: ${context.required_keywords.join(', ')}`,
      };
    }
  }

  // Check minimum score
  if (scores.overall_score < minScore) {
    return {
      decision: 'rejected',
      rejection_reason: `Score ${scores.overall_score.toFixed(2)} below minimum ${minScore.toFixed(2)}`,
    };
  }

  // Check individual scores (all should be at least 0.5)
  if (scores.quality_score < 0.5) {
    return {
      decision: 'rejected',
      rejection_reason: `Quality score too low: ${scores.quality_score.toFixed(2)}`,
    };
  }

  if (scores.brand_fit_score < 0.4) {
    return {
      decision: 'rejected',
      rejection_reason: `Brand fit score too low: ${scores.brand_fit_score.toFixed(2)}`,
    };
  }

  // All checks passed
  return { decision: 'approved' };
}

/**
 * Clamp score to 0-1 range
 */
function clampScore(score: any): number {
  const num = typeof score === 'number' ? score : parseFloat(score) || 0;
  return Math.max(0, Math.min(1, num));
}

/**
 * Batch analyze multiple candidates
 */
export async function analyzeCandidatesBatch(
  candidates: any[],
  context: AnalysisContext = {},
  automationRunId?: string
): Promise<Map<string, AnalysisResult>> {
  const results = new Map<string, AnalysisResult>();

  // Analyze sequentially to avoid rate limits
  for (const candidate of candidates) {
    try {
      const result = await analyzeContent(candidate, context, automationRunId);
      results.set(candidate.id, result);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to analyze candidate ${candidate.id}:`, error);
    }
  }

  return results;
}

/**
 * Get analysis context from automation config
 */
export async function getAnalysisContext(): Promise<AnalysisContext> {
  try {
    const { getSupabase } = await import('./supabase');
    const supabase = getSupabase();

    // Get config
    const { data: config } = await supabase
      .from('automation_config')
      .select('brand_voice_instructions')
      .single();

    // Get topics
    const { data: topics } = await supabase
      .from('manual_topics')
      .select('topic')
      .limit(20);

    return {
      brand_voice: config?.brand_voice_instructions,
      topics: topics?.map(t => t.topic) || [],
      min_score: 0.7,
    };
  } catch (error) {
    console.error('Failed to get analysis context:', error);
    return { min_score: 0.7 };
  }
}
