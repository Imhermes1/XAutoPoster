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

