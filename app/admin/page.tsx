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
};
type Media = { id: string; file_name: string; file_size: number; uploaded_at: string };

export default function AdminPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [usageStats, setUsageStats] = useState<any>(null);

  const [newUrl, setNewUrl] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newCount, setNewCount] = useState(1);
  const [bulkCount, setBulkCount] = useState(1);
  const [bulkTopic, setBulkTopic] = useState('');
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.0-flash-exp:free');

  const llmModels = [
    'google/gemini-2.0-flash-exp:free',
    'openai/gpt-4',
    'openai/gpt-4-turbo',
    'openai/gpt-3.5-turbo',
    'anthropic/claude-3-opus',
    'anthropic/claude-3-sonnet',
  ];

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
      const [s, t, h, c, m, u] = await Promise.all([
        fetch('/api/admin/sources').then(r => r.json()),
        fetch('/api/admin/topics').then(r => r.json()),
        fetch('/api/admin/history?limit=20').then(r => r.json()),
        fetch('/api/admin/config').then(r => r.json()).catch(() => ({})),
        fetch('/api/admin/media').then(r => r.json()).catch(() => ({ media: [] })),
        fetch('/api/admin/usage').then(r => r.json()).catch(() => ({})),
      ]);
      setSources(s.sources || []);
      setTopics(t.topics || []);
      setHistory(h.items || []);
      setConfig(c.config || null);
      setMedia(m.media || []);
      setUsageStats(u);
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

  const delSource = async (id: string) => {
    await fetch(`/api/admin/sources/${id}`, { method: 'DELETE' });
    refresh();
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

  const generateBulkPosts = async () => {
    if (!bulkTopic || bulkCount < 1) return;
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
      setBulkTopic('');
      setBulkCount(1);
      if (result.success) {
        alert(`Generated ${bulkCount} posts!`);
      }
    } catch (error) {
      console.error('Bulk generation failed:', error);
      alert('Failed to generate posts');
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

  const deleteMedia = async (id: string) => {
    await fetch(`/api/admin/media/${id}`, { method: 'DELETE' });
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

  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>X Autoposter Admin</h1>

      {/* Status Cards */}
      <div style={gridStyle}>
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
          <select value={selectedModel} onChange={e => updateModel(e.target.value)} style={inputStyle}>
            {llmModels.map(model => (
              <option key={model} value={model}>{model.split('/')[1] || model}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={gridStyle}>
        {/* RSS Sources */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>RSS Sources</h2>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexDirection: 'column' }}>
            <input placeholder="Feed URL" value={newUrl} onChange={e => setNewUrl(e.target.value)} style={inputStyle} />
            <input placeholder="Category (optional)" value={newCat} onChange={e => setNewCat(e.target.value)} style={inputStyle} />
            <button onClick={addSource} style={buttonStyle}>Add Source</button>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {sources.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, marginBottom: 6, backgroundColor: 'white', borderRadius: 4, border: '1px solid #e5e7eb', fontSize: 12 }}>
                <span style={{ flex: 1, wordBreak: 'break-word' }}>{s.url}{s.category ? ` (${s.category})` : ''}</span>
                <button onClick={() => delSource(s.id)} style={{ ...dangerButtonStyle, padding: '4px 8px', fontSize: 12 }}>Delete</button>
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
            <button onClick={generateBulkPosts} style={buttonStyle}>Generate Posts</button>
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
                <button onClick={() => deleteMedia(m.id)} style={{ ...dangerButtonStyle, padding: '3px 6px', fontSize: 11 }}>Delete</button>
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
    </div>
  );
}
