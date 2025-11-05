import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function getSelectedModel(): Promise<string> {
  // Always use Claude Haiku for link analysis - best tweet quality
  return 'anthropic/claude-haiku-4.5';
}

async function getApiKey(): Promise<string> {
  try {
    const { data } = await supabase
      .from('automation_config')
      .select('llm_api_key, openrouter_api_key, api_key')
      .single();
    return (data?.llm_api_key || data?.openrouter_api_key || data?.api_key || process.env.OPENROUTER_API_KEY || '') as string;
  } catch {
    return process.env.OPENROUTER_API_KEY || '';
  }
}

async function fetchWebContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();

    // Extract main content - remove nav, footer, scripts, styles
    let text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/\n\s*\n/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract roughly the first 2500 chars of meaningful content
    return text.substring(0, 2500);
  } catch (error) {
    throw new Error(`Failed to fetch: ${error}`);
  }
}

async function generateContentSummary(content: string, url: string): Promise<string> {
  const apiKey = await getApiKey();
  const model = await getSelectedModel();

  if (!apiKey) {
    throw new Error('No LLM API key configured');
  }

  const prompt = `You are a technical writer. Read this content and write ONE sentence that captures the main idea.

Requirements:
- Avoid jargon and fluff
- Be direct and specific
- Focus on the "why it matters" not "what it is"
- Under 100 characters if possible

Content:
${content}

Write ONLY that one sentence, nothing else.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function generateTweetIdeas(content: string, url: string): Promise<string[]> {
  const apiKey = await getApiKey();
  const model = await getSelectedModel();

  if (!apiKey) {
    throw new Error('No LLM API key configured');
  }

  const prompt = `You are a legendary tech Twitter user known for threads that people actually read. Create 3 great tweet options.

CRITICAL RULES:
1. Each tweet can be part of a thread (use 🧵 marker if it is)
2. Include the link: ${url}
3. No hashtags, no emoji in the text itself (only use 🧵 for thread indicator)
4. No AI-speak. Sound like a real person - conversational, smart, direct
5. Make them ENGAGING - tell a story, include a specific example, or reveal something surprising
6. Avoid generic statements - be specific about the "why it matters"
7. Can exceed 280 chars if it's part of a compelling thread (we'll handle threading on our end)
8. Lead with the hook - first sentence should make someone STOP SCROLLING
9. Use real examples, data, or scenarios where possible

The content to base tweets on:
${content}

Generate 3 different tweet options (varied approaches - one educational, one practical, one builder-focused):
[
  { "tweet": "tweet text with link, use 🧵 at start if it's a thread tweet" },
  { "tweet": "tweet text with link, use 🧵 at start if it's a thread tweet" },
  { "tweet": "tweet text with link, use 🧵 at start if it's a thread tweet" }
]

Only output the JSON array.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status}`);
  }

  const data = await response.json();
  const content_text = data.choices?.[0]?.message?.content || '';

  // Parse JSON from response
  const jsonMatch = content_text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to parse tweet ideas from LLM response');
  }

  const ideas = JSON.parse(jsonMatch[0]);
  return ideas.map((idea: any) => idea.tweet);
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    console.log(`[analyze-link] Fetching content from: ${url}`);

    // Fetch web content
    const content = await fetchWebContent(url);
    console.log(`[analyze-link] Fetched ${content.length} characters of content`);

    // Generate content summary
    const content_summary = await generateContentSummary(content, url);
    console.log(`[analyze-link] Generated summary`);

    // Generate tweet ideas
    const tweets = await generateTweetIdeas(content, url);
    console.log(`[analyze-link] Generated ${tweets.length} tweet ideas`);

    return NextResponse.json({
      success: true,
      url,
      content_summary,
      tweets,
    });
  } catch (error: any) {
    console.error('[analyze-link] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze link' },
      { status: 500 }
    );
  }
}
