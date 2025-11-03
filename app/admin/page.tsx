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

type Tab = 'dashboard' | 'automation' | 'content' | 'media' | 'settings' | 'analytics';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
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

  // ===== Sources & Topics Management =====
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

  // ===== Automation Config =====
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

  // ===== Bulk Generation =====
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

  // ===== Media Management =====
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

  // Styles
  const tabButtonStyle = (isActive: boolean) => ({
    padding: '10px 20px',
    border: 'none',
    borderBottom: isActive ? '3px solid #2563eb' : 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: isActive ? 600 : 400,
    color: isActive ? '#2563eb' : '#666',
  });

  const containerStyle = {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };

  const sectionStyle = {
    marginTop: 24,
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  };

  const inputStyle = {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
  };

  const buttonStyle = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: 6,
    backgroundColor: '#2563eb',
    color: 'white',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24 }}>Admin Dashboard</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 24 }}>
        {(['dashboard', 'automation', 'content', 'media', 'settings', 'analytics'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={tabButtonStyle(tab === t) as React.CSSProperties}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {tab === 'dashboard' && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Quick Status</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div style={{ ...sectionStyle, backgroundColor: '#eff6ff' }}>
              <div style={{ fontSize: 12, color: '#666' }}>Automation Status</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: config?.enabled ? '#16a34a' : '#dc2626' }}>
                {config?.enabled ? 'ENABLED' : 'DISABLED'}
              </div>
            </div>
            <div style={{ ...sectionStyle, backgroundColor: '#fef3c7' }}>
              <div style={{ fontSize: 12, color: '#666' }}>LLM Model</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 8 }}>{config?.llm_model || 'Not configured'}</div>
            </div>
            <div style={{ ...sectionStyle, backgroundColor: '#dbeafe' }}>
              <div style={{ fontSize: 12, color: '#666' }}>Daily Limit</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{config?.daily_limit ?? 2}</div>
            </div>
            <div style={{ ...sectionStyle, backgroundColor: '#f3e8ff' }}>
              <div style={{ fontSize: 12, color: '#666' }}>Posting Times</div>
              <div style={{ fontSize: 12, fontWeight: 500, marginTop: 8 }}>{config?.posting_times?.join(', ') || 'Not set'}</div>
            </div>
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 24, marginBottom: 16 }}>Recent Posts</h2>
          <div style={sectionStyle}>
            {history.length === 0 ? (
              <div style={{ color: '#999' }}>No posts yet</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {history.map(h => (
                  <li key={h.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: 12, color: '#666' }}>{new Date(h.posted_at).toLocaleString()}</div>
                    <div style={{ marginTop: 4, fontSize: 14 }}>{h.text}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Automation Tab */}
      {tab === 'automation' && (
        <div>
          <div style={sectionStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Automation Control</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config?.enabled ?? false}
                  onChange={toggleAutomation}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 500 }}>{config?.enabled ? 'Automation Enabled' : 'Automation Disabled'}</span>
              </label>
            </div>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Posting Schedule</h2>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Posting Times (UTC)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['09:00', '13:00', '18:00'].map(time => (
                  <label key={time} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
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
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Timezone</label>
              <select
                value={config?.timezone || 'UTC'}
                onChange={e => updateConfig({ timezone: e.target.value })}
                style={{ ...inputStyle, width: '100%' } as React.CSSProperties}
              >
                {timezones.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Daily Post Limit</label>
              <input
                type="number"
                min={1}
                max={10}
                value={config?.daily_limit ?? 2}
                onChange={e => updateConfig({ daily_limit: parseInt(e.target.value || '2', 10) })}
                style={{ ...inputStyle, width: '100px' } as React.CSSProperties}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Randomize Posting Time (minutes)</label>
              <input
                type="number"
                min={0}
                max={60}
                value={config?.randomize_minutes ?? 15}
                onChange={e => updateConfig({ randomize_minutes: parseInt(e.target.value || '15', 10) })}
                style={{ ...inputStyle, width: '100px' } as React.CSSProperties}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content Tab */}
      {tab === 'content' && (
        <div>
          <div style={sectionStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>RSS Sources</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                placeholder="Feed URL"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                style={{ ...inputStyle, flex: 1 } as React.CSSProperties}
              />
              <input
                placeholder="Category (optional)"
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                style={{ ...inputStyle, width: 180 } as React.CSSProperties}
              />
              <button onClick={addSource} style={buttonStyle}>Add</button>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {sources.map(s => (
                <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, marginBottom: 6, backgroundColor: 'white', borderRadius: 4, border: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: 14 }}>{s.url}{s.category ? ` — ${s.category}` : ''}</span>
                  <button onClick={() => delSource(s.id)} style={{ ...buttonStyle, backgroundColor: '#dc2626' }}>Delete</button>
                </li>
              ))}
            </ul>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Manual Topics</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                placeholder="Topic text"
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                style={{ ...inputStyle, flex: 1 } as React.CSSProperties}
              />
              <input
                type="number"
                min={1}
                value={newCount}
                onChange={e => setNewCount(parseInt(e.target.value || '1', 10))}
                style={{ ...inputStyle, width: 100 } as React.CSSProperties}
              />
              <button onClick={addTopic} style={buttonStyle}>Add</button>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {topics.map(t => (
                <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, marginBottom: 6, backgroundColor: 'white', borderRadius: 4, border: '1px solid #e5e7eb' }}>
                  <span style={{ flex: 1, fontSize: 14 }}>{t.topic}</span>
                  <span style={{ fontSize: 13, color: '#666' }}>Remaining: {t.remaining ?? 1}</span>
                  <input
                    type="number"
                    min={0}
                    defaultValue={t.remaining ?? 1}
                    onBlur={e => setRemaining(t.id, parseInt(e.target.value || '0', 10))}
                    style={{ ...inputStyle, width: 70 } as React.CSSProperties}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Bulk Generate Posts</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                placeholder="Topic or context"
                value={bulkTopic}
                onChange={e => setBulkTopic(e.target.value)}
                style={{ ...inputStyle, flex: 1 } as React.CSSProperties}
              />
              <input
                type="number"
                min={1}
                max={20}
                value={bulkCount}
                onChange={e => setBulkCount(parseInt(e.target.value || '1', 10))}
                style={{ ...inputStyle, width: 80 } as React.CSSProperties}
                placeholder="Count"
              />
              <button onClick={generateBulkPosts} style={buttonStyle}>Generate</button>
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>Generate multiple posts at once. They will be queued based on your schedule.</div>
          </div>
        </div>
      )}

      {/* Media Tab */}
      {tab === 'media' && (
        <div>
          <div style={sectionStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Media Library</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Upload Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleMediaUpload}
                style={{ fontSize: 14 }}
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Uploaded Files</h3>
              {media.length === 0 ? (
                <div style={{ color: '#999' }}>No media uploaded yet</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {media.map(m => (
                    <li key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, marginBottom: 6, backgroundColor: 'white', borderRadius: 4, border: '1px solid #e5e7eb' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{m.file_name}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{(m.file_size / 1024).toFixed(2)} KB</div>
                      </div>
                      <button onClick={() => deleteMedia(m.id)} style={{ ...buttonStyle, backgroundColor: '#dc2626' }}>Delete</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {tab === 'settings' && (
        <div>
          <div style={sectionStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>LLM Model Selection</h2>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Select Model</label>
            <select
              value={selectedModel}
              onChange={e => updateModel(e.target.value)}
              style={{ ...inputStyle, width: '100%' } as React.CSSProperties}
            >
              {llmModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>Current: {config?.llm_model || 'Not set'}</div>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>API Configuration</h2>
            <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
              <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Configured' : '✗ Missing'}</p>
              <p><strong>X API Keys:</strong> Set in environment</p>
              <p><strong>OpenRouter API:</strong> Set in environment</p>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {tab === 'analytics' && (
        <div>
          <div style={sectionStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>API Usage & Progress</h2>
            {usageStats ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                  <div style={{ backgroundColor: '#e0e7ff', padding: 12, borderRadius: 6 }}>
                    <div style={{ fontSize: 12, color: '#666' }}>Posts Read (Today)</div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{usageStats.posts_read || 0}</div>
                  </div>
                  <div style={{ backgroundColor: '#dcfce7', padding: 12, borderRadius: 6 }}>
                    <div style={{ fontSize: 12, color: '#666' }}>Posts Written (Today)</div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{usageStats.posts_written || 0}</div>
                  </div>
                  <div style={{ backgroundColor: '#fee2e2', padding: 12, borderRadius: 6 }}>
                    <div style={{ fontSize: 12, color: '#666' }}>API Calls</div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{usageStats.api_calls || 0}</div>
                  </div>
                  <div style={{ backgroundColor: '#fef3c7', padding: 12, borderRadius: 6 }}>
                    <div style={{ fontSize: 12, color: '#666' }}>Estimated Cost</div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>${(usageStats.estimated_cost || 0).toFixed(2)}</div>
                  </div>
                </div>
                <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
                  <p>Last updated: {usageStats.last_updated || 'N/A'}</p>
                </div>
              </div>
            ) : (
              <div style={{ color: '#999' }}>Usage data not available</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
