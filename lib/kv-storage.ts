import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.KV_URL;
    const token = process.env.KV_TOKEN;
    if (!url || !token) throw new Error('KV_URL and KV_TOKEN must be set');
    redis = new Redis({ url, token });
  }
  return redis;
}

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
  const r = getRedis();
  const timestamp = Date.now();
  const key = `post:${timestamp}`;
  await r.set(key, JSON.stringify(post), { ex: 30 * 24 * 60 * 60 });
  await r.lpush('posts:history', key);
}

export async function getPostCount(days: number = 1): Promise<number> {
  const r = getRedis();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const posts = (await r.lrange('posts:history', 0, -1)) as string[];
  let count = 0;
  for (const postKey of posts) {
    const post = await r.get<string>(postKey);
    if (post) {
      const parsed = JSON.parse(post) as PostRecord;
      if (parsed.postedAt > cutoff) count++;
    }
  }
  return count;
}

export async function addManualTopic(topic: string): Promise<ManualTopic> {
  const r = getRedis();
  const manualTopic: ManualTopic = {
    id: `topic:${Date.now()}`,
    topic,
    addedAt: Date.now(),
    used: false,
  };
  await r.lpush('topics:manual', JSON.stringify(manualTopic));
  return manualTopic;
}

export async function getUnusedManualTopics(): Promise<ManualTopic[]> {
  const r = getRedis();
  const topics = (await r.lrange('topics:manual', 0, -1)) as string[];
  const usedIds = new Set<string>();
  const usedKeys = await r.keys('topic:used:*');
  usedKeys.forEach((k) => usedIds.add(k.replace('topic:used:', '')));
  return topics
    .map((t) => JSON.parse(t) as ManualTopic)
    .filter((t) => !t.used && !usedIds.has(t.id));
}

export async function markTopicAsUsed(id: string): Promise<void> {
  const r = getRedis();
  await r.set(`topic:used:${id}`, '1', { ex: 30 * 24 * 60 * 60 });
}

