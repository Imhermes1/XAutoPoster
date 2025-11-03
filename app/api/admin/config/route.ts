import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('automation_config')
      .select('id, enabled, posting_times, timezone, randomize_minutes, daily_limit, llm_model, llm_provider, brand_voice_instructions, updated_at, created_at')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // If no config exists, return default
    if (!data) {
      return NextResponse.json({
        config: {
          id: null,
          enabled: true,
          posting_times: ['09:00', '13:00', '18:00'],
          timezone: 'UTC',
          randomize_minutes: 15,
          daily_limit: 2,
          llm_model: 'google/gemini-2.0-flash-exp:free',
          llm_provider: 'openrouter',
        },
      });
    }

    return NextResponse.json({ config: data });
  } catch (error) {
    console.error('Failed to fetch config:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const config = await request.json();

    // Ensure required fields
    const payload = {
      enabled: config.enabled ?? true,
      posting_times: config.posting_times ?? ['09:00', '13:00', '18:00'],
      timezone: config.timezone ?? 'UTC',
      randomize_minutes: config.randomize_minutes ?? 15,
      daily_limit: config.daily_limit ?? 2,
      llm_model: config.llm_model ?? 'google/gemini-2.0-flash-exp:free',
      llm_provider: config.llm_provider ?? 'openrouter',
      updated_at: new Date().toISOString(),
    };

    if (config.id) {
      // Update existing
      const { data, error } = await supabase
        .from('automation_config')
        .update(payload)
        .eq('id', config.id)
        .select('id, enabled, posting_times, timezone, randomize_minutes, daily_limit, llm_model, llm_provider, brand_voice_instructions, updated_at, created_at')
        .single();

      if (error) throw error;
      return NextResponse.json({ config: data });
    } else {
      // Create new
      const { data, error } = await supabase
        .from('automation_config')
        .insert([payload])
        .select('id, enabled, posting_times, timezone, randomize_minutes, daily_limit, llm_model, llm_provider, brand_voice_instructions, updated_at, created_at')
        .single();

      if (error) throw error;
      return NextResponse.json({ config: data });
    }
  } catch (error) {
    console.error('Failed to save config:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
