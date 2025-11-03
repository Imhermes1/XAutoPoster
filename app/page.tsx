"use client";

import { useEffect, useState } from 'react';

type Source = { id: string; url: string; category?: string | null };
type Topic = { id: string; topic: string; remaining?: number };

export default function Page() {
  // Compose + quick actions
  const [compose, setCompose] = useState('');
  const [posting, setPosting] = useState(false);
  const [tweetToQuote, setTweetToQuote] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Data lists
  const [sources, setSources] = useState<Source[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  // Inputs
  const [newUrl, setNewUrl] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newCount, setNewCount] = useState(1);
  const [newHandle, setNewHandle] = useState('');
  const [newQuery, setNewQuery] = useState('');

  const refresh = async () => {
    try {
      const [s, t, h, a, k, cand] = await Promise.all([
        fetch('/api/admin/sources').then(r => r.json()),
        fetch('/api/admin/topics').then(r => r.json()),
        fetch('/api/admin/history?limit=20').then(r => r.json()),
        fetch('/api/admin/x/accounts').then(r => r.json()).catch(() => ({ accounts: [] })),
        fetch('/api/admin/x/keywords').then(r => r.json()).catch(() => ({ keywords: [] })),
        fetch('/api/admin/candidates?limit=20').then(r => r.json()).catch(() => ({ items: [] })),
      ]);
      setSources(s.sources || []);
      setTopics(t.topics || []);
      setHistory(h.items || []);
      setAccounts(a.accounts || []);
      setKeywords(k.keywords || []);
      setCandidates(cand.items || []);
    } catch (e) {
      console.error('refresh failed', e);
    }
  };

  useEffect(() => { refresh(); }, []);

  // Compose actions
  const aiEnhance = async () => {
    if (!compose.trim()) return;
    const res = await fetch('/api/admin/ai/enhance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: compose }) });
    const data = await res.json();
    if (res.ok) setCompose(data.text); else alert(data.error || 'AI enhance failed');
  };

  const postNow = async () => {
    if (!compose.trim() || compose.length > 280) return;
    setPosting(true);
    try {
      const res = await fetch('/api/admin/post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: compose }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Post failed');
      setCompose('');
      refresh();
      alert('Posted!');
    } catch (e: any) { alert(e.message); } finally { setPosting(false); }
  };

  const quoteNow = async (useAi: boolean) => {
    if (!tweetToQuote.trim()) return;
    setPosting(true);
    try {
      let text = compose;
      if (useAi || !text.trim()) {
        const resAi = await fetch('/api/admin/ai/enhance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text || 'Add a concise, insightful comment.' }) });
        const dataAi = await resAi.json();
        if (resAi.ok) text = dataAi.text; else throw new Error(dataAi.error || 'AI failed');
      }
      const res = await fetch('/api/admin/post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, quote_tweet_id: tweetToQuote }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Quote failed');
      setTweetToQuote(''); setCompose(''); refresh(); alert('Quoted!');
    } catch (e: any) { alert(e.message); } finally { setPosting(false); }
  };

  const postWithImageUrl = async () => {
    if (!compose.trim() || !imageUrl.trim() || compose.length > 280) return;
    setPosting(true);
    try {
      const res = await fetch('/api/admin/post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: compose, image_url: imageUrl }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Post failed');
      setCompose(''); setImageUrl(''); refresh(); alert('Posted with image!');
    } catch (e: any) { alert(e.message); } finally { setPosting(false); }
  };

  // Lists actions
  const addSource = async () => {
    if (!newUrl.trim()) return;
    await fetch('/api/admin/sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: newUrl, category: newCat }) });
    setNewUrl(''); setNewCat(''); refresh();
  };
  const delSource = async (id: string) => { await fetch(`/api/admin/sources/${id}`, { method: 'DELETE' }); refresh(); };

  const addTopic = async () => {
    if (!newTopic.trim()) return;
    await fetch('/api/admin/topics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: newTopic, count: newCount }) });
    setNewTopic(''); setNewCount(1); refresh();
  };
  const setRemaining = async (id: string, remaining: number) => { await fetch(`/api/admin/topics/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remaining }) }); refresh(); };

  const addAccount = async () => { if (!newHandle.trim()) return; await fetch('/api/admin/x/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle: newHandle }) }); setNewHandle(''); refresh(); };
  const removeAccount = async (id: string) => { await fetch(`/api/admin/x/accounts/${id}`, { method: 'DELETE' }); refresh(); };
  const addKeyword = async () => { if (!newQuery.trim()) return; await fetch('/api/admin/x/keywords', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: newQuery }) }); setNewQuery(''); refresh(); };
  const removeKeyword = async (id: string) => { await fetch(`/api/admin/x/keywords/${id}`, { method: 'DELETE' }); refresh(); };
  const ingestNow = async () => { await fetch('/api/admin/candidates/ingest', { method: 'POST' }); refresh(); };
  const aiQuoteCandidate = async (id: string) => { const res = await fetch(`/api/admin/candidates/${id}/quote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }); const data = await res.json(); if (!res.ok) alert(data.error || 'Quote failed'); else { alert('Quoted!'); refresh(); } };
  const aiPostRssCandidate = async (c: any) => {
    // Generate a post about the RSS item, then post with image if present
    const topic = `${c.title || ''} ${c.url || ''}`.trim();
    const resPrev = await fetch('/api/manual/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic }) });
    const dPrev = await resPrev.json();
    if (!resPrev.ok) return alert(dPrev.error || 'AI preview failed');
    const res = await fetch('/api/admin/post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: dPrev.post, image_url: c.image_url || '' }) });
    const data = await res.json();
    if (!res.ok) alert(data.error || 'Post failed'); else { alert('Posted!'); refresh(); }
  };

  const container: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif' };
  const section: React.CSSProperties = { padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' };
  const input: React.CSSProperties = { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, width: '100%', boxSizing: 'border-box' };
  const button: React.CSSProperties = { padding: '8px 12px', borderRadius: 6, border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer' };
  const danger: React.CSSProperties = { ...button, background: '#dc2626' } as React.CSSProperties;

  return (
    <main style={container}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>X Autoposter</h1>

      {/* Compose / Quote / Image */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div style={section}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Compose</h2>
          <textarea value={compose} onChange={e => setCompose(e.target.value)} placeholder="What's happening?" style={{ ...input, minHeight: 120 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <div style={{ fontSize: 12, color: compose.length > 280 ? '#dc2626' : '#666' }}>{compose.length}/280</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={aiEnhance} disabled={!compose.trim()} style={button}>AI Improve</button>
              <button onClick={postNow} disabled={!compose.trim() || compose.length > 280 || posting} style={{ ...button, background: '#16a34a' }}>{posting ? 'Posting…' : 'Post Now'}</button>
            </div>
          </div>
        </div>
        <div style={section}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Quote Tweet</h2>
          <input placeholder="Tweet ID or URL" value={tweetToQuote} onChange={e => setTweetToQuote(e.target.value)} style={input} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => quoteNow(true)} disabled={!tweetToQuote} style={button}>AI Comment & Quote</button>
            <button onClick={() => quoteNow(false)} disabled={!tweetToQuote} style={{ ...button, background: '#6b7280' }}>Quote Now</button>
          </div>
        </div>
        <div style={section}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Post with Image URL</h2>
          <input placeholder="Image URL" value={imageUrl} onChange={e => setImageUrl(e.target.value)} style={input} />
          <button onClick={postWithImageUrl} disabled={!imageUrl || !compose || compose.length > 280} style={{ ...button, marginTop: 8 }}>Post with Image</button>
          <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>Downloads and re-uploads the image to attach it.</div>
        </div>
      </div>

      {/* Sources / Topics / Accounts / Keywords */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div style={section}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>RSS Sources</h2>
          <input placeholder="Feed URL" value={newUrl} onChange={e => setNewUrl(e.target.value)} style={{ ...input, marginBottom: 6 }} />
          <input placeholder="Category (optional)" value={newCat} onChange={e => setNewCat(e.target.value)} style={{ ...input, marginBottom: 6 }} />
          <button onClick={addSource} style={button}>Add Source</button>
          <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 8 }}>
            {sources.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, marginBottom: 6, background: '#fff', border: '1px solid #eee', borderRadius: 6, fontSize: 12 }}>
                <span style={{ flex: 1, wordBreak: 'break-word' }}>{s.url}{s.category ? ` (${s.category})` : ''}</span>
                <button onClick={() => delSource(s.id)} style={{ ...danger, padding: '4px 8px' }}>Delete</button>
              </div>
            ))}
          </div>
        </div>
        <div style={section}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Manual Topics</h2>
          <input placeholder="Topic text" value={newTopic} onChange={e => setNewTopic(e.target.value)} style={{ ...input, marginBottom: 6 }} />
          <input type="number" min={1} value={newCount} onChange={e => setNewCount(parseInt(e.target.value || '1', 10))} style={{ ...input, marginBottom: 6 }} />
          <button onClick={addTopic} style={button}>Add Topic</button>
          <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 8 }}>
            {topics.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, marginBottom: 6, background: '#fff', border: '1px solid #eee', borderRadius: 6, fontSize: 12 }}>
                <span style={{ flex: 1 }}>{t.topic}</span>
                <input type="number" min={0} defaultValue={t.remaining ?? 1} onBlur={e => setRemaining(t.id, parseInt(e.target.value || '0', 10))} style={{ ...input, width: 70 }} />
              </div>
            ))}
          </div>
        </div>
        <div style={section}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>X Accounts</h2>
          <input placeholder="@handle" value={newHandle} onChange={e => setNewHandle(e.target.value)} style={{ ...input, marginBottom: 6 }} />
          <button onClick={addAccount} style={button}>Add Account</button>
          <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 8 }}>
            {accounts.map(acc => (
              <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, marginBottom: 6, background: '#fff', border: '1px solid #eee', borderRadius: 6, fontSize: 12 }}>
                <span>@{acc.handle.replace(/^@/, '')}</span>
                <button onClick={() => removeAccount(acc.id)} style={{ ...danger, padding: '4px 8px' }}>Delete</button>
              </div>
            ))}
          </div>
        </div>
        <div style={section}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Keywords</h2>
          <input placeholder="Search query (e.g. OpenAI)" value={newQuery} onChange={e => setNewQuery(e.target.value)} style={{ ...input, marginBottom: 6 }} />
          <button onClick={addKeyword} style={button}>Add Keyword</button>
          <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 8 }}>
            {keywords.map(kw => (
              <div key={kw.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, marginBottom: 6, background: '#fff', border: '1px solid #eee', borderRadius: 6, fontSize: 12 }}>
                <span>{kw.query}</span>
                <button onClick={() => removeKeyword(kw.id)} style={{ ...danger, padding: '4px 8px' }}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Candidates and History */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={section}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Candidates</h2>
          <button onClick={ingestNow} style={{ ...button, marginBottom: 8 }}>Ingest Now</button>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {candidates.map(c => (
              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', alignItems: 'center', gap: 8, padding: 8, marginBottom: 6, background: '#fff', border: '1px solid #eee', borderRadius: 6, fontSize: 12 }}>
                <div>{c.image_url ? <img src={c.image_url} alt="thumb" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 4 }} /> : <div style={{ width: 64, height: 64, background: '#f3f4f6', borderRadius: 4 }} />}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{c.type.toUpperCase()} — {c.source}</div>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 420 }}>{c.title || c.text}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {c.type === 'tweet' ? (
                    <button onClick={() => aiQuoteCandidate(c.id)} style={{ ...button, background: '#16a34a' }}>AI Comment & Quote</button>
                  ) : (
                    <button onClick={() => aiPostRssCandidate(c)} style={{ ...button, background: '#0ea5e9' }}>AI Post + Image</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={section}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Recent Posts</h2>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {history.length === 0 ? (
              <div style={{ color: '#999', fontSize: 14 }}>No posts yet</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {history.map(h => (
                  <li key={h.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: 11, color: '#666' }}>{new Date(h.posted_at).toLocaleString()}</div>
                    <div style={{ marginTop: 4, fontSize: 13 }}>{h.text}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
