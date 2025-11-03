import { createHmac } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

interface XApiConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

async function getXApiConfig(): Promise<XApiConfig> {
  // Prefer env vars if all are present
  if (
    process.env.X_API_KEY &&
    process.env.X_API_SECRET &&
    process.env.X_ACCESS_TOKEN &&
    process.env.X_ACCESS_TOKEN_SECRET
  ) {
    return {
      apiKey: process.env.X_API_KEY,
      apiSecret: process.env.X_API_SECRET,
      accessToken: process.env.X_ACCESS_TOKEN,
      accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET,
    } as XApiConfig;
  }

  // Fallback: read from Supabase automation_config if available
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data } = await supabase
      .from('automation_config')
      .select('*')
      .single();
    if (data) {
      const apiKey = (data as any).x_api_key || (data as any).x_consumer_key;
      const apiSecret = (data as any).x_api_secret || (data as any).x_consumer_secret;
      const accessToken = (data as any).x_access_token;
      const accessTokenSecret = (data as any).x_access_token_secret;
      if (apiKey && apiSecret && accessToken && accessTokenSecret) {
        return {
          apiKey,
          apiSecret,
          accessToken,
          accessTokenSecret,
        };
      }
    }
  }

  throw new Error('Missing X API credentials. Set env vars (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET) or store them in Supabase automation_config (x_api_key, x_api_secret, x_access_token, x_access_token_secret).');
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

async function getOAuth2Bearer(): Promise<string | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('automation_config')
      .select('id, oauth2_access_token, oauth2_refresh_token, oauth2_expires_at, oauth2_scope')
      .single();
    if (error || !data) return null;

    const now = new Date();
    const expiresAt = data.oauth2_expires_at ? new Date(data.oauth2_expires_at) : null;
    if (data.oauth2_access_token && expiresAt && expiresAt.getTime() - now.getTime() > 60_000) {
      return data.oauth2_access_token;
    }

    // Try refresh
    if (data.oauth2_refresh_token) {
      const refreshed = await refreshOAuth2Token(data.id as string, data.oauth2_refresh_token);
      if (refreshed?.access_token) return refreshed.access_token;
    }
  } catch {}
  return null;
}

async function refreshOAuth2Token(rowId: string, refresh_token: string): Promise<{ access_token: string; refresh_token?: string; expires_in?: number } | null> {
  try {
    const clientId = process.env.X_OAUTH_CLIENT_ID;
    const clientSecret = process.env.X_OAUTH_CLIENT_SECRET;
    const tokenUrl = 'https://api.twitter.com/2/oauth2/token';
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
      client_id: clientId || '',
    });
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (clientSecret) {
      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    }

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers,
      body: params.toString(),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as any;
    const access_token = json.access_token as string;
    const expires_in = (json.expires_in as number) || 7200;
    const new_refresh = (json.refresh_token as string) || refresh_token;

    const supabase = getSupabase();
    await supabase.from('automation_config').update({
      oauth2_access_token: access_token,
      oauth2_refresh_token: new_refresh,
      oauth2_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
      oauth2_scope: json.scope || null,
      updated_at: new Date().toISOString(),
    }).eq('id', rowId);

    return { access_token, refresh_token: new_refresh, expires_in };
  } catch {
    return null;
  }
}

