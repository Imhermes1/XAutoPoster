"use client";

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import ManualControls from '@/components/ManualControls';
import ActivityFeed from '@/components/ActivityFeed';
import AutomationStatus from '@/components/AutomationStatus';
import PipelineStatus from '@/components/PipelineStatus';
import PipelineTracker from '@/components/PipelineTracker';
import LogsViewer from '@/components/LogsViewer';
import MediaLibrary from '@/components/MediaLibrary';
import QueueViewer from '@/components/QueueViewer';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import LinkAnalyzer from '@/components/LinkAnalyzer';
import BreakingNewsModal from '@/components/BreakingNewsModal';

type Tab = 'dashboard' | 'pipeline' | 'logs' | 'manual' | 'settings' | 'sources' | 'media' | 'queue' | 'analytics' | 'link-analyzer' | 'posts';

export default function AutomationDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [config, setConfig] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [showBreakingNews, setShowBreakingNews] = useState(false);
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
    background: '#fafbfc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '48px 32px',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 48,
    padding: '0',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 42,
    fontWeight: 700,
    color: colors.gray[900],
    margin: 0,
    letterSpacing: '-0.01em',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 15,
    color: colors.gray[500],
    margin: '8px 0 0 0',
    fontWeight: 400,
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
            <h1 style={titleStyle}>X Autoposter</h1>
            <p style={subtitleStyle}>
              Smart automation for social media
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {/* Connection Status Badge */}
            {authStatus && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 8,
                backgroundColor: authStatus.authenticated ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${authStatus.authenticated ? colors.success : colors.danger}`,
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: authStatus.authenticated ? colors.success : colors.danger,
                  animation: authStatus.authenticated ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                }} />
                <span style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: authStatus.authenticated ? colors.success : colors.danger,
                }}>
                  {authStatus.authenticated ? 'Connected' : 'Disconnected'}
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
                borderRadius: 8,
                backgroundColor: config.enabled ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                border: `1px solid ${config.enabled ? colors.success : colors.warning}`,
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: config.enabled ? colors.success : colors.warning,
                }} />
                <span style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: config.enabled ? colors.success : colors.warning,
                }}>
                  {config.enabled ? 'Active' : 'Paused'}
                </span>
              </div>
            )}
            {/* Breaking News Button */}
            <button
              onClick={() => setShowBreakingNews(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 8,
                backgroundColor: colors.danger,
                border: `2px solid ${colors.danger}`,
                color: 'white',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                transition: 'all 0.2s ease',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
              }}
            >
              🚨 BREAKING NEWS
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={tabsStyle}>
          <button style={tabStyle(activeTab === 'dashboard')} onClick={() => setActiveTab('dashboard')}>
            Dashboard
          </button>
          <button style={tabStyle(activeTab === 'pipeline')} onClick={() => setActiveTab('pipeline')}>
            Pipeline
          </button>
          <button style={tabStyle(activeTab === 'logs')} onClick={() => setActiveTab('logs')}>
            Logs
          </button>
          <button style={tabStyle(activeTab === 'manual')} onClick={() => setActiveTab('manual')}>
            Manual
          </button>
          <button style={tabStyle(activeTab === 'settings')} onClick={() => setActiveTab('settings')}>
            Settings
          </button>
          <button style={tabStyle(activeTab === 'sources')} onClick={() => setActiveTab('sources')}>
            Sources
          </button>
          <button style={tabStyle(activeTab === 'media')} onClick={() => setActiveTab('media')}>
            Media
          </button>
          <button style={tabStyle(activeTab === 'queue')} onClick={() => setActiveTab('queue')}>
            Queue
          </button>
          <button style={tabStyle(activeTab === 'analytics')} onClick={() => setActiveTab('analytics')}>
            Analytics
          </button>
          <button style={tabStyle(activeTab === 'link-analyzer')} onClick={() => setActiveTab('link-analyzer')}>
            Link Analyzer
          </button>
          <button style={tabStyle(activeTab === 'posts')} onClick={() => setActiveTab('posts')}>
            Posts
          </button>
        </div>

        {/* Tab Content */}
        <div style={contentStyle}>
          {activeTab === 'dashboard' && (
            <DashboardTab config={config} authStatus={authStatus} />
          )}
          {activeTab === 'pipeline' && (
            <PipelineTracker />
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
          {activeTab === 'analytics' && (
            <AnalyticsDashboard />
          )}
          {activeTab === 'link-analyzer' && (
            <LinkAnalyzer />
          )}
          {activeTab === 'posts' && (
            <PostsTab />
          )}
        </div>
      </div>

      {/* Breaking News Modal */}
      <BreakingNewsModal
        isOpen={showBreakingNews}
        onClose={() => setShowBreakingNews(false)}
        onSuccess={() => {
          showToast('success', 'Breaking news tweets scheduled!');
          refresh();
        }}
      />
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
  const [postingTimes, setPostingTimes] = useState<string[]>(config?.posting_times || ['08:00', '10:00', '12:00', '14:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00']);
  const [timezone, setTimezone] = useState(config?.timezone || 'Australia/Sydney');
  const [dailyLimit, setDailyLimit] = useState(config?.daily_limit || 10);
  const [llmModel, setLlmModel] = useState(config?.llm_model || '');
  const [brandVoice, setBrandVoice] = useState(config?.brand_voice_instructions || '');

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setPostingTimes(config.posting_times || ['08:00', '10:00', '12:00', '14:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00']);
      setTimezone(config.timezone || 'Australia/Sydney');
      setDailyLimit(config.daily_limit || 10);
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
          <option value="America/New_York">America/New_York (EST/EDT)</option>
          <option value="America/Chicago">America/Chicago (CST/CDT)</option>
          <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
          <option value="Europe/London">Europe/London (GMT/BST)</option>
          <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
          <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
          <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
          <option value="Australia/Melbourne">Australia/Melbourne (AEST/AEDT)</option>
          <option value="Australia/Brisbane">Australia/Brisbane (AEST)</option>
          <option value="Australia/Perth">Australia/Perth (AWST)</option>
          <option value="Australia/Adelaide">Australia/Adelaide (ACST/ACDT)</option>
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
  const [twitterUsername, setTwitterUsername] = useState('');
  const [convertingTwitter, setConvertingTwitter] = useState(false);
  const [twitterMessage, setTwitterMessage] = useState('');
  const [fetchingRss, setFetchingRss] = useState(false);
  const [fetchMessage, setFetchMessage] = useState('');

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

  const convertTwitterToRss = async () => {
    if (!twitterUsername.trim()) return;
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
      setNewRssUrl(data.rssUrl);
      setNewRssCategory('Twitter');
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
    setFetchMessage('');
    try {
      const response = await fetch('/api/cron/fetch-rss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch RSS');
      setFetchMessage(`✅ Fetched ${data.inserted || 0} new items in ${Math.round(data.duration_ms / 1000)}s`);
      setTimeout(() => setFetchMessage(''), 5000);
      onUpdate();
    } catch (error) {
      setFetchMessage(`❌ ${String(error)}`);
    } finally {
      setFetchingRss(false);
    }
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
      {/* Fetch Now Button */}
      <div style={{ ...section, backgroundColor: '#fef3c7', border: '1px solid #fbbf24', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#92400e', margin: 0 }}>🔄 Fetch RSS Now</h3>
          <button
            onClick={fetchRssNow}
            disabled={fetchingRss}
            style={{
              ...button,
              backgroundColor: fetchingRss ? '#d1d5db' : '#f59e0b',
              opacity: fetchingRss ? 0.6 : 1,
              cursor: fetchingRss ? 'not-allowed' : 'pointer',
            }}
          >
            {fetchingRss ? 'Fetching...' : '🔄 Fetch Now'}
          </button>
        </div>
        {fetchMessage && (
          <div style={{
            fontSize: 13,
            padding: 8,
            backgroundColor: 'white',
            borderRadius: 6,
            border: '1px solid #fbbf24',
          }}>
            {fetchMessage}
          </div>
        )}
      </div>

      {/* Twitter to RSS Converter */}
      <div style={{ ...section, backgroundColor: '#dbeafe', border: '1px solid #3b82f6', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#1e40af', marginTop: 0 }}>
          🐦 Convert Twitter Profile to RSS
        </h3>
        <p style={{ fontSize: 13, color: '#1e40af', marginBottom: 12 }}>
          Convert any Twitter profile to an RSS feed using Nitter
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
          <input
            type="text"
            placeholder="@username or username"
            value={twitterUsername}
            onChange={e => setTwitterUsername(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && convertTwitterToRss()}
            style={input}
          />
          <button
            onClick={convertTwitterToRss}
            disabled={convertingTwitter || !twitterUsername.trim()}
            style={{
              ...button,
              backgroundColor: convertingTwitter ? '#d1d5db' : '#3b82f6',
              opacity: convertingTwitter || !twitterUsername.trim() ? 0.6 : 1,
              cursor: convertingTwitter || !twitterUsername.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {convertingTwitter ? 'Converting...' : 'Convert'}
          </button>
        </div>
        {twitterMessage && (
          <div style={{
            fontSize: 13,
            marginTop: 12,
            padding: 8,
            backgroundColor: 'white',
            borderRadius: 6,
            border: '1px solid #3b82f6',
          }}>
            {twitterMessage}
          </div>
        )}
      </div>

      {/* RSS Sources */}
      <div style={section}>
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 20, fontWeight: 700, color: '#1f2937' }}>RSS Feeds</h3>
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
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 20, fontWeight: 700, color: '#1f2937' }}>X Accounts</h3>
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
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 20, fontWeight: 700, color: '#1f2937' }}>Keywords & Hashtags</h3>
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

function PostsTab() {
  const [posts, setPosts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchPosts();
  }, [statusFilter]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'all'
        ? '/api/admin/queue/view'
        : `/api/admin/queue/view?status=${statusFilter}`;

      const response = await fetch(url);
      const data = await response.json();

      setStats(data.stats);
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'posted':
        return '#10b981'; // green
      case 'pending':
        return '#f59e0b'; // amber
      case 'draft':
        return '#3b82f6'; // blue
      case 'failed':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const getQualityColor = (score?: number): string => {
    if (!score) return '#6b7280';
    if (score >= 9) return '#10b981'; // excellent
    if (score >= 7.5) return '#3b82f6'; // good
    if (score >= 6.5) return '#f59e0b'; // okay
    return '#ef4444'; // low
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    padding: '28px',
    borderRadius: 14,
    border: '1px solid #e5e7eb',
    marginBottom: 20,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  };

  return (
    <div>
      {stats && (
        <div style={{ marginBottom: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div style={{ padding: '15px', background: '#f3f4f6', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>Total Posts</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '5px' }}>{stats.total}</div>
          </div>

          <div style={{ padding: '15px', background: '#dbeafe', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>Draft</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '5px', color: '#3b82f6' }}>{stats.by_status.draft}</div>
          </div>

          <div style={{ padding: '15px', background: '#fef3c7', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>Pending</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '5px', color: '#f59e0b' }}>{stats.by_status.pending}</div>
          </div>

          <div style={{ padding: '15px', background: '#d1fae5', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>Posted</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '5px', color: '#10b981' }}>{stats.by_status.posted}</div>
          </div>

          <div style={{ padding: '15px', background: '#fee2e2', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>Failed</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '5px', color: '#ef4444' }}>{stats.by_status.failed}</div>
          </div>

          <div style={{ padding: '15px', background: '#f3f4f6', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>Quality Excellent (9+)</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '5px', color: '#10b981' }}>{stats.by_quality.excellent}</div>
          </div>
        </div>
      )}

      <div style={{ ...sectionStyle, marginBottom: '20px' }}>
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {['all', 'draft', 'pending', 'posted', 'failed'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: statusFilter === status ? 'bold' : 'normal',
                background: statusFilter === status ? '#3b82f6' : '#e5e7eb',
                color: statusFilter === status ? 'white' : 'black',
                fontSize: '14px',
                transition: 'all 0.2s ease',
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading posts...</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No posts found</div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {posts.map((post: any) => (
              <div
                key={post.id}
                style={{
                  padding: '15px',
                  border: `2px solid ${getStatusColor(post.status)}`,
                  borderRadius: '8px',
                  background: '#fff'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '4px',
                        background: getStatusColor(post.status),
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      {post.status.toUpperCase()}
                    </span>
                    {post.quality_score && (
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '4px',
                          background: getQualityColor(post.quality_score),
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      >
                        {post.quality_score}/10
                      </span>
                    )}
                    {post.content_type && (
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {post.content_type.replace('-', ' ')}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '12px', color: '#999' }}>
                    {new Date(post.created_at).toLocaleString()}
                  </span>
                </div>

                <div style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '10px', background: '#f9fafb', padding: '12px', borderRadius: '4px' }}>
                  {post.post_text}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px', fontSize: '12px', color: '#666' }}>
                  {post.engagement_score && <div>📊 Engagement: {post.engagement_score}/10</div>}
                  {post.virality_score && <div>🚀 Virality: {post.virality_score}/10</div>}
                  {post.scheduled_for && (
                    <div>⏰ Scheduled: {new Date(post.scheduled_for).toLocaleString()}</div>
                  )}
                  {post.posted_at && (
                    <div>✅ Posted: {new Date(post.posted_at).toLocaleString()}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
