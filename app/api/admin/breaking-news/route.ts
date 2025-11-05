import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, count, hashtag, imageUrl } = body;

    if (!url || !url.trim()) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const tweetCount = Math.min(5, Math.max(3, count || 3));

    // Step 1: Fetch and extract content from URL
    let content = '';
    let extractedImageUrl = imageUrl || '';

    try {
      const fetchResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!fetchResponse.ok) {
        throw new Error(`Failed to fetch URL: ${fetchResponse.statusText}`);
      }

      const html = await fetchResponse.text();
      const $ = cheerio.load(html);

      // Extract title
      const title = $('title').text() ||
                    $('meta[property="og:title"]').attr('content') ||
                    $('meta[name="twitter:title"]').attr('content') ||
                    '';

      // Extract description/content
      const description = $('meta[property="og:description"]').attr('content') ||
                         $('meta[name="description"]').attr('content') ||
                         $('meta[name="twitter:description"]').attr('content') ||
                         '';

      // Extract main article content if available
      const articleText = $('article').text().trim().substring(0, 2000) ||
                         $('main').text().trim().substring(0, 2000) ||
                         $('p').first().text().trim().substring(0, 500);

      content = `${title}\n\n${description}\n\n${articleText}`.trim();

      // Extract image if not provided
      if (!extractedImageUrl) {
        extractedImageUrl = $('meta[property="og:image"]').attr('content') ||
                           $('meta[name="twitter:image"]').attr('content') ||
                           $('img').first().attr('src') ||
                           '';

        // Make sure image URL is absolute
        if (extractedImageUrl && !extractedImageUrl.startsWith('http')) {
          const urlObj = new URL(url);
          if (extractedImageUrl.startsWith('//')) {
            extractedImageUrl = `${urlObj.protocol}${extractedImageUrl}`;
          } else if (extractedImageUrl.startsWith('/')) {
            extractedImageUrl = `${urlObj.protocol}//${urlObj.host}${extractedImageUrl}`;
          } else {
            extractedImageUrl = `${urlObj.protocol}//${urlObj.host}/${extractedImageUrl}`;
          }
        }
      }

    } catch (fetchError) {
      console.error('[breaking-news] Failed to fetch URL:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch content from URL. Please check the URL and try again.'
      }, { status: 400 });
    }

    if (!content || content.length < 50) {
      return NextResponse.json({
        error: 'Could not extract enough content from URL'
      }, { status: 400 });
    }

    // Step 2: Generate tweets using Claude Haiku 4.5 (hardcoded)
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
      return NextResponse.json({
        error: 'OpenRouter API key not configured'
      }, { status: 500 });
    }

    const client = new OpenAI({
      apiKey: openrouterKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });

    // HARDCODED: Claude Haiku 4.5 for breaking news
    const model = 'anthropic/claude-3.5-haiku';

    const hashtagText = hashtag ? `Include the hashtag ${hashtag} naturally in each tweet.` : '';

    const prompt = `You are a breaking news social media expert. Create ${tweetCount} exciting, engagement-focused tweets about this breaking news.

SOURCE CONTENT:
${content}

REQUIREMENTS:
- Generate exactly ${tweetCount} unique tweets
- Each tweet must be under 280 characters
- Make them exciting and attention-grabbing
- Focus on the most important/interesting aspects
- Use strong action words and create urgency
- Each tweet should stand alone (not numbered)
- Vary the angles/perspectives across tweets
${hashtagText}
- NO quotation marks around the tweets
- NO "Tweet 1:", "Tweet 2:" labels
- NO explanations or meta-commentary

Return ONLY the tweets, one per line, separated by a blank line.`;

    console.log('[breaking-news] Generating tweets with Claude Haiku 4.5');

    const message = await client.chat.completions.create({
      model,
      messages: [
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.9, // Higher for more creative/exciting content
    });

    const response = message.choices?.[0]?.message?.content || '';

    if (!response) {
      return NextResponse.json({
        error: 'Failed to generate tweets'
      }, { status: 500 });
    }

    // Parse tweets from response
    const tweetTexts = response
      .split('\n\n')
      .map(t => t.trim())
      .filter(t => t.length > 0 && t.length <= 280)
      .slice(0, tweetCount);

    if (tweetTexts.length === 0) {
      return NextResponse.json({
        error: 'Failed to parse generated tweets'
      }, { status: 500 });
    }

    // Format tweets with IDs and image
    const tweets = tweetTexts.map((text, index) => ({
      id: `breaking-${Date.now()}-${index}`,
      text,
      imageUrl: extractedImageUrl || undefined,
      order: index,
    }));

    console.log('[breaking-news] Generated', tweets.length, 'tweets with Claude Haiku 4.5');

    return NextResponse.json({
      success: true,
      tweets,
      sourceUrl: url,
      extractedImage: extractedImageUrl || null,
    });

  } catch (error) {
    console.error('[breaking-news] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to generate breaking news tweets'
    }, { status: 500 });
  }
}
