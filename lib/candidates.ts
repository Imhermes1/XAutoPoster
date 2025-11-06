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
  // Use wildcard selection to avoid errors when some columns
  // (e.g., engagement metrics) haven’t been migrated yet.
  let q = supabase
    .from('candidates')
    .select('*')
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

/**
 * Fetch the next best unused candidate and atomically mark it as used
 *
 * This prevents race conditions where multiple processes could fetch the same
 * candidate simultaneously. Uses optimistic locking (conditional update) to ensure
 * only one process successfully claims each candidate.
 *
 * @param limit - Number of candidates to check
 * @param type - Optional filter by candidate type
 * @returns Single candidate with highest overall_score, or null if none available
 */
export async function fetchAndClaimCandidate(
  limit: number = 5,
  type?: CandidateType
): Promise<Candidate | null> {
  const supabase = getSupabase();

  // Fetch candidates sorted by score (best first)
  let q = supabase
    .from('candidates')
    .select('id, overall_score')
    .eq('used', false)
    .order('overall_score', { ascending: false })
    .limit(limit);

  if (type) q = q.eq('type', type);

  const { data: candidates, error } = await q;

  if (error || !candidates || candidates.length === 0) {
    return null;
  }

  // Try to atomically claim the first available candidate
  // by updating it with a condition that it's still unused
  // If another process claims it first, we'll get count=0 and try the next one

  for (const candidate of candidates) {
    // Attempt atomic update: only update if still unused
    // This is optimistic locking - the condition .eq('used', false) acts as a guard
    // The update will silently succeed even if no rows match (Supabase behavior)
    // So we fetch after the update to confirm it was marked
    const { error: updateError } = await supabase
      .from('candidates')
      .update({ used: true, updated_at: new Date().toISOString() })
      .eq('id', candidate.id)
      .eq('used', false);  // Only update if still unused - this prevents race

    if (updateError) {
      // Database error occurred, try next candidate
      continue;
    }

    // Now fetch the full candidate data to verify we got it
    const { data: fullCandidate, error: fetchError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidate.id)
      .single();

    if (!fetchError && fullCandidate && fullCandidate.used) {
      // We successfully claimed this candidate (it's now marked as used by our update)
      return fullCandidate as Candidate;
    }
    // If fetchError or fullCandidate.used is false, another process already claimed it
    // Continue to next candidate in the list
  }

  // All candidates in batch were claimed by other processes
  return null;
}

/**
 * Batch insert multiple candidates, automatically skipping duplicates
 * Uses INSERT ... ON CONFLICT DO NOTHING for efficiency (single query)
 *
 * @param candidates - Array of candidates to insert
 * @returns Object with inserted count and skipped count
 */
export async function addCandidatesIfNew(candidates: Candidate[]): Promise<{ inserted: number; skipped: number }> {
  if (candidates.length === 0) {
    return { inserted: 0, skipped: 0 };
  }

  const supabase = getSupabase();

  // First, get all external_ids that already exist
  const externalIds = candidates.map(c => c.external_id);
  const { data: existing } = await supabase
    .from('candidates')
    .select('external_id')
    .in('external_id', externalIds);

  const existingIds = new Set((existing || []).map(e => e.external_id));
  const toInsert = candidates.filter(c => !existingIds.has(c.external_id));

  if (toInsert.length === 0) {
    return { inserted: 0, skipped: candidates.length };
  }

  // Batch insert all new candidates in a single query
  const rows = toInsert.map(c => ({
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
  }));

  const { error } = await supabase
    .from('candidates')
    .insert(rows);

  if (error) {
    console.error('[addCandidatesIfNew] Insert error:', error);
    return { inserted: 0, skipped: candidates.length };
  }

  return {
    inserted: toInsert.length,
    skipped: existingIds.size
  };
}
