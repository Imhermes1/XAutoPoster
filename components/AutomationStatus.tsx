"use client";

import { useEffect, useState } from 'react';

export default function AutomationStatus({ config, authStatus }: { config: any; authStatus: any }) {
  const [usageStats, setUsageStats] = useState<any>(null);
  const [nextRun, setNextRun] = useState<string>('');

  useEffect(() => {
    fetchUsage();
    calculateNextRun();
  }, [config]);

  const fetchUsage = async () => {
    try {
      const res = await fetch('/api/admin/usage');
      const data = await res.json();
      setUsageStats(data);
    } catch (e) {
      console.error('Failed to fetch usage:', e);
    }
  };

  const calculateNextRun = () => {
    if (!config?.posting_times || config.posting_times.length === 0) {
      setNextRun('No schedule set');
      return;
    }

    const now = new Date();
    const times = config.posting_times.map((time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    });

    // Find next time
    let next = times.find((t: Date) => t > now);
    if (!next) {
      // Tomorrow's first time
      next = times[0];
      next.setDate(next.getDate() + 1);
    }

    const diff = next.getTime() - now.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    setNextRun(`${next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (in ${hours}h ${minutes}m)`);
  };

  const colors = {
    primary: '#2563eb',
    success: '#16a34a',
    danger: '#dc2626',
    warning: '#f59e0b',
    gray: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 600: '#666', 900: '#111827' }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 20,
    color: colors.gray[900],
  };

  const statCardStyle: React.CSSProperties = {
    padding: 16,
    borderRadius: 8,
    backgroundColor: colors.gray[50],
    border: `1px solid ${colors.gray[200]}`,
  };

  return (
    <div style={cardStyle}>
      <h2 style={titleStyle}>🤖 Automation Status</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <div style={statCardStyle}>
          <div style={{ fontSize: 12, color: colors.gray[600], marginBottom: 4 }}>Status</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: config?.enabled ? colors.success : colors.warning }}>
            {config?.enabled ? '● Active' : '⏸ Paused'}
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ fontSize: 12, color: colors.gray[600], marginBottom: 4 }}>Next Run</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: colors.gray[900] }}>
            {config?.enabled ? nextRun : 'Paused'}
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ fontSize: 12, color: colors.gray[600], marginBottom: 4 }}>Today's Posts</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: colors.primary }}>
            {usageStats?.posts_written || 0} / {config?.daily_limit || 2}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        <div style={statCardStyle}>
          <div style={{ fontSize: 12, color: colors.gray[600], marginBottom: 4 }}>This Week</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.gray[900] }}>
            {usageStats?.week_posts || 0} posts
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ fontSize: 12, color: colors.gray[600], marginBottom: 4 }}>Posting Times</div>
          <div style={{ fontSize: 14, color: colors.gray[900] }}>
            {config?.posting_times?.join(', ') || 'Not set'}
          </div>
        </div>
      </div>

      {!config?.enabled && (
        <div style={{
          marginTop: 16,
          padding: 12,
          backgroundColor: '#fef3c7',
          border: `2px solid ${colors.warning}`,
          borderRadius: 8,
          fontSize: 13,
          color: '#92400e',
        }}>
          ⚠️ Automation is paused. Enable it in Settings to resume automatic posting.
        </div>
      )}

      {!authStatus?.authenticated && (
        <div style={{
          marginTop: 16,
          padding: 12,
          backgroundColor: '#fee2e2',
          border: `2px solid ${colors.danger}`,
          borderRadius: 8,
          fontSize: 13,
          color: '#991b1b',
        }}>
          ✕ X account not connected. Configure API credentials to enable posting.
        </div>
      )}
    </div>
  );
}
