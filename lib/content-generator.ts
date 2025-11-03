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

    if (error || !data?.llm_model) {
      return process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';
    }

    return data.llm_model;
  } catch {
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
    max_tokens: 300,
  });

  const post = message.choices?.[0]?.message?.content || '';

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

export async function improveText(original: string): Promise<string> {
  const client = await getClient();
  const prompt = `You are improving a draft X (Twitter) post while preserving its core meaning.

Rules:
- Keep it under 280 characters (aim 200–260).
- Preserve any URLs, @mentions, and #hashtags exactly if present.
- Keep the author's voice: professional, concise, friendly; optional 0–3 relevant emojis.
- Make it clearer, more engaging, and more scannable.
- Do NOT add a thread; return a single post text only.`;

  const message = await client.chat.completions.create({
    model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: `Draft:\n${original}` },
    ],
    max_tokens: 300,
  });
  let text = message.choices?.[0]?.message?.content || '';
  if (text.length > 280) text = text.slice(0, 277) + '...';
  return text;
}
