import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function downloadAndUploadImage(imageUrl: string): Promise<string | null> {
  try {
    // Handle Next.js image optimization URLs
    // Extract the actual image URL from _next/image?url=... format
    if (imageUrl.includes('_next/image')) {
      const match = imageUrl.match(/url=([^&]+)/);
      if (match) {
        try {
          imageUrl = decodeURIComponent(match[1]);
        } catch (e) {
          // If decoding fails, continue with original URL
        }
      }
    }

    // Download image from URL
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Validate it's a real image type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.some(type => contentType.includes(type))) {
      return null;
    }

    // Check file size (max 5MB for X API compliance)
    if (buffer.byteLength > 5 * 1024 * 1024) {
      return null;
    }

    // Generate filename
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    const filePath = `media/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('x-autoposter')
      .upload(filePath, buffer, { contentType: 'image/jpeg' });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return null;
    }

    // Record in media_library
    const { data, error: dbError } = await supabase
      .from('media_library')
      .insert([{
        file_path: filePath,
        file_name: fileName,
        file_size: buffer.byteLength,
        mime_type: contentType,
        description: `Extracted from: ${imageUrl}`,
      }])
      .select('id')
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Image download/upload error:', error);
    return null;
  }
}

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

  // Extract all img tags - collect more candidates, filter aggressively later
  const imgRegex = /<img[^>]*>/gi;
  const candidates: string[] = [];
  let match;

  // Extract from picture elements (modern responsive images)
  const pictureRegex = /<picture[^>]*>([\s\S]*?)<\/picture>/gi;
  let pictureMatch;
  while ((pictureMatch = pictureRegex.exec(html))) {
    const pictureContent = pictureMatch[1];
    // Look for img tag inside picture
    const imgInPicture = pictureContent.match(/<img[^>]*>/i);
    if (imgInPicture) {
      const srcMatch = imgInPicture[0].match(/src=["']([^"']+)["']/i);
      if (srcMatch) {
        let imgUrl = srcMatch[1];
        if (!imgUrl.startsWith('http')) {
          try {
            imgUrl = new URL(imgUrl, baseUrl).href;
          } catch (e) {
            continue;
          }
        }
        if (!candidates.includes(imgUrl)) {
          candidates.push(imgUrl);
        }
      }
    }
  }
  while ((match = imgRegex.exec(html)) && candidates.length < 100) {
    const imgTag = match[0];

    // Try src attribute first
    let srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
    if (srcMatch) {
      let imgUrl = srcMatch[1];
      if (!imgUrl.startsWith('http')) {
        try {
          imgUrl = new URL(imgUrl, baseUrl).href;
        } catch (e) {
          continue;
        }
      }
      if (!candidates.includes(imgUrl)) {
        candidates.push(imgUrl);
      }
    }

    // Also try srcset (modern images often use srcset)
    let srcsetMatch = imgTag.match(/srcset=["']([^"']+)["']/i);
    if (srcsetMatch) {
      // srcset format: "url1 1x, url2 2x" or "url1 100w, url2 200w"
      const srcsetUrls = srcsetMatch[1].split(',').map(s => s.trim().split(/\s+/)[0]);
      for (const url of srcsetUrls) {
        if (url && url.startsWith('http')) {
          if (!candidates.includes(url)) {
            candidates.push(url);
          }
        } else if (url) {
          try {
            const fullUrl = new URL(url, baseUrl).href;
            if (!candidates.includes(fullUrl)) {
              candidates.push(fullUrl);
            }
          } catch (e) {
            // skip invalid URLs
          }
        }
      }
    }
  }

  // Filter candidates - remove junk images
  for (let imgUrl of candidates) {
    if (images.length >= 12) break; // Increased to 12 before filtering

    // Decode Next.js image optimization URLs
    if (imgUrl.includes('_next/image')) {
      const match = imgUrl.match(/url=([^&]+)/);
      if (match) {
        try {
          const decodedUrl = decodeURIComponent(match[1]);
          imgUrl = decodedUrl;
        } catch (e) {
          // If decoding fails, continue with original URL
        }
      }
    }

    // Skip common junk patterns
    const urlLower = imgUrl.toLowerCase();
    const isJunk = urlLower.includes('logo') ||
                   urlLower.includes('favicon') ||
                   urlLower.includes('tracking') ||
                   urlLower.includes('/ads/') ||
                   urlLower.includes('/ad/') ||
                   urlLower.includes('pixel.gif') ||
                   urlLower.includes('1x1') ||
                   urlLower.includes('spacer') ||
                   urlLower.includes('icon') ||
                   urlLower.includes('spinner') ||
                   urlLower.includes('loading') ||
                   urlLower.includes('dot.gif') ||
                   urlLower.includes('.svg') ||  // Often icons/logos
                   // Skip tiny tracking images
                   (urlLower.includes('pixel') && (
                     imgUrl.includes('1x1') ||
                     imgUrl.includes('2x2') ||
                     imgUrl.includes('3x3')
                   ));

    if (!isJunk) {
      images.push(imgUrl);
    }
  }

  return images;
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

  const prompt = `Read this and give me a quick breakdown. No fluff, just the good stuff.

What's it actually about? What's the main thing? Why should I care? Any specific takeaways?

Keep it conversational and direct. Think like you're explaining it to a friend over coffee - be real, be specific, skip the marketing BS.

Content:
${content}

Just write it naturally. 2-3 short paragraphs. Don't overthink it.`;

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

    // Upload images to media gallery (in parallel) - upload all extracted images
    const uploadPromises = images.map(img => downloadAndUploadImage(img));
    const uploadedImageIds = await Promise.all(uploadPromises);
    const savedImages = uploadedImageIds.filter(id => id !== null);
    console.log(`[analyze-link] Saved ${savedImages.length} images to media gallery`);

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
      images: images.slice(0, 8), // Return up to 8 images for display
      saved_image_ids: savedImages, // IDs of saved images in media_library
    });
  } catch (error: any) {
    console.error('[analyze-link] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze link' },
      { status: 500 }
    );
  }
}
