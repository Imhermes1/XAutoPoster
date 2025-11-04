import { OpenAI } from 'openai';
import { BRAND_VOICE_PROMPT } from './constants';
import { createClient } from '@supabase/supabase-js';

async function getClient() {
  // 1) Env var (OpenRouter only)
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey) {
    return new OpenAI({ apiKey: openrouterKey, baseURL: 'https://openrouter.ai/api/v1' });
  }

  // 2) Try Supabase config if available (OpenRouter only)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Select all to be resilient to differing column names
      const { data, error } = await supabase
        .from('automation_config')
        .select('*')
        .single();

      if (!error && data) {
        const key =
          (data as any).llm_api_key ||
          (data as any).openrouter_api_key ||
          (data as any).api_key ||
          null;

        if (key) {
          return new OpenAI({ apiKey: key, baseURL: 'https://openrouter.ai/api/v1' });
        }
      }
    } catch (_e) {
      // fall through to throw below
    }
  }

  throw new Error('Missing LLM API key: set OPENROUTER_API_KEY or store it in Supabase automation_config (llm_api_key/openrouter_api_key/api_key).');
}

async function getSelectedModel(): Promise<string> {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('[getSelectedModel] No Supabase env vars, using fallback');
      return process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('automation_config')
      .select('llm_model')
      .single();

    console.log('[getSelectedModel] Database query result:', { data, error: error?.message });

    if (error || !data?.llm_model) {
      console.log('[getSelectedModel] Using fallback model due to error or no data');
      return process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';
    }

    console.log('[getSelectedModel] Using model from database:', data.llm_model);
    return data.llm_model;
  } catch (e) {
    console.error('[getSelectedModel] Exception:', e);
    return process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';
  }
}

async function getBrandVoiceInstructions(): Promise<string> {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return BRAND_VOICE_PROMPT;
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('automation_config')
      .select('brand_voice_instructions')
      .single();

    if (error || !data?.brand_voice_instructions) {
      return BRAND_VOICE_PROMPT;
    }

    return data.brand_voice_instructions;
  } catch {
    return BRAND_VOICE_PROMPT;
  }
}

export async function generatePost(
  topic: string,
  context?: string
): Promise<string> {
  const brandVoice = await getBrandVoiceInstructions();
  const prompt = `${brandVoice}\n\nTopic/News: ${topic}\n${context ? `Additional context: ${context}` : ''}\n\nGenerate a single engaging X post (max 280 characters, but aim for 200-260 for impact).\nReturn ONLY the post text, no explanations.\nMake it shareable, informative, and in your voice.`;

  console.log('[generatePost] Prompt length:', prompt.length, 'characters');

  const client = await getClient();
  const model = await getSelectedModel();

  const message = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 3000,  // Extra large buffer for 6246 char brand voice prompt
  });

  const post = message.choices?.[0]?.message?.content || '';

  console.log('[generatePost] API response:', {
    model,
    has_choices: !!message.choices?.length,
    content_length: post.length,
    content_preview: post.substring(0, 100),
    finish_reason: message.choices?.[0]?.finish_reason
  });

  if (post.length > 280) {
    return post.substring(0, 277) + '...';
  }

  return post;
}

