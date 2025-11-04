"use client";

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import ManualControls from '@/components/ManualControls';
import ActivityFeed from '@/components/ActivityFeed';
import AutomationStatus from '@/components/AutomationStatus';
import PipelineStatus from '@/components/PipelineStatus';
import LogsViewer from '@/components/LogsViewer';

type Tab = 'dashboard' | 'logs' | 'manual' | 'settings' | 'sources';

export default function AutomationDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [config, setConfig] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<any>(null);
  const { showToast } = useToast();

  const refresh = async () => {
    try {
      const [configRes, authRes] = await Promise.all([
        fetch('/api/admin/config').then(r => r.json()).catch(() => ({ config: null })),
        fetch('/api/admin/x/auth-status').then(r => r.json()).catch(() => ({ authenticated: false })),
      ]);
      setConfig(configRes.config || null);
      setAuthStatus(authRes);
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  };

  useEffect(() => {
    refresh();
    // Refresh every 30 seconds
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: colors.gray[50],
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: 1400,
    margin: '0 auto',
    padding: 24,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    padding: '20px 0',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 32,
    fontWeight: 700,
    color: colors.gray[900],
    margin: 0,
  };

  const tabsStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    marginBottom: 24,
    borderBottom: `2px solid ${colors.gray[200]}`,
    paddingBottom: 0,
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '12px 24px',
    background: isActive ? '#fff' : 'transparent',
    border: 'none',
    borderBottom: isActive ? `3px solid ${colors.primary}` : '3px solid transparent',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: isActive ? 600 : 500,
    color: isActive ? colors.primary : colors.gray[600],
    transition: 'all 0.2s',
    marginBottom: -2,
  });

  const contentStyle: React.CSSProperties = {
    minHeight: 400,
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>🤖 X Autoposter</h1>
            <p style={{ fontSize: 14, color: colors.gray[600], margin: '8px 0 0 0' }}>
              Automation-first social media management
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Connection Status Badge */}
            {authStatus && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 20,
                backgroundColor: authStatus.authenticated ? '#dcfce7' : '#fee2e2',
                border: `2px solid ${authStatus.authenticated ? colors.success : colors.danger}`,
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: authStatus.authenticated ? colors.success : colors.danger,
                }} />
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: authStatus.authenticated ? colors.success : colors.danger,
                }}>
                  {authStatus.authenticated ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            )}
            {/* Automation Status Badge */}
            {config && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 20,
                backgroundColor: config.enabled ? '#dcfce7' : '#fef3c7',
                border: `2px solid ${config.enabled ? colors.success : colors.warning}`,
              }}>
                <span style={{ fontSize: 16 }}>{config.enabled ? '▶' : '⏸'}</span>
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: config.enabled ? colors.success : colors.warning,
                }}>
                  {config.enabled ? 'Active' : 'Paused'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={tabsStyle}>
          <button style={tabStyle(activeTab === 'dashboard')} onClick={() => setActiveTab('dashboard')}>
            📊 Dashboard
          </button>
          <button style={tabStyle(activeTab === 'logs')} onClick={() => setActiveTab('logs')}>
            📋 Logs
          </button>
          <button style={tabStyle(activeTab === 'manual')} onClick={() => setActiveTab('manual')}>
            ✍️ Manual Control
          </button>
          <button style={tabStyle(activeTab === 'settings')} onClick={() => setActiveTab('settings')}>
            ⚙️ Settings
          </button>
          <button style={tabStyle(activeTab === 'sources')} onClick={() => setActiveTab('sources')}>
            📡 Sources
          </button>
        </div>

        {/* Tab Content */}
        <div style={contentStyle}>
          {activeTab === 'dashboard' && (
            <DashboardTab config={config} authStatus={authStatus} />
          )}
          {activeTab === 'logs' && (
            <LogsViewer />
          )}
          {activeTab === 'manual' && (
            <ManualControls onRefresh={refresh} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab config={config} onUpdate={refresh} />
          )}
          {activeTab === 'sources' && (
            <SourcesTab onUpdate={refresh} />
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardTab({ config, authStatus }: { config: any; authStatus: any }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
      {/* Left Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <AutomationStatus config={config} authStatus={authStatus} />
        <PipelineStatus />
      </div>

      {/* Right Column */}
      <div>
        <ActivityFeed />
      </div>
    </div>
  );
}

function SettingsTab({ config, onUpdate }: { config: any; onUpdate: () => void }) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(config?.enabled ?? false);
  const [postingTimes, setPostingTimes] = useState<string[]>(config?.posting_times || ['09:00', '13:00', '18:00']);
  const [timezone, setTimezone] = useState(config?.timezone || 'UTC');
  const [dailyLimit, setDailyLimit] = useState(config?.daily_limit || 2);
  const [llmModel, setLlmModel] = useState(config?.llm_model || '');
  const [brandVoice, setBrandVoice] = useState(config?.brand_voice_instructions || '');

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setPostingTimes(config.posting_times || ['09:00', '13:00', '18:00']);
      setTimezone(config.timezone || 'UTC');
      setDailyLimit(config.daily_limit || 2);
      setLlmModel(config.llm_model || '');
      setBrandVoice(config.brand_voice_instructions || '');
    }
  }, [config]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          posting_times: postingTimes,
          timezone,
          daily_limit: dailyLimit,
          llm_model: llmModel,
          brand_voice_instructions: brandVoice,
        }),
      });

      if (!res.ok) throw new Error('Failed to save settings');

      showToast('success', 'Settings Saved', 'Configuration updated successfully');
      onUpdate();
    } catch (error: any) {
      showToast('error', 'Save Failed', error.message);
    } finally {
      setSaving(false);
    }
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    marginBottom: 16,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 8,
    color: '#374151',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
    boxSizing: 'border-box',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 20,
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={sectionStyle}>
        <label style={labelStyle}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Enable Automation
        </label>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '8px 0 0 0' }}>
          When enabled, the system will automatically post at scheduled times
        </p>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Posting Times</label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {['09:00', '12:00', '15:00', '18:00', '21:00'].map(time => (
            <label key={time} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={postingTimes.includes(time)}
                onChange={e => {
                  if (e.target.checked) {
                    setPostingTimes([...postingTimes, time].sort());
                  } else {
                    setPostingTimes(postingTimes.filter(t => t !== time));
                  }
                }}
              />
              {time}
            </label>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Timezone</label>
        <select value={timezone} onChange={e => setTimezone(e.target.value)} style={inputStyle}>
          <option value="UTC">UTC</option>
          <option value="America/New_York">America/New_York</option>
          <option value="America/Chicago">America/Chicago</option>
          <option value="America/Los_Angeles">America/Los_Angeles</option>
          <option value="Europe/London">Europe/London</option>
          <option value="Europe/Paris">Europe/Paris</option>
          <option value="Asia/Tokyo">Asia/Tokyo</option>
        </select>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Daily Limit</label>
        <input
          type="number"
          min={1}
          max={10}
          value={dailyLimit}
          onChange={e => setDailyLimit(parseInt(e.target.value) || 2)}
          style={{ ...inputStyle, width: 100 }}
        />
        <p style={{ fontSize: 13, color: '#6b7280', margin: '8px 0 0 0' }}>
          Maximum posts per day
        </p>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>LLM Model</label>
        <input
          type="text"
          value={llmModel}
          onChange={e => setLlmModel(e.target.value)}
          placeholder="google/gemini-2.0-flash-exp:free"
          style={inputStyle}
        />
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Brand Voice & Tone</label>
        <textarea
          value={brandVoice}
          onChange={e => setBrandVoice(e.target.value)}
          placeholder="Describe your brand voice, tone, and style..."
          style={{ ...inputStyle, minHeight: 120, fontFamily: 'inherit' }}
        />
      </div>

      <button onClick={saveSettings} disabled={saving} style={buttonStyle}>
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

function SourcesTab({ onUpdate }: { onUpdate: () => void }) {
  const [rssSources, setRssSources] = useState<any[]>([]);
  const [xAccounts, setXAccounts] = useState<any[]>([]);
  const [xKeywords, setXKeywords] = useState<any[]>([]);
  const [newRssUrl, setNewRssUrl] = useState('');
  const [newRssCategory, setNewRssCategory] = useState('');
  const [newXHandle, setNewXHandle] = useState('');
  const [newXKeyword, setNewXKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  const loadSources = async () => {
    try {
      const [rssRes, accountsRes, keywordsRes] = await Promise.all([
        fetch('/api/admin/sources').then(r => r.json()),
        fetch('/api/admin/x/accounts').then(r => r.json()),
        fetch('/api/admin/x/keywords').then(r => r.json()),
      ]);
      setRssSources(rssRes.sources || []);
      setXAccounts(accountsRes.accounts || []);
      setXKeywords(keywordsRes.keywords || []);
    } catch (e) {
      console.error('Failed to load sources:', e);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const addRssSource = async () => {
    if (!newRssUrl.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newRssUrl, category: newRssCategory || undefined }),
      });
      if (res.ok) {
        setNewRssUrl('');
        setNewRssCategory('');
        await loadSources();
        onUpdate();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add RSS source');
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteRssSource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this RSS source?')) return;
    await fetch(`/api/admin/sources/${id}`, { method: 'DELETE' });
    await loadSources();
    onUpdate();
  };

  const addXAccount = async () => {
    if (!newXHandle.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/x/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: newXHandle }),
      });
      if (res.ok) {
        setNewXHandle('');
        await loadSources();
        onUpdate();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add X account');
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteXAccount = async (id: string) => {
    if (!confirm('Are you sure you want to remove this X account?')) return;
    await fetch(`/api/admin/x/accounts/${id}`, { method: 'DELETE' });
    await loadSources();
    onUpdate();
  };

  const addXKeyword = async () => {
    if (!newXKeyword.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/x/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: newXKeyword }),
      });
      if (res.ok) {
        setNewXKeyword('');
        await loadSources();
        onUpdate();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add keyword');
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteXKeyword = async (id: string) => {
    if (!confirm('Are you sure you want to remove this keyword?')) return;
    await fetch(`/api/admin/x/keywords/${id}`, { method: 'DELETE' });
    await loadSources();
    onUpdate();
  };

  const section = {
    padding: 20,
    marginBottom: 20,
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    backgroundColor: '#fff',
  };

  const input = {
    padding: 10,
    fontSize: 14,
    border: '1px solid #d1d5db',
    borderRadius: 6,
    width: '100%',
    marginBottom: 8,
  };

  const button = {
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#2563eb',
    color: 'white',
    transition: 'all 0.2s',
  };

  const dangerButton = {
    ...button,
    backgroundColor: '#dc2626',
    padding: '6px 12px',
    fontSize: 12,
  };

  return (
    <div>
      {/* RSS Sources */}
      <div style={section}>
        <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, fontWeight: 600 }}>RSS Feeds</h3>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
          Add RSS feeds to automatically pull content for posting
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 8, marginBottom: 16 }}>
          <input
            type="url"
            placeholder="RSS Feed URL (e.g., https://example.com/feed.xml)"
            value={newRssUrl}
            onChange={e => setNewRssUrl(e.target.value)}
            style={input}
          />
          <input
            type="text"
            placeholder="Category (optional)"
            value={newRssCategory}
            onChange={e => setNewRssCategory(e.target.value)}
            style={input}
          />
          <button onClick={addRssSource} disabled={loading} style={button}>
            Add Feed
          </button>
        </div>

        {rssSources.length === 0 ? (
          <p style={{ fontSize: 14, color: '#999', fontStyle: 'italic' }}>No RSS sources added yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rssSources.map(source => (
              <div
                key={source.id}
                style={{
                  padding: 12,
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#f9fafb',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{source.url}</div>
                  {source.category && (
                    <div style={{ fontSize: 12, color: '#666' }}>Category: {source.category}</div>
                  )}
                </div>
                <button onClick={() => deleteRssSource(source.id)} style={dangerButton}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* X Accounts */}
      <div style={section}>
        <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, fontWeight: 600 }}>X Accounts to Monitor</h3>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
          Monitor specific X accounts for content to retweet or quote tweet
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="@username"
            value={newXHandle}
            onChange={e => setNewXHandle(e.target.value)}
            style={input}
          />
          <button onClick={addXAccount} disabled={loading} style={button}>
            Add Account
          </button>
        </div>

        {xAccounts.length === 0 ? (
          <p style={{ fontSize: 14, color: '#999', fontStyle: 'italic' }}>No X accounts added yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {xAccounts.map(account => (
              <div
                key={account.id}
                style={{
                  padding: 12,
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#f9fafb',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600 }}>{account.handle}</div>
                <button onClick={() => deleteXAccount(account.id)} style={dangerButton}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* X Keywords */}
      <div style={section}>
        <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, fontWeight: 600 }}>X Keywords to Monitor</h3>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
          Search for tweets containing specific keywords or hashtags
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="keyword or #hashtag"
            value={newXKeyword}
            onChange={e => setNewXKeyword(e.target.value)}
            style={input}
          />
          <button onClick={addXKeyword} disabled={loading} style={button}>
            Add Keyword
          </button>
        </div>

        {xKeywords.length === 0 ? (
          <p style={{ fontSize: 14, color: '#999', fontStyle: 'italic' }}>No keywords added yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {xKeywords.map(keyword => (
              <div
                key={keyword.id}
                style={{
                  padding: 12,
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#f9fafb',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600 }}>{keyword.query}</div>
                <button onClick={() => deleteXKeyword(keyword.id)} style={dangerButton}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
