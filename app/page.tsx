"use client";

import { useEffect, useState } from 'react';

type Source = { id: string; url: string; category?: string | null };
type Topic = { id: string; topic: string; remaining?: number };
type AutomationConfig = {
  id: string;
  enabled: boolean;
  posting_times: string[];
  timezone: string;
  randomize_minutes: number;
  daily_limit: number;
  llm_model: string;
  llm_provider: string;
  brand_voice_instructions?: string;
};
type Media = { id: string; file_name: string; file_size: number; uploaded_at: string };

export default function Page() {
  // Admin sidebar toggle
  const [showAdmin, setShowAdmin] = useState(false);

  // Compose + quick actions
  const [compose, setCompose] = useState('');
  const [posting, setPosting] = useState(false);
  const [aiImproving, setAiImproving] = useState(false);
  const [tweetToQuote, setTweetToQuote] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Data lists
  const [sources, setSources] = useState<Source[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<any>(null);

  // Inputs
  const [newUrl, setNewUrl] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newCount, setNewCount] = useState(1);
  const [newHandle, setNewHandle] = useState('');
  const [newQuery, setNewQuery] = useState('');
  const [bulkCount, setBulkCount] = useState(1);
  const [bulkTopic, setBulkTopic] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [brandVoiceInstructions, setBrandVoiceInstructions] = useState('');
  const [isEditingBrandVoice, setIsEditingBrandVoice] = useState(false);

  const timezones = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Australia/Sydney',
  ];

  const refresh = async () => {
    try {
      const [s, t, h, a, k, cand, c, m, u, auth] = await Promise.all([
        fetch('/api/admin/sources').then(r => r.json()),
        fetch('/api/admin/topics').then(r => r.json()),
        fetch('/api/admin/history?limit=20').then(r => r.json()),
        fetch('/api/admin/x/accounts').then(r => r.json()).catch(() => ({ accounts: [] })),
        fetch('/api/admin/x/keywords').then(r => r.json()).catch(() => ({ keywords: [] })),
        fetch('/api/admin/candidates?limit=20').then(r => r.json()).catch(() => ({ items: [] })),
        fetch('/api/admin/config').then(r => r.json()).catch(() => ({})),
        fetch('/api/admin/media').then(r => r.json()).catch(() => ({ media: [] })),
        fetch('/api/admin/usage').then(r => r.json()).catch(() => ({})),
        fetch('/api/admin/x/auth-status').then(r => r.json()).catch(() => ({ authenticated: false })),
      ]);
      setSources(s.sources || []);
      setTopics(t.topics || []);
      setHistory(h.items || []);
      setAccounts(a.accounts || []);
      setKeywords(k.keywords || []);
      setCandidates(cand.items || []);
      setConfig(c.config || null);
      setMedia(m.media || []);
      setUsageStats(u);
      setAuthStatus(auth);
      setBrandVoiceInstructions(c.config?.brand_voice_instructions || '');
    } catch (e) {
      console.error('refresh failed', e);
    }
  };

  useEffect(() => { refresh(); }, []);

  // Compose actions
  const aiEnhance = async () => {
    if (!compose.trim() || aiImproving) return;
    setAiImproving(true);
    try {
      const res = await fetch('/api/admin/ai/enhance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: compose }) });
      const data = await res.json();
      if (res.ok) setCompose(data.text); else alert(data.error || 'AI enhance failed');
    } finally {
      setAiImproving(false);
    }
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
  const delSource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this RSS source?')) return;
    await fetch(`/api/admin/sources/${id}`, { method: 'DELETE' });
    refresh();
  };

  const addTopic = async () => {
    if (!newTopic.trim()) return;
    await fetch('/api/admin/topics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: newTopic, count: newCount }) });
    setNewTopic(''); setNewCount(1); refresh();
  };
  const setRemaining = async (id: string, remaining: number) => { await fetch(`/api/admin/topics/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remaining }) }); refresh(); };

  const addAccount = async () => { if (!newHandle.trim()) return; await fetch('/api/admin/x/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle: newHandle }) }); setNewHandle(''); refresh(); };
  const removeAccount = async (id: string) => {
    if (!confirm('Are you sure you want to remove this X account?')) return;
    await fetch(`/api/admin/x/accounts/${id}`, { method: 'DELETE' });
    refresh();
  };
  const addKeyword = async () => { if (!newQuery.trim()) return; await fetch('/api/admin/x/keywords', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: newQuery }) }); setNewQuery(''); refresh(); };
  const removeKeyword = async (id: string) => {
    if (!confirm('Are you sure you want to remove this keyword?')) return;
    await fetch(`/api/admin/x/keywords/${id}`, { method: 'DELETE' });
    refresh();
  };
  const ingestNow = async () => { await fetch('/api/admin/candidates/ingest', { method: 'POST' }); refresh(); };
  const aiQuoteCandidate = async (id: string) => { const res = await fetch(`/api/admin/candidates/${id}/quote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }); const data = await res.json(); if (!res.ok) alert(data.error || 'Quote failed'); else { alert('Quoted!'); refresh(); } };
  const aiPostRssCandidate = async (c: any) => {
    const topic = `${c.title || ''} ${c.url || ''}`.trim();
    const resPrev = await fetch('/api/manual/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic }) });
    const dPrev = await resPrev.json();
    if (!resPrev.ok) return alert(dPrev.error || 'AI preview failed');
    const res = await fetch('/api/admin/post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: dPrev.post, image_url: c.image_url || '' }) });
    const data = await res.json();
    if (!res.ok) alert(data.error || 'Post failed'); else { alert('Posted!'); refresh(); }
  };

  // Admin actions
  const updateConfig = async (updates: Partial<AutomationConfig>) => {
    const updated = { ...config, ...updates } as AutomationConfig;
    await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    setConfig(updated);
  };
  const toggleAutomation = async () => { await updateConfig({ enabled: !config?.enabled }); };
  const updatePostingTimes = async (times: string[]) => { await updateConfig({ posting_times: times }); };
  const updateModel = async (model: string) => { await updateConfig({ llm_model: model }); };
  const saveBrandVoiceInstructions = async () => { await updateConfig({ brand_voice_instructions: brandVoiceInstructions }); setIsEditingBrandVoice(false); };
  const generateBulkPosts = async () => {
    if (!bulkTopic || bulkCount < 1) return;
    try {
      const response = await fetch('/api/admin/bulk/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: bulkTopic, count: bulkCount, model: config?.llm_model }) });
      const result = await response.json();
      setBulkTopic(''); setBulkCount(1);
      if (result.success) alert(`Generated ${bulkCount} posts!`);
    } catch (error) { console.error('Bulk generation failed:', error); alert('Failed to generate posts'); }
  };
  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await fetch('/api/admin/media/upload', { method: 'POST', body: formData });
      refresh();
    } catch (error) { console.error('Upload failed:', error); alert('Failed to upload media'); }
  };
  const deleteMedia = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media file?')) return;
    await fetch(`/api/admin/media/${id}`, { method: 'DELETE' });
    refresh();
  };

  // Design System
  const colors = {
    primary: '#2563eb',
    success: '#16a34a',
    danger: '#dc2626',
    warning: '#f59e0b',
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      600: '#666',
      900: '#111827'
    }
  };
  const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };
  const radius = { sm: 6, md: 8, lg: 12 };

  const container: React.CSSProperties = { display: 'flex', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' };
  const mainArea: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: spacing.xxl, backgroundColor: '#ffffff' };
  const adminSidebar: React.CSSProperties = { width: 400, overflowY: 'auto', padding: spacing.xl, backgroundColor: colors.gray[50], borderLeft: `1px solid ${colors.gray[200]}`, position: 'relative' };
  const section: React.CSSProperties = { padding: spacing.lg, border: `1px solid ${colors.gray[200]}`, borderRadius: radius.md, background: colors.gray[50], marginBottom: spacing.lg };
  const input: React.CSSProperties = { padding: `${spacing.sm}px ${spacing.md}px`, border: `1px solid ${colors.gray[300]}`, borderRadius: radius.sm, fontSize: 14, width: '100%', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s' };
  const button: React.CSSProperties = { padding: `${spacing.sm}px ${spacing.md}px`, borderRadius: radius.sm, border: 'none', background: colors.primary, color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 500, transition: 'all 0.2s' };
  const danger: React.CSSProperties = { ...button, background: colors.danger };

  return (
    <>
      <style>{`
        button {
          position: relative;
          overflow: hidden;
        }
        button:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          filter: brightness(1.1);
        }
        button:not(:disabled):active {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        input:focus, textarea:focus {
          outline: none;
          border-color: ${colors.primary};
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        input[type="checkbox"] {
          cursor: pointer;
          accent-color: ${colors.primary};
        }
      `}</style>
      <div style={container}>
      {/* Main Content Area */}
      <main style={mainArea}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>X Autoposter</h1>
          <button onClick={() => setShowAdmin(!showAdmin)} style={{ ...button, background: showAdmin ? '#dc2626' : '#16a34a' }}>
            {showAdmin ? 'Hide Admin ✕' : 'Show Admin ⚙️'}
          </button>
        </div>

        {/* Compose / Quote / Image */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
          <div style={section}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Compose</h2>
            <textarea value={compose} onChange={e => setCompose(e.target.value)} placeholder="What's happening?" style={{ ...input, minHeight: 120 }} />
            {/* Character Counter with Progress Bar */}
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: compose.length > 280 ? colors.danger : compose.length > 240 ? colors.warning : colors.gray[600] }}>
                  {compose.length}/280
                </div>
                <div style={{ fontSize: 11, color: colors.gray[600] }}>
                  {280 - compose.length} characters remaining
                </div>
              </div>
              <div style={{ width: '100%', height: 4, backgroundColor: colors.gray[200], borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min((compose.length / 280) * 100, 100)}%`,
                  height: '100%',
                  backgroundColor: compose.length > 280 ? colors.danger : compose.length > 240 ? colors.warning : colors.success,
                  transition: 'all 0.3s ease'
                }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button onClick={aiEnhance} disabled={!compose.trim() || aiImproving} style={{ ...button, opacity: aiImproving ? 0.7 : 1 }}>
                {aiImproving ? '⟳ Improving...' : 'AI Improve'}
              </button>
              <button onClick={postNow} disabled={!compose.trim() || compose.length > 280 || posting} style={{ ...button, background: colors.success }}>{posting ? 'Posting…' : 'Post Now'}</button>
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

      {/* Admin Sidebar (conditionally rendered) */}
      {showAdmin && (
        <aside style={adminSidebar}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Admin Settings</h2>

          {/* X Account Status */}
          <div style={{ ...section, backgroundColor: authStatus?.authenticated ? '#dcfce7' : '#fee2e2', marginBottom: 16, border: `2px solid ${authStatus?.authenticated ? colors.success : colors.danger}` }}>
            <div style={{ fontSize: 12, color: colors.gray[600], marginBottom: 8, fontWeight: 600 }}>X Account Status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: authStatus?.authenticated ? colors.success : colors.danger,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 18,
                fontWeight: 700
              }}>
                {authStatus?.authenticated ? '✓' : '✕'}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: authStatus?.authenticated ? colors.success : colors.danger }}>
                  {authStatus?.authenticated ? 'Connected' : 'Not Connected'}
                </div>
                {authStatus?.authenticated && authStatus?.username && (
                  <div style={{ fontSize: 13, color: colors.gray[600], marginTop: 2 }}>
                    {authStatus.username}
                  </div>
                )}
              </div>
            </div>
            {!authStatus?.authenticated && (
              <div style={{ fontSize: 11, color: '#666', marginTop: 8, padding: 8, backgroundColor: '#fff', borderRadius: 4 }}>
                Configure X API credentials in environment variables to connect your account.
              </div>
            )}
            {authStatus?.hasCredentials && (
              <div style={{ fontSize: 10, color: '#666', marginTop: 8 }}>
                Credentials: {Object.entries(authStatus.hasCredentials).filter(([, v]) => v).map(([k]) => k).join(', ')}
              </div>
            )}
          </div>

          {/* Automation Status */}
          <div style={{ ...section, backgroundColor: config?.enabled ? '#dcfce7' : '#fee2e2', border: `2px solid ${config?.enabled ? colors.success : colors.danger}` }}>
            <div style={{ fontSize: 12, color: colors.gray[600], marginBottom: 8, fontWeight: 600 }}>Automation Status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: config?.enabled ? colors.success : colors.danger,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 18,
                fontWeight: 700
              }}>
                {config?.enabled ? '▶' : '⏸'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: config?.enabled ? colors.success : colors.danger }}>
                {config?.enabled ? 'ENABLED' : 'DISABLED'}
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: `${spacing.sm}px ${spacing.md}px`, backgroundColor: 'white', borderRadius: radius.sm }}>
              <input type="checkbox" checked={config?.enabled ?? false} onChange={toggleAutomation} style={{ width: 18, height: 18, cursor: 'pointer' }} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>Enable Automation</span>
            </label>
          </div>

          {/* Posting Times */}
          <div style={section}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Posting Times</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['09:00', '13:00', '18:00'].map(time => (
                <label key={time} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={config?.posting_times?.includes(time) ?? false} onChange={e => { const times = config?.posting_times ?? []; updatePostingTimes(e.target.checked ? [...times, time].sort() : times.filter(t => t !== time)); }} />
                  {time}
                </label>
              ))}
            </div>
          </div>

          {/* Timezone */}
          <div style={section}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Timezone</h3>
            <select value={config?.timezone || 'UTC'} onChange={e => updateConfig({ timezone: e.target.value })} style={input}>
              {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>

          {/* Daily Limit */}
          <div style={section}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Daily Limit</h3>
            <input type="number" min={1} max={10} value={config?.daily_limit ?? 2} onChange={e => updateConfig({ daily_limit: parseInt(e.target.value || '2', 10) })} style={input} />
          </div>

          {/* LLM Model */}
          <div style={section}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>LLM Model</h3>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input placeholder="e.g. openai/gpt-4" value={customModel} onChange={e => setCustomModel(e.target.value)} style={input} />
              <button onClick={() => { if (customModel.trim()) { updateModel(customModel); setCustomModel(''); } }} style={{ ...button, whiteSpace: 'nowrap' }}>Set</button>
            </div>
            <div style={{ fontSize: 11, color: '#666', padding: 6, background: '#f3f4f6', borderRadius: 4 }}>
              Current: <strong>{config?.llm_model || 'google/gemini-2.0-flash-exp:free'}</strong>
            </div>
          </div>

          {/* Brand Voice */}
          <div style={section}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Brand Voice & Tone</h3>
            {!isEditingBrandVoice ? (
              <>
                <div style={{ fontSize: 11, padding: 8, background: '#f3f4f6', borderRadius: 4, minHeight: 60, whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                  {brandVoiceInstructions || 'No instructions set'}
                </div>
                <button onClick={() => setIsEditingBrandVoice(true)} style={button}>Edit</button>
              </>
            ) : (
              <>
                <textarea value={brandVoiceInstructions} onChange={e => setBrandVoiceInstructions(e.target.value)} style={{ ...input, minHeight: 100, marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={saveBrandVoiceInstructions} style={button}>Save</button>
                  <button onClick={() => setIsEditingBrandVoice(false)} style={{ ...button, background: '#6b7280' }}>Cancel</button>
                </div>
              </>
            )}
          </div>

          {/* Bulk Generate */}
          <div style={section}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Bulk Generate</h3>
            <input placeholder="Topic" value={bulkTopic} onChange={e => setBulkTopic(e.target.value)} style={{ ...input, marginBottom: 6 }} />
            <input type="number" min={1} max={20} value={bulkCount} onChange={e => setBulkCount(parseInt(e.target.value || '1', 10))} style={{ ...input, marginBottom: 6 }} />
            <button onClick={generateBulkPosts} style={button}>Generate Posts</button>
          </div>

          {/* Media Upload */}
          <div style={section}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Media Library</h3>
            <input type="file" accept="image/*" onChange={handleMediaUpload} style={{ fontSize: 11, marginBottom: 8 }} />
            <div style={{ maxHeight: 150, overflowY: 'auto' }}>
              {media.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 6, marginBottom: 4, background: '#fff', borderRadius: 4, fontSize: 11 }}>
                  <div><div style={{ fontWeight: 500 }}>{m.file_name.substring(0, 20)}</div><div style={{ color: '#666' }}>{(m.file_size / 1024).toFixed(1)} KB</div></div>
                  <button onClick={() => deleteMedia(m.id)} style={{ ...danger, padding: '3px 6px', fontSize: 10 }}>Delete</button>
                </div>
              ))}
            </div>
          </div>

          {/* API Usage */}
          <div style={section}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>API Usage (Today)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: '#dbeafe', padding: 8, borderRadius: 4, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#666' }}>Posts Read</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{usageStats?.posts_read || 0}</div>
              </div>
              <div style={{ background: '#dcfce7', padding: 8, borderRadius: 4, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#666' }}>Posts Written</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{usageStats?.posts_written || 0}</div>
              </div>
            </div>
          </div>
        </aside>
      )}
      </div>
    </>
  );
}
