import { createHmac } from 'crypto';

interface XApiConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

function getXApiConfig(): XApiConfig {
  return {
    apiKey: process.env.X_API_KEY!,
    apiSecret: process.env.X_API_SECRET!,
    accessToken: process.env.X_ACCESS_TOKEN!,
    accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET!,
  };
}

function generateOAuthHeader(
  method: string,
  url: string,
  params: Record<string, string>,
  config: XApiConfig
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: config.apiKey,
    oauth_token: config.accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_version: '1.0',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: Math.random().toString(36).substring(2, 15),
  };

  const allParams = { ...oauthParams, ...params };
  const paramString = Object.entries(allParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(paramString),
  ].join('&');

  const signingKey = `${encodeURIComponent(config.apiSecret)}&${encodeURIComponent(
    config.accessTokenSecret
  )}`;

  const signature = createHmac('sha1', signingKey).update(baseString).digest('base64');
  (oauthParams as any).oauth_signature = signature;

  const headerParams = Object.entries(oauthParams)
    .map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
    .join(', ');

  return `OAuth ${headerParams}`;
}

type PostResponse = { success: boolean; id?: string; error?: string };

async function oauthFetch(url: string, method: string, body?: any, headers: Record<string, string> = {}): Promise<Response> {
  const config = getXApiConfig();
  const authHeader = generateOAuthHeader(method, url, {}, config);
  return fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
      'User-Agent': 'X-AutoPoster/1.0',
      ...headers,
    },
    body,
  });
}

export async function postToX(text: string): Promise<PostResponse> {
  try {
    const url = 'https://api.x.com/2/tweets';
    const response = await oauthFetch(url, 'POST', JSON.stringify({ text }), { 'Content-Type': 'application/json' });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = (await response.json()) as { data: { id: string } };
    return { success: true, id: data.data.id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function postToXAdvanced(params: { text: string; media_ids?: string[]; quote_tweet_id?: string }): Promise<PostResponse> {
  try {
    const url = 'https://api.x.com/2/tweets';
    const payload: any = { text: params.text };
    if (params.media_ids && params.media_ids.length > 0) payload.media = { media_ids: params.media_ids };
    if (params.quote_tweet_id) payload.quote_tweet_id = params.quote_tweet_id;
    const response = await oauthFetch(url, 'POST', JSON.stringify(payload), { 'Content-Type': 'application/json' });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }
    const data = (await response.json()) as { data: { id: string } };
    return { success: true, id: data.data.id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function uploadMediaFromUrl(imageUrl: string): Promise<{ success: boolean; media_id?: string; error?: string }> {
  try {
    const res = await fetch(imageUrl, { headers: { 'User-Agent': 'X-AutoPoster/1.0' } });
    if (!res.ok) return { success: false, error: `download failed: ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 5 * 1024 * 1024) {
      return { success: false, error: 'image larger than 5MB not supported in simple upload' };
    }
    const b64 = buf.toString('base64');
    const url = 'https://upload.twitter.com/1.1/media/upload.json';
    const body = new URLSearchParams({ media_data: b64 });
    const response = await oauthFetch(url, 'POST', body.toString(), { 'Content-Type': 'application/x-www-form-urlencoded' });
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }
    const data = (await response.json()) as { media_id_string?: string };
    if (!data.media_id_string) return { success: false, error: 'no media id in response' };
    return { success: true, media_id: data.media_id_string };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function uploadMedia(
  buffer: ArrayBuffer | Uint8Array,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
): Promise<{ success: boolean; media_id?: string; expires_after_secs?: number; error?: string }> {
  try {
    const config = getXApiConfig();
    const url = 'https://upload.twitter.com/1.1/media/upload.json';

    // Prepare form data
    const formData = new FormData();
    // Convert to Uint8Array if needed for Blob compatibility
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    // Use any type to bypass strict Blob typing issues
    const blob = new Blob([bytes as any], { type: mediaType });
    formData.append('media_data', blob);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: generateOAuthHeader('POST', url, {}, config),
        'User-Agent': 'X-AutoPoster/1.0',
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = (await response.json()) as { media_id_string: string; expires_after_secs?: number };
    return {
      success: true,
      media_id: data.media_id_string,
      expires_after_secs: data.expires_after_secs
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function postToXWithMedia(
  text: string,
  mediaIds: string[]
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const config = getXApiConfig();
    const url = 'https://api.x.com/2/tweets';

    const authHeader = generateOAuthHeader('POST', url, {}, config);

    const body = {
      text,
      media: {
        media_ids: mediaIds,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'X-AutoPoster/1.0',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = (await response.json()) as { data: { id: string } };
    return { success: true, id: data.data.id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function postToXWithLink(
  text: string,
  link: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Validate URL
    new URL(link);

    // Simply append link to text (URL cards are generated automatically by X)
    const fullText = `${text}\n\n${link}`;

    // Ensure text is within 280 character limit
    if (fullText.length > 280) {
      return {
        success: false,
        error: 'Text with link exceeds 280 character limit',
      };
    }

    return postToX(fullText);
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
