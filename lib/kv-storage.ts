import { getSupabase } from '@/lib/supabase';

export interface PostRecord {
  text: string;
  postedAt: number;
  topicId?: string;
}

export interface ManualTopic {
  id: string;
  topic: string;
  addedAt: number;
  used: boolean;
  remaining?: number;
}

export async function savePostHistory(post: PostRecord): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('posts_history').insert({
    text: post.text,
    posted_at: new Date(post.postedAt).toISOString(),
    topic_id: post.topicId ?? null,
  });
  if (error) throw error;
}

export async function getPostCount(days: number = 1): Promise<number> {
  const supabase = getSupabase();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('posts_history')
    .select('*', { count: 'exact', head: true })
    .gt('posted_at', since);
  if (error) throw error;
  return count || 0;
}

export async function addManualTopic(topic: string): Promise<ManualTopic> {
  const supabase = getSupabase();
  const manualTopic: ManualTopic = {
    id: `topic:${Date.now()}`,
    topic,
    addedAt: Date.now(),
    used: false,
    remaining: 1,
  };
  const { error } = await supabase.from('manual_topics').insert({
    id: manualTopic.id,
    topic: manualTopic.topic,
    added_at: new Date(manualTopic.addedAt).toISOString(),
    used: manualTopic.used,
    remaining: manualTopic.remaining,
  });
  if (error) throw error;
  return manualTopic;
}

export async function getUnusedManualTopics(): Promise<ManualTopic[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('manual_topics')
    .select('id, topic, added_at, used, remaining')
    .or('used.eq.false,remaining.gt.0')
    .order('added_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    topic: row.topic,
    addedAt: new Date(row.added_at).getTime(),
    used: row.used,
    remaining: row.remaining ?? 0,
  }));
}

export async function markTopicAsUsed(id: string): Promise<void> {
  const supabase = getSupabase();
  // Decrement remaining if present; else mark used
  const { data, error: selErr } = await supabase
    .from('manual_topics')
    .select('remaining')
    .eq('id', id)
    .single();
  if (selErr) throw selErr;
  const remaining = (data?.remaining ?? 0) as number;
  if (remaining && remaining > 1) {
    const { error } = await supabase
      .from('manual_topics')
      .update({ remaining: remaining - 1 })
      .eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('manual_topics')
      .update({ used: true, remaining: 0 })
      .eq('id', id);
    if (error) throw error;
  }
}

export async function setManualTopicRemaining(id: string, remaining: number): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('manual_topics')
    .update({ remaining, used: remaining <= 0 })
    .eq('id', id);
  if (error) throw error;
}
