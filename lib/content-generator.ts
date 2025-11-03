import { OpenAI } from 'openai';
import { BRAND_VOICE_PROMPT } from './constants';

function getClient() {
  // Lazily instantiate to avoid requiring env at build time
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  });
}

export async function generatePost(
  topic: string,
  context?: string
): Promise<string> {
  const prompt = `${BRAND_VOICE_PROMPT}\n\nTopic/News: ${topic}\n${context ? `Additional context: ${context}` : ''}\n\nGenerate a single engaging X post (max 280 characters, but aim for 200-260 for impact).\nReturn ONLY the post text, no explanations.\nMake it shareable, informative, and in your voice.`;

  const client = getClient();
  const message = await client.chat.completions.create({
    model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free',
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
