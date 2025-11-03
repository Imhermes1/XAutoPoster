"use client";
import { useEffect, useState } from 'react';

type Source = { id: string; url: string; category?: string | null };
type Topic = { id: string; topic: string; remaining?: number };

export default function AdminPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newCount, setNewCount] = useState(1);
  const [history, setHistory] = useState<any[]>([]);

  const refresh = async () => {
    const [s, t, h] = await Promise.all([
      fetch('/api/admin/sources').then(r => r.json()),
      fetch('/api/admin/topics').then(r => r.json()),
      fetch('/api/admin/history?limit=20').then(r => r.json()),
    ]);
    setSources(s.sources || []);
    setTopics(t.topics || []);
    setHistory(h.items || []);
  };

  useEffect(() => { refresh(); }, []);

  const addSource = async () => {
    await fetch('/api/admin/sources', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newUrl, category: newCat })
    });
    setNewUrl(''); setNewCat('');
    refresh();
  };

  const delSource = async (id: string) => {
    await fetch(`/api/admin/sources/${id}`, { method: 'DELETE' });
    refresh();
  };

  const addTopic = async () => {
    await fetch('/api/admin/topics', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: newTopic, count: newCount })
    });
    setNewTopic(''); setNewCount(1);
    refresh();
  };

  const setRemaining = async (id: string, remaining: number) => {
    await fetch(`/api/admin/topics/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remaining }) });
    refresh();
  };

  return (
    <main>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Admin Dashboard</h1>

      <section style={{ marginTop: 24 }}>
        <h2>Sources</h2>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input placeholder="Feed URL" value={newUrl} onChange={e => setNewUrl(e.target.value)} style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
          <input placeholder="Category (optional)" value={newCat} onChange={e => setNewCat(e.target.value)} style={{ width: 200, padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
          <button onClick={addSource}>Add</button>
        </div>
        <ul style={{ marginTop: 12 }}>
          {sources.map(s => (
            <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <span>{s.url}{s.category ? ` — ${s.category}` : ''}</span>
              <button onClick={() => delSource(s.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Topics</h2>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input placeholder="Topic text" value={newTopic} onChange={e => setNewTopic(e.target.value)} style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
          <input type="number" min={1} value={newCount} onChange={e => setNewCount(parseInt(e.target.value || '1', 10))} style={{ width: 100, padding: 8, border: '1px solid #ccc', borderRadius: 6 }} />
          <button onClick={addTopic}>Add</button>
        </div>
        <ul style={{ marginTop: 12 }}>
          {topics.map(t => (
            <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ flex: 1 }}>{t.topic}</span>
              <span>Remaining: {t.remaining ?? 1}</span>
              <input type="number" min={0} defaultValue={t.remaining ?? 1} onBlur={e => setRemaining(t.id, parseInt(e.target.value || '0', 10))} style={{ width: 80 }} />
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Recent Posts</h2>
        <ul style={{ marginTop: 8 }}>
          {history.map((h) => (
            <li key={h.id} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#666' }}>{new Date(h.posted_at).toLocaleString()}</div>
              <div>{h.text}</div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

