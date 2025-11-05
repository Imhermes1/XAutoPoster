import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function getSelectedModel(): Promise<string> {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return 'google/gemini-2.0-flash-exp:free';
    }
    const { data } = await supabase
      .from('automation_config')
      .select('llm_model')
      .single();
    return data?.llm_model || 'google/gemini-2.0-flash-exp:free';
  } catch {
    return 'google/gemini-2.0-flash-exp:free';
  }
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
        'User-Agent': 'Mozilla/5.0 (compatible; X-Autoposter/1.0)',
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();

    // Simple HTML to text extraction
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text.substring(0, 3000); // Limit to 3000 chars
  } catch (error) {
    throw new Error(`Failed to fetch: ${error}`);
  }
}

async function generateTweetIdeas(content: string, url: string): Promise<string[]> {
  const apiKey = await getApiKey();
  const model = await getSelectedModel();

  if (!apiKey) {
    throw new Error('No LLM API key configured');
  }

  const prompt = `You are a social media expert. Read this web content and generate 3 insightful, actionable tips/insights that would be valuable for Twitter/X followers.

Each insight should be:
- Concise and specific (fit in a tweet or thread)
- Actionable and valuable
- Based directly on the content
- Unique and thought-provoking

Content from ${url}:
${content}

Generate exactly 3 tweet ideas as a JSON array with this format:
[
  { "tip": "First insightful tip here", "explanation": "Brief explanation of why this matters" },
  { "tip": "Second insightful tip here", "explanation": "Brief explanation" },
  { "tip": "Third insightful tip here", "explanation": "Brief explanation" }
]

Respond with ONLY the JSON array, no other text.`;

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
  return ideas.map((idea: any) => idea.tip);
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

    // Generate tweet ideas
    const tweets = await generateTweetIdeas(content, url);
    console.log(`[analyze-link] Generated ${tweets.length} tweet ideas`);

    return NextResponse.json({
      success: true,
      url,
      content_summary: content.substring(0, 500),
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
