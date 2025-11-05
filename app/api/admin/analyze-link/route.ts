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

async function extractImages(html: string, baseUrl: string): Promise<string[]> {
  const images: string[] = [];

  // Extract og:image (Open Graph - most reliable)
  const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (ogMatch) images.push(ogMatch[1]);

  // Extract twitter:image
  const twitterMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
  if (twitterMatch && !images.includes(twitterMatch[1])) images.push(twitterMatch[1]);

  // Extract main img tags (first 3)
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  let imgCount = 0;
  while ((match = imgRegex.exec(html)) && imgCount < 3) {
    let imgUrl = match[1];
    // Handle relative URLs
    if (!imgUrl.startsWith('http')) {
      try {
        const urlObj = new URL(baseUrl);
        imgUrl = new URL(imgUrl, baseUrl).href;
      } catch (e) {
        continue;
      }
    }
    if (!images.includes(imgUrl) && !imgUrl.includes('logo') && !imgUrl.includes('favicon')) {
      images.push(imgUrl);
      imgCount++;
    }
  }

  return images.slice(0, 3); // Return top 3 images
}

async function fetchWebContent(url: string): Promise<{ text: string; images: string[] }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();

    // Extract images before removing HTML tags
    const images = await extractImages(html, url);

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
    return {
      text: text.substring(0, 2500),
      images: images,
    };
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

  const prompt = `You are a technical writer. Read this content and create a 2-3 paragraph summary that captures the essence.

Requirements for your summary:
- Paragraph 1: What is this about? What's the main idea/problem/concept?
- Paragraph 2: Why does this matter? What's the impact, benefit, or significance?
- Paragraph 3 (optional): What are the key takeaways or next steps readers should consider?

Be specific and actionable. Avoid vague language or marketing speak. Focus on substance over fluff.

Content:
${content}

Write 2-3 solid paragraphs. Make it readable and engaging.`;

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
      max_tokens: 400,
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
1. NO EMOJI - text only, absolutely no emojis
2. Include the link: ${url}
3. No hashtags. Sound like a real person - conversational, smart, direct
4. Make them GENUINELY ENGAGING - tell a story, include a specific example, reveal something surprising or counterintuitive
5. Avoid generic/obvious statements - be specific about WHY this matters and WHO should care
6. Can exceed 280 chars for compelling content (we handle threading)
7. LEAD WITH THE HOOK - first 1-2 sentences should make someone stop scrolling
8. Use real examples, numbers, or specific scenarios where possible
9. Create tension or curiosity - pose a problem, challenge an assumption, or reveal an insight
10. Make it debate-worthy - something people will want to quote or argue with

The content to base tweets on:
${content}

Generate 3 different tweet options (varied approaches):
- Tweet 1: Problem/insight angle (identify a widespread misconception or problem)
- Tweet 2: Practical/actionable angle (specific takeaway people can use)
- Tweet 3: Narrative/story angle (engaging story or scenario that illustrates the point)

[
  { "tweet": "tweet text with link" },
  { "tweet": "tweet text with link" },
  { "tweet": "tweet text with link" }
]

Only output the JSON array. No emojis anywhere.`;

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

    // Fetch web content and images
    const { text, images } = await fetchWebContent(url);
    console.log(`[analyze-link] Fetched ${text.length} characters of content and ${images.length} images`);

    // Generate content summary
    const content_summary = await generateContentSummary(text, url);
    console.log(`[analyze-link] Generated summary`);

    // Generate tweet ideas
    const tweets = await generateTweetIdeas(text, url);
    console.log(`[analyze-link] Generated ${tweets.length} tweet ideas`);

    return NextResponse.json({
      success: true,
      url,
      content_summary,
      tweets,
      images: images.slice(0, 3), // Return top 3 images
    });
  } catch (error: any) {
    console.error('[analyze-link] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze link' },
      { status: 500 }
    );
  }
}
