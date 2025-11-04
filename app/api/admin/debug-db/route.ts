import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET() {
  try {
    // Check if env vars exist
    const hasEnvVars = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Try to query the table
    const { data, error, count } = await supabase
      .from('automation_config')
      .select('*', { count: 'exact' });

    return NextResponse.json({
      env_vars_present: hasEnvVars,
      supabase_url: process.env.SUPABASE_URL ? 'Present' : 'Missing',
      query_error: error ? { code: error.code, message: error.message, details: error.details } : null,
      row_count: count,
      rows: data,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Exception occurred',
      message: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
