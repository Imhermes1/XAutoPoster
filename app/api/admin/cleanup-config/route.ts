import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST() {
  try {
    // Get all rows ordered by created_at
    const { data: allRows, error: fetchError } = await supabase
      .from('automation_config')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    if (!allRows || allRows.length === 0) {
      return NextResponse.json({ message: 'No rows found' });
    }

    if (allRows.length === 1) {
      return NextResponse.json({ message: 'Only one row exists, no cleanup needed', row: allRows[0] });
    }

    // Keep the first (oldest) row
    const keepRow = allRows[0];
    const deleteIds = allRows.slice(1).map(row => row.id);

    // Delete all other rows
    const { error: deleteError } = await supabase
      .from('automation_config')
      .delete()
      .in('id', deleteIds);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      message: 'Cleanup successful',
      kept_row: keepRow,
      deleted_count: deleteIds.length,
      deleted_ids: deleteIds,
    });
  } catch (error: any) {
    console.error('Cleanup failed:', error);
    return NextResponse.json({
      error: 'Cleanup failed',
      message: error.message,
    }, { status: 500 });
  }
}
