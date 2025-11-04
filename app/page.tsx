"use client";

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import ManualControls from '@/components/ManualControls';
import ActivityFeed from '@/components/ActivityFeed';
import AutomationStatus from '@/components/AutomationStatus';
import PipelineStatus from '@/components/PipelineStatus';
import LogsViewer from '@/components/LogsViewer';
import MediaLibrary from '@/components/MediaLibrary';
import QueueViewer from '@/components/QueueViewer';

type Tab = 'dashboard' | 'logs' | 'manual' | 'settings' | 'sources' | 'media' | 'queue';

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

  // Modern Design System
  const colors = {
    primary: '#3b82f6',
    primaryDark: '#1e40af',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#06b6d4',
    gray: {
      25: '#fafafa',
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827'
    }
  };

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: `linear-gradient(135deg, #f0f9ff 0%, #f9fafb 100%)`,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '40px 32px',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
    padding: '0',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 38,
    fontWeight: 800,
    color: colors.gray[900],
    margin: 0,
    letterSpacing: '-0.02em',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 16,
    color: colors.gray[500],
    margin: '12px 0 0 0',
    fontWeight: 500,
  };

  const tabsStyle: React.CSSProperties = {
    display: 'flex',
    gap: 12,
    marginBottom: 32,
    borderBottom: `1px solid ${colors.gray[200]}`,
    paddingBottom: 0,
    overflowX: 'auto',
    scrollBehavior: 'smooth',
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '14px 20px',
    background: isActive ? colors.gray[50] : 'transparent',
    border: 'none',
    borderBottom: isActive ? `3px solid ${colors.primary}` : '1px solid transparent',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: isActive ? 600 : 500,
    color: isActive ? colors.primary : colors.gray[500],
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    marginBottom: -1,
    whiteSpace: 'nowrap',
    borderRadius: '8px 8px 0 0',
  });

  const contentStyle: React.CSSProperties = {
    minHeight: 400,
    animation: 'fadeIn 0.3s ease-in',
  };

  return (
    <div style={pageStyle}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slideIn {
          from { transform: translateY(4px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1) !important;
        }
        button:active:not(:disabled) {
          transform: translateY(0px);
        }
        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
          background-color: #fff !important;
        }
        input::placeholder {
          color: #9ca3af;
        }
      `}</style>
      <div style={containerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>🤖 X Autoposter</h1>
            <p style={subtitleStyle}>
              Automation-first social media management
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {/* Connection Status Badge */}
            {authStatus && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 18px',
                borderRadius: 12,
                backgroundColor: authStatus.authenticated ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1.5px solid ${authStatus.authenticated ? colors.success : colors.danger}`,
                boxShadow: `0 1px 3px ${authStatus.authenticated ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}`,
              }}>
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: authStatus.authenticated ? colors.success : colors.danger,
                  animation: authStatus.authenticated ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                }} />
                <span style={{
                  fontSize: 14,
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
                gap: 10,
                padding: '10px 18px',
                borderRadius: 12,
                backgroundColor: config.enabled ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                border: `1.5px solid ${config.enabled ? colors.success : colors.warning}`,
                boxShadow: `0 1px 3px ${config.enabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'}`,
              }}>
                <span style={{ fontSize: 18 }}>{config.enabled ? '▶️' : '⏸️'}</span>
                <span style={{
                  fontSize: 14,
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
          <button style={tabStyle(activeTab === 'media')} onClick={() => setActiveTab('media')}>
            🖼️ Media
          </button>
          <button style={tabStyle(activeTab === 'queue')} onClick={() => setActiveTab('queue')}>
            📅 Queue
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
          {activeTab === 'media' && (
            <MediaLibrary showToast={showToast} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab config={config} onUpdate={refresh} />
          )}
          {activeTab === 'sources' && (
            <SourcesTab onUpdate={refresh} />
          )}
          {activeTab === 'queue' && (
            <QueueViewer onRefresh={refresh} />
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardTab({ config, authStatus }: { config: any; authStatus: any }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 28 }}>
      {/* Left Column - Main Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <AutomationStatus config={config} authStatus={authStatus} />
        <PipelineStatus />
      </div>

      {/* Right Column - Activity Sidebar */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        height: 'fit-content',
        position: 'sticky',
        top: 20,
      }}>
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
          id: config?.id,
          enabled,
          posting_times: postingTimes,
          timezone,
          daily_limit: dailyLimit,
          llm_model: llmModel,
          brand_voice_instructions: brandVoice,
        }),
      });

      if (!res.ok) throw new Error('Failed to save settings');

      const data = await res.json();

      showToast('success', 'Settings Saved', 'Configuration updated successfully');

      // Don't call onUpdate() immediately - it causes useEffect to reset form fields
      // The form already has the correct state, no need to refetch and reset
    } catch (error: any) {
      showToast('error', 'Save Failed', error.message);
    } finally {
      setSaving(false);
    }
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    padding: '28px',
    borderRadius: 14,
    border: '1px solid #e5e7eb',
    marginBottom: 20,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.2s ease',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 12,
    color: '#1f2937',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    border: '1.5px solid #d1d5db',
    borderRadius: 10,
    fontSize: 15,
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
    backgroundColor: '#fafafa',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 28px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 28,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
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
    padding: '28px',
    marginBottom: 24,
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.2s ease',
  } as React.CSSProperties;

  const input = {
    padding: '12px 14px',
    fontSize: 15,
    border: '1.5px solid #d1d5db',
    borderRadius: 10,
    width: '100%',
    marginBottom: 8,
    backgroundColor: '#fafafa',
    transition: 'all 0.2s ease',
  } as React.CSSProperties;

  const button = {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#3b82f6',
    color: 'white',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)',
  } as React.CSSProperties;

  const dangerButton = {
    ...button,
    backgroundColor: '#ef4444',
    padding: '8px 14px',
    fontSize: 13,
    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)',
  } as React.CSSProperties;

  return (
    <div>
      {/* RSS Sources */}
      <div style={section}>
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 20, fontWeight: 700, color: '#1f2937' }}>📡 RSS Feeds</h3>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20, fontWeight: 500 }}>
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
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 20, fontWeight: 700, color: '#1f2937' }}>👤 X Accounts</h3>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20, fontWeight: 500 }}>
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
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 20, fontWeight: 700, color: '#1f2937' }}>🔍 Keywords & Hashtags</h3>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20, fontWeight: 500 }}>
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
