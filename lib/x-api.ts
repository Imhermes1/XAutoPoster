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

export async function postToX(text: string): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const config = getXApiConfig();
    const url = 'https://api.x.com/2/tweets';

    const authHeader = generateOAuthHeader('POST', url, {}, config);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'X-AutoPoster/1.0',
      },
      body: JSON.stringify({ text }),
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

export async function uploadMedia(
  buffer: ArrayBuffer | Uint8Array,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
): Promise<{ success: boolean; media_id?: string; error?: string }> {
  try {
    const config = getXApiConfig();
    const url = 'https://upload.twitter.com/1.1/media/upload.json';

    // Prepare form data
    const formData = new FormData();
    const blob = new Blob([buffer], { type: mediaType });
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

    const data = (await response.json()) as { media_id_string: string };
    return { success: true, media_id: data.media_id_string };
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

