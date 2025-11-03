import { getSupabase } from '@/lib/supabase';

export type CandidateType = 'tweet' | 'rss';

export interface Candidate {
  id?: string;
  type: CandidateType;
  source: string;
  external_id: string;
  url?: string | null;
  title?: string | null;
  text?: string | null;
  image_url?: string | null;
  fetched_at?: string;
  used?: boolean;
}

export async function addCandidateIfNew(c: Candidate): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('candidates').upsert(
    [{
      type: c.type,
      source: c.source,
      external_id: c.external_id,
      url: c.url ?? null,
      title: c.title ?? null,
      text: c.text ?? null,
      image_url: c.image_url ?? null,
      fetched_at: c.fetched_at ?? new Date().toISOString(),
      used: c.used ?? false,
    }],
    { onConflict: 'external_id' }
  );
}

export async function listCandidates(limit = 20, type?: CandidateType): Promise<Candidate[]> {
  const supabase = getSupabase();
  let q = supabase
    .from('candidates')
    .select('id, type, source, external_id, url, title, text, image_url, fetched_at, used')
    .eq('used', false)
    .order('fetched_at', { ascending: false })
    .limit(limit);
  if (type) q = q.eq('type', type);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as Candidate[];
}

export async function markCandidateUsed(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('candidates').update({ used: true }).eq('id', id);
  if (error) throw error;
}

