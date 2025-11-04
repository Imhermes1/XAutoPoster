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
  overall_score?: number | null;
  likes_count?: number;
  retweets_count?: number;
  replies_count?: number;
  engagement_score?: number;
}

export async function addCandidateIfNew(c: Candidate): Promise<boolean> {
  const supabase = getSupabase();

  // Check if already exists
  const { data: existing } = await supabase
    .from('candidates')
    .select('id')
    .eq('external_id', c.external_id)
    .single();

  if (existing) {
    return false; // Duplicate
  }

  // Insert new candidate
  const { error } = await supabase.from('candidates').insert([{
    type: c.type,
    source: c.source,
    external_id: c.external_id,
    url: c.url ?? null,
    title: c.title ?? null,
    text: c.text ?? null,
    image_url: c.image_url ?? null,
    fetched_at: c.fetched_at ?? new Date().toISOString(),
    used: c.used ?? false,
    likes_count: c.likes_count ?? 0,
    retweets_count: c.retweets_count ?? 0,
    replies_count: c.replies_count ?? 0,
  }]);

  return !error; // True if inserted successfully
}

export async function listCandidates(limit = 20, type?: CandidateType): Promise<Candidate[]> {
  const supabase = getSupabase();
  let q = supabase
    .from('candidates')
    .select('id, type, source, external_id, url, title, text, image_url, fetched_at, used, overall_score, likes_count, retweets_count, replies_count, engagement_score')
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

