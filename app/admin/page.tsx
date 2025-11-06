"use client";
import { useEffect, useState } from 'react';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';

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
  brand_voice_preset?: string;
};
type SecretsStatus = {
  ok?: boolean;
  has_llm_key?: boolean;
  has_x_oauth1_keys?: boolean;
  oauth2_connected?: boolean;
  oauth2_expires_at?: string | null;
  oauth2_scope?: string | null;
  env?: {
    has_client_id?: boolean;
    has_client_secret?: boolean;
    has_supabase?: boolean;
    has_cron_secret?: boolean;
  };
};
type Media = { id: string; file_name: string; file_size: number; uploaded_at: string };

export default function AdminPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [secrets, setSecrets] = useState<SecretsStatus>({});

  const [newUrl, setNewUrl] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [twitterUsername, setTwitterUsername] = useState('');
  const [convertingTwitter, setConvertingTwitter] = useState(false);
  const [twitterMessage, setTwitterMessage] = useState('');
  const [fetchingRss, setFetchingRss] = useState(false);
  const [fetchMessage, setFetchMessage] = useState('');
  const [newCount, setNewCount] = useState(1);
  const [bulkCount, setBulkCount] = useState(1);
  const [bulkTopic, setBulkTopic] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [newHandle, setNewHandle] = useState('');
  const [newQuery, setNewQuery] = useState('');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [compose, setCompose] = useState('');
  const [posting, setPosting] = useState(false);
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.0-flash-exp:free');
  const [customModel, setCustomModel] = useState('');
  const [brandVoiceInstructions, setBrandVoiceInstructions] = useState('');
  const [brandVoicePreset, setBrandVoicePreset] = useState<string>('');
  const [isEditingBrandVoice, setIsEditingBrandVoice] = useState(false);

  // Confirmation dialog states
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'source' | 'media' | 'account' | 'keyword' | 'oauth2' | 'oauth1' | null;
    id?: string;
    name?: string;
  }>({ type: null });
  const [deleting, setDeleting] = useState(false);
  const [generateConfirm, setGenerateConfirm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [ingestConfirm, setIngestConfirm] = useState(false);
  const [ingesting, setIngesting] = useState(false);

  const brandVoicePresets = {
    'default': 'Default Developer Voice',
    'research_analyst': 'Research Analyst - Data-driven Tech Insights',
  };

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Australia/Sydney',
  ];

  const refresh = async () => {
    try {
      const [s, t, h, c, m, u, a, k, cand, sec] = await Promise.all([
        fetch('/api/admin/sources').then(r => r.json()),
        fetch('/api/admin/topics').then(r => r.json()),
        fetch('/api/admin/history?limit=20').then(r => r.json()),
        fetch('/api/admin/config').then(r => r.json()).catch(() => ({})),
        fetch('/api/admin/media').then(r => r.json()).catch(() => ({ media: [] })),
        fetch('/api/admin/usage').then(r => r.json()).catch(() => ({})),
        fetch('/api/admin/x/accounts').then(r => r.json()).catch(() => ({ accounts: [] })),
        fetch('/api/admin/x/keywords').then(r => r.json()).catch(() => ({ keywords: [] })),
        fetch('/api/admin/candidates?limit=20').then(r => r.json()).catch(() => ({ items: [] })),
        fetch('/api/admin/secrets').then(r => r.json()).catch(() => ({})),
      ]);
      setSources(s.sources || []);
      setTopics(t.topics || []);
      setHistory(h.items || []);
      setConfig(c.config || null);
      setMedia(m.media || []);
      setUsageStats(u);
      setBrandVoiceInstructions(c.config?.brand_voice_instructions || '');
      setBrandVoicePreset(c.config?.brand_voice_preset || '');
      setAccounts(a.accounts || []);
      setKeywords(k.keywords || []);
      setCandidates(cand.items || []);
      setSecrets(sec || {});
    } catch (error) {
      console.error('Failed to refresh:', error);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const addSource = async () => {
    if (!newUrl) return;
    await fetch('/api/admin/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newUrl, category: newCat }),
    });
    setNewUrl('');
    setNewCat('');
    refresh();
  };

  const convertTwitterToRss = async () => {
    if (!twitterUsername) return;
    setConvertingTwitter(true);
    setTwitterMessage('');
    try {
      const response = await fetch('/api/admin/sources/twitter-to-rss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: twitterUsername }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to convert');

      setTwitterMessage(`✅ Converted @${data.username} → ${data.rssUrl}`);
      setNewUrl(data.rssUrl);
      setNewCat('Twitter');
      setTwitterUsername('');
      setTimeout(() => setTwitterMessage(''), 5000);
    } catch (error) {
      setTwitterMessage(`❌ ${String(error)}`);
    } finally {
      setConvertingTwitter(false);
    }
  };

  const fetchRssNow = async () => {
    setFetchingRss(true);
    setFetchMessage('Fetching RSS feeds...');
    try {
      const response = await fetch('/api/cron/fetch-rss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch');

      const inserted = data.inserted || 0;
      setFetchMessage(`✅ Fetched successfully: ${inserted} new items`);
      refresh(); // Refresh the page data
      setTimeout(() => setFetchMessage(''), 5000);
    } catch (error) {
      setFetchMessage(`❌ Fetch failed: ${String(error)}`);
    } finally {
      setFetchingRss(false);
    }
  };

  const delSource = (id: string, url: string) => {
    setDeleteConfirm({ type: 'source', id, name: url });
  };

  const confirmDeleteSource = async () => {
    if (!deleteConfirm.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/sources/${deleteConfirm.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      refresh();
      setDeleteConfirm({ type: null });
    } catch (e: any) {
      alert(`Error deleting source: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const addTopic = async () => {
    if (!newTopic) return;
    await fetch('/api/admin/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: newTopic, count: newCount }),
    });
    setNewTopic('');
    setNewCount(1);
    refresh();
  };

  const setRemaining = async (id: string, remaining: number) => {
    await fetch(`/api/admin/topics/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remaining }),
    });
    refresh();
  };

  const aiEnhance = async () => {
    if (!compose.trim()) return;
    const res = await fetch('/api/admin/ai/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: compose }),
    });
    const data = await res.json();
    if (res.ok) setCompose(data.text);
    else alert(data.error || 'AI enhance failed');
  };

  const postNow = async () => {
    if (!compose.trim() || compose.length > 280) return;
    setPosting(true);
    try {
      const res = await fetch('/api/admin/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: compose }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Post failed');
      setCompose('');
      refresh();
      alert('Posted!');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setPosting(false);
    }
  };

  const updateConfig = async (updates: Partial<AutomationConfig>) => {
    const updated = { ...config, ...updates } as AutomationConfig;
    await fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    setConfig(updated);
  };

  const toggleAutomation = async () => {
    await updateConfig({ enabled: !config?.enabled });
  };

  const updatePostingTimes = async (times: string[]) => {
    await updateConfig({ posting_times: times });
  };

  const updateModel = async (model: string) => {
    setSelectedModel(model);
    await updateConfig({ llm_model: model });
  };

  const saveBrandVoiceInstructions = async () => {
    await updateConfig({
      brand_voice_instructions: brandVoiceInstructions,
      brand_voice_preset: brandVoicePreset || undefined,
    });
    setIsEditingBrandVoice(false);
  };

  const requestGenerateBulkPosts = () => {
    if (!bulkTopic || bulkCount < 1) return;
    setGenerateConfirm(true);
  };

  const confirmGenerateBulkPosts = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/admin/bulk/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: bulkTopic,
          count: bulkCount,
          model: selectedModel,
        }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        alert(`Generated ${bulkCount} posts!`);
        setBulkTopic('');
        setBulkCount(1);
        refresh();
      } else {
        throw new Error(result.error || 'Generation failed');
      }
    } catch (error: any) {
      console.error('Bulk generation failed:', error);
      alert(`Failed to generate posts: ${error.message}`);
    } finally {
      setGenerating(false);
      setGenerateConfirm(false);
    }
  };

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });
      refresh();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload media');
    }
  };

  const deleteMedia = (id: string, fileName: string) => {
    setDeleteConfirm({ type: 'media', id, name: fileName });
  };

  const confirmDeleteMedia = async () => {
    if (!deleteConfirm.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/media/${deleteConfirm.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      refresh();
      setDeleteConfirm({ type: null });
    } catch (e: any) {
      alert(`Error deleting media: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const addAccount = async () => {
    if (!newHandle) return;
    await fetch('/api/admin/x/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle: newHandle }) });
    setNewHandle('');
    refresh();
  };

  const addKeyword = async () => {
    if (!newQuery) return;
    await fetch('/api/admin/x/keywords', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: newQuery }) });
    setNewQuery('');
    refresh();
  };

  const removeAccount = (id: string, handle: string) => {
    setDeleteConfirm({ type: 'account', id, name: handle });
  };

  const confirmRemoveAccount = async () => {
    if (!deleteConfirm.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/x/accounts/${deleteConfirm.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      refresh();
      setDeleteConfirm({ type: null });
    } catch (e: any) {
      alert(`Error removing account: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const removeKeyword = (id: string, keyword: string) => {
    setDeleteConfirm({ type: 'keyword', id, name: keyword });
  };

  const confirmRemoveKeyword = async () => {
    if (!deleteConfirm.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/x/keywords/${deleteConfirm.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      refresh();
      setDeleteConfirm({ type: null });
    } catch (e: any) {
      alert(`Error removing keyword: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const requestIngestNow = () => {
    setIngestConfirm(true);
  };

  const confirmIngestNow = async () => {
    setIngesting(true);
    try {
      const res = await fetch('/api/admin/candidates/ingest', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Ingest failed');
      refresh();
      setIngestConfirm(false);
    } catch (e: any) {
      alert(`Error ingesting candidates: ${e.message}`);
    } finally {
      setIngesting(false);
    }
  };

  const aiQuoteCandidate = async (id: string) => {
    const res = await fetch(`/api/admin/candidates/${id}/quote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comment: '' }) });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Quote failed');
    alert('Quoted!');
    refresh();
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '100%',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#ffffff',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '20px',
  };

  const sectionStyle: React.CSSProperties = {
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#f9fafb',
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#2563eb',
    color: 'white',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  };

  const dangerButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#dc2626',
  };

  // Write-only secret updaters
  const [openrouterKeyInput, setOpenrouterKeyInput] = useState('');
  const [xKeyInput, setXKeyInput] = useState('');
  const [xSecretInput, setXSecretInput] = useState('');
  const [xAccessInput, setXAccessInput] = useState('');
  const [xAccessSecretInput, setXAccessSecretInput] = useState('');

  const saveOpenRouterKey = async () => {
    if (!openrouterKeyInput.trim()) return;
    await fetch('/api/admin/secrets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openrouter_api_key: openrouterKeyInput.trim(), llm_api_key: openrouterKeyInput.trim() }) });
    setOpenrouterKeyInput('');
    refresh();
  };

  const saveXOauth1Keys = async () => {
    await fetch('/api/admin/secrets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ x_api_key: xKeyInput || undefined, x_api_secret: xSecretInput || undefined, x_access_token: xAccessInput || undefined, x_access_token_secret: xAccessSecretInput || undefined }) });
    setXKeyInput(''); setXSecretInput(''); setXAccessInput(''); setXAccessSecretInput('');
    refresh();
  };

  const requestClearOAuth2 = () => {
    setDeleteConfirm({ type: 'oauth2' });
  };

  const confirmClearOAuth2 = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear_oauth2: true }),
      });
      if (!res.ok) throw new Error('Clear failed');
      refresh();
      setDeleteConfirm({ type: null });
    } catch (e: any) {
      alert(`Error clearing OAuth2: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const connectOAuth2 = () => {
    window.location.href = '/api/x/oauth2/start';
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>X Autoposter Admin</h1>

      {/* Unified Settings */}
      <div style={{ ...sectionStyle, marginBottom: 20, backgroundColor: '#fff' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Settings</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <div style={{ ...sectionStyle, backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: 12, color: '#666' }}>LLM (OpenRouter)</div>
            <div style={{ marginTop: 8, fontSize: 13 }}>
              <div>Status: {secrets?.has_llm_key ? 'Key set' : 'Not set'}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input value={openrouterKeyInput} onChange={e => setOpenrouterKeyInput(e.target.value)} placeholder="Enter OpenRouter API Key" style={inputStyle} />
                <button onClick={saveOpenRouterKey} style={{ ...buttonStyle, whiteSpace: 'nowrap' }}>Save</button>
              </div>
            </div>
          </div>
          <div style={{ ...sectionStyle, backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: 12, color: '#666' }}>X OAuth2</div>
            <div style={{ marginTop: 8, fontSize: 13 }}>
              <div>Status: {secrets?.oauth2_connected ? 'Connected' : 'Not connected'}</div>
              {secrets?.oauth2_expires_at && (
                <div>Expires: {new Date(secrets.oauth2_expires_at).toLocaleString()}</div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={connectOAuth2} style={{ ...buttonStyle }}>Connect</button>
                <button onClick={requestClearOAuth2} style={dangerButtonStyle}>Disconnect</button>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>Env: Client ID {secrets?.env?.has_client_id ? '✓' : '✗'}, Client Secret {secrets?.env?.has_client_secret ? '✓' : '✗'}</div>
            </div>
          </div>
          <div style={{ ...sectionStyle, backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: 12, color: '#666' }}>X OAuth1 (Media Upload)</div>
            <div style={{ marginTop: 8, fontSize: 13 }}>
              <div>Status: {secrets?.has_x_oauth1_keys ? 'Keys set' : 'Not set'}</div>
              <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                <input value={xKeyInput} onChange={e => setXKeyInput(e.target.value)} placeholder="X API Key" style={inputStyle} />
                <input value={xSecretInput} onChange={e => setXSecretInput(e.target.value)} placeholder="X API Secret" style={inputStyle} />
                <input value={xAccessInput} onChange={e => setXAccessInput(e.target.value)} placeholder="X Access Token" style={inputStyle} />
                <input value={xAccessSecretInput} onChange={e => setXAccessSecretInput(e.target.value)} placeholder="X Access Token Secret" style={inputStyle} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveXOauth1Keys} style={buttonStyle}>Save</button>
                  <button onClick={async()=>{await fetch('/api/admin/secrets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clear_x_oauth1:true})});refresh();}} style={dangerButtonStyle}>Clear</button>
                </div>
              </div>
            </div>
          </div>
          <div style={{ ...sectionStyle, backgroundColor: '#f8fafc' }}>
            <div style={{ fontSize: 12, color: '#666' }}>System</div>
            <div style={{ marginTop: 8, fontSize: 13 }}>
              <div>Supabase env: {secrets?.env?.has_supabase ? '✓' : '✗'}</div>
              <div>CRON_SECRET: {secrets?.env?.has_cron_secret ? '✓' : '✗'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div style={gridStyle}>
        {/* X Accounts */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>X Accounts</h2>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexDirection: 'column' }}>
            <input placeholder="@handle" value={newHandle} onChange={e => setNewHandle(e.target.value)} style={inputStyle} />
            <button onClick={addAccount} style={buttonStyle}>Add Account</button>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {accounts.map(acc => (
              <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, marginBottom: 6, backgroundColor: 'white', borderRadius: 4, border: '1px solid #e5e7eb', fontSize: 12 }}>
                <span style={{ flex: 1 }}>{acc.handle}</span>
                <button onClick={() => removeAccount(acc.id, acc.handle)} style={{ ...dangerButtonStyle, padding: '4px 8px', fontSize: 12 }}>Delete</button>
              </div>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Keywords</h2>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexDirection: 'column' }}>
            <input placeholder="Search query (e.g. OpenAI)" value={newQuery} onChange={e => setNewQuery(e.target.value)} style={inputStyle} />
            <button onClick={addKeyword} style={buttonStyle}>Add Keyword</button>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {keywords.map(kw => (
              <div key={kw.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, marginBottom: 6, backgroundColor: 'white', borderRadius: 4, border: '1px solid #e5e7eb', fontSize: 12 }}>
                <span style={{ flex: 1 }}>{kw.query}</span>
                <button onClick={() => removeKeyword(kw.id, kw.query)} style={{ ...dangerButtonStyle, padding: '4px 8px', fontSize: 12 }}>Delete</button>
              </div>
            ))}
          </div>
        </div>

        {/* Candidates */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Candidates</h2>
          <button onClick={requestIngestNow} style={{ ...buttonStyle, marginBottom: 8 }}>Ingest Now</button>
          <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
            {candidates.map(c => (
              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', alignItems: 'center', gap: 8, padding: 8, marginBottom: 6, backgroundColor: 'white', borderRadius: 4, border: '1px solid #e5e7eb', fontSize: 12 }}>
                <div>
                  {c.image_url ? <img src={c.image_url} alt="thumb" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 4 }} /> : <div style={{ width: 64, height: 64, background: '#f3f4f6', borderRadius: 4 }} />}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{c.type.toUpperCase()} — {c.source}</div>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400 }}>{c.title || c.text}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {c.type === 'tweet' ? (
                    <button onClick={() => aiQuoteCandidate(c.id)} style={{ ...buttonStyle, backgroundColor: '#16a34a' }}>AI Comment & Quote</button>
                  ) : (
                    <a href={c.url} target="_blank" rel="noreferrer" style={{ ...buttonStyle, backgroundColor: '#6b7280', textDecoration: 'none', display: 'inline-block', padding: '8px 12px' }}>Open</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Compose */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Compose</h2>
          <textarea
            placeholder="What's happening?"
            value={compose}
            onChange={e => setCompose(e.target.value)}
            style={{
              ...inputStyle,
              minHeight: 120,
              fontSize: 16,
              borderRadius: 8,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <div style={{ fontSize: 12, color: compose.length > 280 ? '#dc2626' : '#666' }}>{compose.length}/280</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={aiEnhance} disabled={!compose.trim()} style={buttonStyle}>AI Improve</button>
              <button onClick={postNow} disabled={!compose.trim() || compose.length > 280 || posting} style={{ ...buttonStyle, backgroundColor: '#16a34a' }}>
                {posting ? 'Posting…' : 'Post Now'}
              </button>
            </div>
          </div>
        </div>
        <div style={{ ...sectionStyle, backgroundColor: '#eff6ff' }}>
          <div style={{ fontSize: 12, color: '#666' }}>Automation Status</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: config?.enabled ? '#16a34a' : '#dc2626', marginTop: 8 }}>
            {config?.enabled ? 'ENABLED' : 'DISABLED'}
          </div>
        </div>
        <div style={{ ...sectionStyle, backgroundColor: '#fef3c7' }}>
          <div style={{ fontSize: 12, color: '#666' }}>LLM Model</div>
          <div style={{ fontSize: 13, fontWeight: 500, marginTop: 8 }}>{config?.llm_model || 'Not set'}</div>
        </div>
        <div style={{ ...sectionStyle, backgroundColor: '#dbeafe' }}>
          <div style={{ fontSize: 12, color: '#666' }}>Daily Limit</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{config?.daily_limit ?? 2}</div>
        </div>
        <div style={{ ...sectionStyle, backgroundColor: '#f3e8ff' }}>
          <div style={{ fontSize: 12, color: '#666' }}>Posts Today</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{usageStats?.posts_written || 0}</div>
        </div>
      </div>

      <div style={gridStyle}>
        {/* Automation Control */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Automation Control</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={config?.enabled ?? false}
              onChange={toggleAutomation}
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 500 }}>{config?.enabled ? 'Enabled' : 'Disabled'}</span>
          </label>
        </div>

        {/* Posting Times */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Posting Times</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {['09:00', '13:00', '18:00'].map(time => (
              <label key={time} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={config?.posting_times?.includes(time) ?? false}
                  onChange={e => {
                    const times = config?.posting_times ?? [];
                    const updated = e.target.checked
                      ? [...times, time].sort()
                      : times.filter(t => t !== time);
                    updatePostingTimes(updated);
                  }}
                  style={{ width: 16, height: 16 }}
                />
                <span>{time}</span>
              </label>
            ))}
          </div>
          <div style={{ fontSize: 12 }}>Selected: {config?.posting_times?.join(', ') || 'None'}</div>
        </div>

        {/* Timezone */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Timezone</h2>
          <select value={config?.timezone || 'UTC'} onChange={e => updateConfig({ timezone: e.target.value })} style={inputStyle}>
            {timezones.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        {/* Daily Limit */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Daily Limit</h2>
          <input
            type="number"
            min={1}
            max={10}
            value={config?.daily_limit ?? 2}
            onChange={e => updateConfig({ daily_limit: parseInt(e.target.value || '2', 10) })}
            style={inputStyle}
          />
        </div>

        {/* LLM Model */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>LLM Model</h2>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#666', display: 'block', marginBottom: 6 }}>Enter Model Name</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                placeholder="e.g. openai/gpt-4, anthropic/claude-3-opus"
                value={customModel || selectedModel}
                onChange={e => setCustomModel(e.target.value)}
                style={inputStyle}
              />
              <button
                onClick={() => {
                  if (customModel.trim()) {
                    updateModel(customModel);
                    setCustomModel('');
                  }
                }}
                style={{ ...buttonStyle, padding: '8px 12px', whiteSpace: 'nowrap' }}
              >
                Set
              </button>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#666', padding: '8px', backgroundColor: '#f3f4f6', borderRadius: 4, marginTop: 8 }}>
            <div style={{ fontWeight: 500, marginBottom: 6 }}>Current Model:</div>
            <div style={{ fontWeight: 600, color: '#2563eb' }}>{config?.llm_model || 'google/gemini-2.0-flash-exp:free'}</div>
            <div style={{ fontSize: 11, marginTop: 6, color: '#999' }}>
              Examples: openai/gpt-4, openai/gpt-3.5-turbo, anthropic/claude-3-opus, google/gemini-2.0-flash-exp:free
            </div>
          </div>
        </div>

        {/* Brand Voice & Tone Instructions */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Brand Voice & Tone</h2>
          {!isEditingBrandVoice ? (
            <div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6, color: '#374151' }}>Voice Preset:</div>
                <div style={{ fontSize: 13, color: '#1f2937', padding: '8px 12px', backgroundColor: '#e5e7eb', borderRadius: 4 }}>
                  {brandVoicePreset && brandVoicePresets[brandVoicePreset as keyof typeof brandVoicePresets]
                    ? brandVoicePresets[brandVoicePreset as keyof typeof brandVoicePresets]
                    : 'None - Using custom instructions'}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#666', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: 4, minHeight: 80, marginBottom: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {brandVoiceInstructions || 'No instructions set. Click "Edit" to add custom brand voice guidelines.'}
              </div>
              <button onClick={() => setIsEditingBrandVoice(true)} style={buttonStyle}>
                Edit Voice
              </button>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Select a Preset (or leave empty for custom):
                </label>
                <select
                  value={brandVoicePreset}
                  onChange={e => setBrandVoicePreset(e.target.value)}
                  style={{
                    ...inputStyle,
                    width: '100%',
                    marginBottom: 12,
                  }}
                >
                  <option value="">None (use custom instructions below)</option>
                  {Object.entries(brandVoicePresets).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
                Custom Instructions (optional if preset selected):
              </label>
              <textarea
                value={brandVoiceInstructions}
                onChange={e => setBrandVoiceInstructions(e.target.value)}
                placeholder="Enter brand voice and tone guidelines for the LLM. Example: Write in a professional but friendly tone. Be witty and use emojis sparingly..."
                style={{
                  ...inputStyle,
                  minHeight: 120,
                  fontFamily: 'monospace',
                  marginBottom: 12,
                }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={saveBrandVoiceInstructions} style={buttonStyle}>
                  Save
                </button>
                <button onClick={() => setIsEditingBrandVoice(false)} style={{ ...buttonStyle, backgroundColor: '#6b7280' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={gridStyle}>
        {/* RSS Sources */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>RSS Sources</h2>

          {/* Fetch Now Button */}
          <div style={{ marginBottom: 16, padding: 10, backgroundColor: '#fef3c7', borderRadius: 4, border: '1px solid #fbbf24' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#92400e', margin: 0 }}>Fetch RSS Now</h3>
              <button
                onClick={fetchRssNow}
                disabled={fetchingRss}
                style={{
                  ...buttonStyle,
                  backgroundColor: fetchingRss ? '#d1d5db' : '#f59e0b',
                  opacity: fetchingRss ? 0.6 : 1,
                  cursor: fetchingRss ? 'not-allowed' : 'pointer',
                  padding: '6px 12px',
                  fontSize: 12
                }}
              >
                {fetchingRss ? 'Fetching...' : '🔄 Fetch Now'}
              </button>
            </div>
            {fetchMessage && (
              <div style={{ fontSize: 12, padding: 6, backgroundColor: 'white', borderRadius: 3 }}>
                {fetchMessage}
              </div>
            )}
          </div>

          {/* Twitter to RSS Converter */}
          <div style={{ marginBottom: 16, padding: 10, backgroundColor: '#f0f9ff', borderRadius: 4, border: '1px solid #bfdbfe' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#1e40af' }}>Convert Twitter Profile to RSS</h3>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                placeholder="Twitter username (e.g., elonmusk)"
                value={twitterUsername}
                onChange={e => setTwitterUsername(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && convertTwitterToRss()}
                style={inputStyle}
              />
              <button
                onClick={convertTwitterToRss}
                disabled={convertingTwitter || !twitterUsername}
                style={{ ...buttonStyle, opacity: convertingTwitter ? 0.6 : 1, cursor: convertingTwitter ? 'not-allowed' : 'pointer' }}
              >
                {convertingTwitter ? 'Converting...' : 'Convert'}
              </button>
            </div>
            {twitterMessage && (
              <div style={{ fontSize: 12, padding: 6, backgroundColor: 'white', borderRadius: 3, marginBottom: 8 }}>
                {twitterMessage}
              </div>
            )}
          </div>

          {/* Add RSS Feed */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexDirection: 'column' }}>
            <input placeholder="Feed URL" value={newUrl} onChange={e => setNewUrl(e.target.value)} style={inputStyle} />
            <input placeholder="Category (optional)" value={newCat} onChange={e => setNewCat(e.target.value)} style={inputStyle} />
            <button onClick={addSource} style={buttonStyle}>Add Source</button>
          </div>

          {/* Sources List */}
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {sources.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, marginBottom: 6, backgroundColor: 'white', borderRadius: 4, border: '1px solid #e5e7eb', fontSize: 12 }}>
                <span style={{ flex: 1, wordBreak: 'break-word' }}>{s.url}{s.category ? ` (${s.category})` : ''}</span>
                <button onClick={() => delSource(s.id, s.url)} style={{ ...dangerButtonStyle, padding: '4px 8px', fontSize: 12 }}>Delete</button>
              </div>
            ))}
          </div>
        </div>

        {/* Manual Topics */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Manual Topics</h2>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexDirection: 'column' }}>
            <input placeholder="Topic text" value={newTopic} onChange={e => setNewTopic(e.target.value)} style={inputStyle} />
            <input type="number" min={1} value={newCount} onChange={e => setNewCount(parseInt(e.target.value || '1', 10))} placeholder="Count" style={inputStyle} />
            <button onClick={addTopic} style={buttonStyle}>Add Topic</button>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {topics.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 8, marginBottom: 6, backgroundColor: 'white', borderRadius: 4, border: '1px solid #e5e7eb', fontSize: 12 }}>
                <span style={{ flex: 1 }}>{t.topic}</span>
                <input type="number" min={0} defaultValue={t.remaining ?? 1} onBlur={e => setRemaining(t.id, parseInt(e.target.value || '0', 10))} style={{ ...inputStyle, width: 50 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Bulk Generation */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Bulk Generate</h2>
          <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
            <input placeholder="Topic or context" value={bulkTopic} onChange={e => setBulkTopic(e.target.value)} style={inputStyle} />
            <input type="number" min={1} max={20} value={bulkCount} onChange={e => setBulkCount(parseInt(e.target.value || '1', 10))} placeholder="Count (1-20)" style={inputStyle} />
            <button onClick={requestGenerateBulkPosts} style={buttonStyle}>Generate Posts</button>
            <div style={{ fontSize: 11, color: '#666' }}>Generate up to 20 posts at once</div>
          </div>
        </div>

        {/* Media Upload */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Upload Media</h2>
          <input type="file" accept="image/*" onChange={handleMediaUpload} style={{ fontSize: 12, marginBottom: 12 }} />
          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {media.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 6, marginBottom: 4, backgroundColor: 'white', borderRadius: 4, border: '1px solid #e5e7eb', fontSize: 11 }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{m.file_name.substring(0, 20)}</div>
                  <div style={{ color: '#666', fontSize: 10 }}>{(m.file_size / 1024).toFixed(1)} KB</div>
                </div>
                <button onClick={() => deleteMedia(m.id, m.file_name)} style={{ ...dangerButtonStyle, padding: '3px 6px', fontSize: 11 }}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Posts */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Recent Posts (Last 20)</h2>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
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

      {/* API Usage Stats */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>API Usage (Today)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
          <div style={{ backgroundColor: '#e0e7ff', padding: 10, borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#666' }}>Posts Read</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{usageStats?.posts_read || 0}</div>
          </div>
          <div style={{ backgroundColor: '#dcfce7', padding: 10, borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#666' }}>Posts Written</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{usageStats?.posts_written || 0}</div>
          </div>
          <div style={{ backgroundColor: '#fee2e2', padding: 10, borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#666' }}>API Calls</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{usageStats?.api_calls || 0}</div>
          </div>
          <div style={{ backgroundColor: '#fef3c7', padding: 10, borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#666' }}>Est. Cost</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>${(usageStats?.estimated_cost || 0).toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={deleteConfirm.type === 'source'}
        title="Delete RSS Source"
        message={`Are you sure you want to delete this RSS source?\n\n${deleteConfirm.name}`}
        isDangerous
        confirmText="Delete"
        onConfirm={confirmDeleteSource}
        onCancel={() => setDeleteConfirm({ type: null })}
        isLoading={deleting}
      />

      <ConfirmationDialog
        isOpen={deleteConfirm.type === 'media'}
        title="Delete Media"
        message={`Are you sure you want to delete this media file?\n\n${deleteConfirm.name}`}
        isDangerous
        confirmText="Delete"
        onConfirm={confirmDeleteMedia}
        onCancel={() => setDeleteConfirm({ type: null })}
        isLoading={deleting}
      />

      <ConfirmationDialog
        isOpen={deleteConfirm.type === 'account'}
        title="Remove X Account"
        message={`Are you sure you want to remove this X account from monitoring?\n\n@${deleteConfirm.name}`}
        isDangerous
        confirmText="Remove"
        onConfirm={confirmRemoveAccount}
        onCancel={() => setDeleteConfirm({ type: null })}
        isLoading={deleting}
      />

      <ConfirmationDialog
        isOpen={deleteConfirm.type === 'keyword'}
        title="Remove Keyword"
        message={`Are you sure you want to remove this keyword from tracking?\n\n${deleteConfirm.name}`}
        isDangerous
        confirmText="Remove"
        onConfirm={confirmRemoveKeyword}
        onCancel={() => setDeleteConfirm({ type: null })}
        isLoading={deleting}
      />

      <ConfirmationDialog
        isOpen={deleteConfirm.type === 'oauth2'}
        title="Clear OAuth2 Token"
        message="Are you sure you want to clear the OAuth2 authentication token? You will need to reconnect your X account to post."
        dangerMessage="This will disable X API posting until you reconnect."
        isDangerous
        confirmText="Clear Token"
        onConfirm={confirmClearOAuth2}
        onCancel={() => setDeleteConfirm({ type: null })}
        isLoading={deleting}
      />

      <ConfirmationDialog
        isOpen={generateConfirm}
        title="Generate Bulk Posts"
        message={`Generate ${bulkCount} post${bulkCount !== 1 ? 's' : ''} about "${bulkTopic}"?\n\nThis may take a minute depending on the number of posts.`}
        confirmText="Generate"
        onConfirm={confirmGenerateBulkPosts}
        onCancel={() => setGenerateConfirm(false)}
        isLoading={generating}
      />

      <ConfirmationDialog
        isOpen={ingestConfirm}
        title="Ingest Candidates"
        message="Ingest new candidates from X and RSS sources? This will fetch recent posts and articles."
        confirmText="Ingest"
        onConfirm={confirmIngestNow}
        onCancel={() => setIngestConfirm(false)}
        isLoading={ingesting}
      />
    </div>
  );
}
