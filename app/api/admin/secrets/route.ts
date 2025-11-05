import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Validate env quickly for clearer errors
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('automation_config')
      .select('id, llm_api_key, openrouter_api_key, x_api_key, x_api_secret, x_access_token, x_access_token_secret, oauth2_access_token, oauth2_expires_at, oauth2_scope')
      .single();

    if (error) {
      // Table missing
      if ((error as any).code === '42P01') {
        return NextResponse.json({ ok: true, initialized: false, has_llm_key: false, has_x_oauth1_keys: false, oauth2_connected: false, note: 'automation_config table not found. Run the provided SQL migration in Supabase.' });
      }
      // No row
      if ((error as any).code === 'PGRST116') {
        return NextResponse.json({ ok: true, initialized: true, has_llm_key: false, has_x_oauth1_keys: false, oauth2_connected: false });
      }
      return NextResponse.json({ ok: false, error: (error as any).message || 'Query failed', code: (error as any).code || null }, { status: 500 });
    }

    const hasLlmKey = !!(data?.llm_api_key || data?.openrouter_api_key);
    const hasXOauth1 = !!(data?.x_api_key && data?.x_api_secret && data?.x_access_token && data?.x_access_token_secret);
    const oauth2Connected = !!data?.oauth2_access_token;

    return NextResponse.json({
      ok: true,
      has_llm_key: hasLlmKey,
      has_x_oauth1_keys: hasXOauth1,
      oauth2_connected: oauth2Connected,
      oauth2_expires_at: data?.oauth2_expires_at || null,
      oauth2_scope: data?.oauth2_scope || null,
      env: {
        has_client_id: !!process.env.X_OAUTH_CLIENT_ID,
        has_client_secret: !!process.env.X_OAUTH_CLIENT_SECRET,
        has_supabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
        has_cron_secret: !!process.env.CRON_SECRET,
      },
    });
  } catch (e) {
    console.error('secrets GET failed', e);
    return NextResponse.json({ ok: false, error: String(e) || 'Failed to read secrets status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
    }
    const body = await request.json();
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (typeof body.openrouter_api_key === 'string') updates.openrouter_api_key = body.openrouter_api_key;
    if (typeof body.llm_api_key === 'string') updates.llm_api_key = body.llm_api_key;
    if (typeof body.x_api_key === 'string') updates.x_api_key = body.x_api_key;
    if (typeof body.x_api_secret === 'string') updates.x_api_secret = body.x_api_secret;
    if (typeof body.x_access_token === 'string') updates.x_access_token = body.x_access_token;
    if (typeof body.x_access_token_secret === 'string') updates.x_access_token_secret = body.x_access_token_secret;

    if (body.clear_openrouter) {
      updates.openrouter_api_key = null;
      updates.llm_api_key = null;
    }
    if (body.clear_x_oauth1) {
      updates.x_api_key = null;
      updates.x_api_secret = null;
      updates.x_access_token = null;
      updates.x_access_token_secret = null;
    }
    if (body.clear_oauth2) {
      updates.oauth2_access_token = null;
      updates.oauth2_refresh_token = null;
      updates.oauth2_expires_at = null;
      updates.oauth2_scope = null;
    }

    const supabase = getSupabase();
    const existing = await supabase.from('automation_config').select('id').single();
    if (existing.error && existing.error.code !== 'PGRST116') throw existing.error;

    if (existing.data?.id) {
      const { error } = await supabase
        .from('automation_config')
        .update(updates)
        .eq('id', existing.data.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('automation_config')
        .insert([{
          enabled: true,
          posting_times: ['09:00', '12:00', '14:00', '16:00', '18:00'],
          timezone: 'Australia/Sydney',
          randomize_minutes: 15,
          daily_limit: 5,
          llm_provider: 'openrouter',
          ...updates,
        }]);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('secrets POST failed', e);
    return NextResponse.json({ ok: false, error: 'Failed to update secrets' }, { status: 500 });
  }
}
