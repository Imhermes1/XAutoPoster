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

    console.log('[GET /api/admin/config] Query result:', {
      has_data: !!data,
      error_code: error?.code,
      error_message: error?.message,
      data_preview: data ? { id: data.id, llm_model: data.llm_model, has_brand_voice: !!data.brand_voice_instructions } : null
    });

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // If no config exists, return null - user must configure
    if (!data) {
      console.log('[GET /api/admin/config] No data found');
      return NextResponse.json({
        config: null,
      });
    }

    console.log('[GET /api/admin/config] Returning data from database');
    return NextResponse.json({ config: data });
  } catch (error) {
    console.error('Failed to fetch config:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const config = await request.json();

    console.log('Received config:', {
      id: config.id,
      has_brand_voice: !!config.brand_voice_instructions,
      brand_voice_length: config.brand_voice_instructions?.length || 0
    });

    // Validate required fields
    if (!config.llm_model) {
      return NextResponse.json({ error: 'LLM model is required' }, { status: 400 });
    }

    const payload = {
      enabled: config.enabled ?? true,
      posting_times: config.posting_times ?? ['09:00', '12:00', '14:00', '16:00', '18:00'],
      timezone: config.timezone ?? 'Australia/Sydney',
      randomize_minutes: config.randomize_minutes ?? 15,
      daily_limit: config.daily_limit ?? 5,
      llm_model: config.llm_model,
      llm_provider: config.llm_provider ?? 'openrouter',
      brand_voice_instructions: config.brand_voice_instructions ?? null,
      updated_at: new Date().toISOString(),
    };

    console.log('Payload to save:', {
      has_brand_voice: !!payload.brand_voice_instructions,
      brand_voice_length: payload.brand_voice_instructions?.length || 0
    });

    if (config.id) {
      // Update existing
      console.log('Updating existing config with ID:', config.id);
      const { data, error } = await supabase
        .from('automation_config')
        .update(payload)
        .eq('id', config.id)
        .select('id, enabled, posting_times, timezone, randomize_minutes, daily_limit, llm_model, llm_provider, brand_voice_instructions, updated_at, created_at')
        .single();

      if (error) {
        console.error('Update error:', error);
        throw error;
      }
      console.log('Updated data:', {
        has_brand_voice: !!data?.brand_voice_instructions,
        brand_voice_length: data?.brand_voice_instructions?.length || 0
      });
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