export async function oauthFetch(url: string, method: string, body?: any, headers: Record<string, string> = {}): Promise<Response> {
  // For v1.1 media upload, force OAuth1.0a (OAuth2 may not be supported)
  const forceOAuth1 = url.includes('upload.twitter.com/1.1/');
  // Prefer OAuth2 bearer if available; fallback to OAuth1.0a
  const bearer = forceOAuth1 ? null : await getOAuth2Bearer();
  const baseHeaders: Record<string, string> = {
    'User-Agent': 'X-AutoPoster/1.0',
    ...headers,
  };
  if (bearer) {
    return fetch(url, {
      method,
      headers: { ...baseHeaders, Authorization: `Bearer ${bearer}` },
      body,
    });
  }

  const config = await getXApiConfig();
  const authHeader = generateOAuthHeader(method, url, {}, config);
  return fetch(url, {
    method,
    headers: { ...baseHeaders, Authorization: authHeader },
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
  // Auto-choose simple upload for <=5MB, else attempt chunked with optional resize
  try {
    const res = await fetch(imageUrl, { headers: { 'User-Agent': 'X-AutoPoster/1.0' } });
    if (!res.ok) return { success: false, error: `download failed: ${res.status}` };
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    let buf = Buffer.from(await res.arrayBuffer());
    if (buf.length <= 5 * 1024 * 1024) {
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
    }

    // Try to resize/compress if sharp is available
    try {
      const sharp = await import('sharp');
      const img = sharp.default ? sharp.default(buf) : (sharp as any)(buf);
      const resized = await img.resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
      buf = resized;
    } catch {}

    return await uploadMediaChunked(buf, contentType);
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

async function uploadMediaChunked(buf: Buffer, contentType: string): Promise<{ success: boolean; media_id?: string; error?: string }> {
  try {
    const initUrl = 'https://upload.twitter.com/1.1/media/upload.json';
    const totalBytes = buf.length.toString();
    const mediaType = contentType.startsWith('image/') ? contentType : 'image/jpeg';
    const initBody = new URLSearchParams({ command: 'INIT', media_type: mediaType, total_bytes: totalBytes, media_category: 'tweet_image' });
    const initRes = await oauthFetch(initUrl, 'POST', initBody.toString(), { 'Content-Type': 'application/x-www-form-urlencoded' });
    if (!initRes.ok) return { success: false, error: await initRes.text() };
    const initData = (await initRes.json()) as { media_id_string: string };
    const mediaId = initData.media_id_string;

    const chunkSize = 4 * 1024 * 1024; // 4MB
    let segmentIndex = 0;
    for (let offset = 0; offset < buf.length; offset += chunkSize) {
      const chunk = buf.subarray(offset, Math.min(offset + chunkSize, buf.length));
      const form = new FormData();
      form.append('command', 'APPEND');
      form.append('media_id', mediaId);
      form.append('segment_index', String(segmentIndex++));
      // Copy to a fresh ArrayBuffer to ensure non-shared backing store
      const ab = new ArrayBuffer(chunk.byteLength);
      new Uint8Array(ab).set(chunk);
      form.append('media', new Blob([ab]), 'chunk');
      const appendRes = await oauthFetch(initUrl, 'POST', form as any, {});
      if (!appendRes.ok) return { success: false, error: await appendRes.text() };
    }

    const finBody = new URLSearchParams({ command: 'FINALIZE', media_id: mediaId });
    const finRes = await oauthFetch(initUrl, 'POST', finBody.toString(), { 'Content-Type': 'application/x-www-form-urlencoded' });
    if (!finRes.ok) return { success: false, error: await finRes.text() };
    const finData = (await finRes.json()) as any;
    if (finData.processing_info) {
      let state = finData.processing_info.state as string;
      let checkAfter = finData.processing_info.check_after_secs || 1;
      while (state === 'in_progress' || state === 'pending') {
        await new Promise(r => setTimeout(r, checkAfter * 1000));
        const statusRes = await oauthFetch(`${initUrl}?command=STATUS&media_id=${mediaId}`, 'GET');
        if (!statusRes.ok) return { success: false, error: await statusRes.text() };
        const statusData = (await statusRes.json()) as any;
        state = statusData.processing_info?.state;
        checkAfter = statusData.processing_info?.check_after_secs || 1;
        if (state === 'failed') return { success: false, error: JSON.stringify(statusData) };
      }
    }
    return { success: true, media_id: mediaId };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function uploadMedia(
  buffer: ArrayBuffer | Uint8Array,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
): Promise<{ success: boolean; media_id?: string; expires_after_secs?: number; error?: string }> {
  try {
    const config = await getXApiConfig();
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
    const config = await getXApiConfig();
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