export async function generateMultiplePosts(
  topics: string[],
  count: number = 1
): Promise<string[]> {
  const posts: string[] = [];

  for (let i = 0; i < count; i++) {
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    const post = await generatePost(randomTopic);
    posts.push(post);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return posts;
}

export async function generateQuoteTweetComment(originalTweetText: string): Promise<string> {
  try {
    const client = await getClient();
    const model = await getSelectedModel();
    const brandVoice = await getBrandVoiceInstructions();

    // Simplified prompt - let the AI think freely
    const prompt = `You are a tech expert and builder. Read this tweet and write an insightful quote tweet comment.

TWEET:
${originalTweetText}

YOUR VOICE/STYLE:
${brandVoice}

Write a SHORT comment (under 200 characters) that adds genuine value - share an insight, highlight what matters, or connect to a broader trend. Be specific to this tweet's content. Sound natural and conversational.

Write ONLY your comment text:`;

    const message = await client.chat.completions.create({
      model,
      messages: [
        { role: 'user', content: prompt },
      ],
      max_tokens: 150,
      temperature: 0.9, // Higher temperature for more creative insights
    });

    let text = message.choices?.[0]?.message?.content || '';

    // Aggressive cleanup of LLM artifacts
    text = text.replace(/^["']|["']$/g, '').trim();
    text = text.replace(/^(comment:|response:|tweet:|here's my comment:|my comment:)/gi, '').trim();

    // Remove any meta-commentary patterns
    const metaPatterns = [
      /^(here('s| is)? (a|my|the))?\s*(comment|response|tweet|thought)s?:?\s*/gi,
      /^let me /gi,
      /^i (would|will|could) /gi,
      /^this (is|could be) /gi,
    ];

    for (const pattern of metaPatterns) {
      text = text.replace(pattern, '').trim();
    }

    if (text.length > 200) text = text.slice(0, 197) + '...';

    // Validation checks
    const invalidPatterns = [
      /add a (concise|brief|short|thoughtful)/gi,
      /write (a|an) (comment|response|tweet)/gi,
      /create (a|an) (comment|response|tweet)/gi,
      /provide (a|an) (comment|response|insight)/gi,
      /generate (a|an) (comment|response|tweet)/gi,
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.test(text)) {
        console.error('AI generated invalid comment (instructions detected):', text);
        throw new Error('AI generated invalid comment (contains instructions)');
      }
    }

    if (!text || text.length < 10) {
      throw new Error('AI generated empty or too short comment');
    }

    return text;
  } catch (error: any) {
    console.error('Failed to generate quote tweet comment:', error);

    // Provide more specific error messages
    if (error?.message?.includes('rate limit') || error?.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
    }
    if (error?.message?.includes('API key') || error?.status === 401) {
      throw new Error('Invalid API key. Please check your OpenRouter API key configuration.');
    }

    // Re-throw the error instead of returning a fallback for quote tweets
    throw new Error('Failed to generate comment: ' + (error?.message || String(error)));
  }
}

export async function improveText(original: string): Promise<string> {
  try {
    const client = await getClient();
    const model = await getSelectedModel();
    const brandVoice = await getBrandVoiceInstructions();

    const prompt = `You are improving a draft X (Twitter) post while preserving its core meaning.

Brand Voice Context:
${brandVoice}

Rules:
- Keep it under 280 characters (aim 200–260).
- Preserve any URLs, @mentions, and #hashtags exactly if present.
- Keep the author's voice based on brand voice instructions above.
- Make it clearer, more engaging, and more scannable.
- Do NOT add a thread; return a single post text only.
- Return ONLY the improved post text, no explanations or quotes.`;

    const message = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `Draft:\n${original}` },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    let text = message.choices?.[0]?.message?.content || '';

    // Clean up any quotes or formatting that LLMs sometimes add
    text = text.replace(/^["']|["']$/g, '').trim();

    if (text.length > 280) text = text.slice(0, 277) + '...';

    // If the improved text is empty or unchanged, return original
    if (!text || text === original) {
      console.warn('AI improve returned empty or unchanged text, returning original');
      return original;
    }

    return text;
  } catch (error: any) {
    console.error('Failed to improve text with AI:', error);

    // Provide more specific error messages
    if (error?.message?.includes('rate limit') || error?.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
    }
    if (error?.message?.includes('API key') || error?.status === 401) {
      throw new Error('Invalid API key. Please check your OpenRouter API key configuration.');
    }
    if (error?.status === 400) {
      throw new Error('Invalid request to AI model. The text may be too long or contain invalid characters.');
    }

    // Return original text as fallback instead of throwing
    console.warn('Returning original text due to error');
    return original;
  }
}
