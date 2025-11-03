import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Throw at runtime when used; avoid build-time failure
  console.warn('Supabase env vars missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : (null as any);

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
}

export async function savePostHistory(post: PostRecord): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('posts_history').insert({
    text: post.text,
    posted_at: new Date(post.postedAt).toISOString(),
    topic_id: post.topicId ?? null,
  });
  if (error) throw error;
}

export async function getPostCount(days: number = 1): Promise<number> {
  if (!supabase) throw new Error('Supabase not configured');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('posts_history')
    .select('*', { count: 'exact', head: true })
    .gt('posted_at', since);
  if (error) throw error;
  return count || 0;
}

export async function addManualTopic(topic: string): Promise<ManualTopic> {
  if (!supabase) throw new Error('Supabase not configured');
  const manualTopic: ManualTopic = {
    id: `topic:${Date.now()}`,
    topic,
    addedAt: Date.now(),
    used: false,
  };
  const { error } = await supabase.from('manual_topics').insert({
    id: manualTopic.id,
    topic: manualTopic.topic,
    added_at: new Date(manualTopic.addedAt).toISOString(),
    used: manualTopic.used,
  });
  if (error) throw error;
  return manualTopic;
}

export async function getUnusedManualTopics(): Promise<ManualTopic[]> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('manual_topics')
    .select('id, topic, added_at, used')
    .eq('used', false)
    .order('added_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    topic: row.topic,
    addedAt: new Date(row.added_at).getTime(),
    used: row.used,
  }));
}

export async function markTopicAsUsed(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('manual_topics')
    .update({ used: true })
    .eq('id', id);
  if (error) throw error;
}
