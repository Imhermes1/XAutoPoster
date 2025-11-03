import { getSupabase } from '@/lib/supabase';

export interface Source {
  id: string;
  url: string;
  category?: string | null;
  created_at?: string;
}

export async function listSources(): Promise<Source[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('sources')
    .select('id, url, category, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as any;
}

export async function addSource(url: string, category?: string): Promise<Source> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('sources')
    .insert({ url, category: category || null })
    .select('id, url, category, created_at')
    .single();
  if (error) throw error;
  return data as any;
}

export async function deleteSource(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('sources').delete().eq('id', id);
  if (error) throw error;
}

