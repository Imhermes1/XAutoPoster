'use client';

import { useEffect, useState } from 'react';
import { useToast } from './Toast';

interface AnalyticsData {
  health: {
    status: string;
    spacing: any;
    variety: any;
    ready: boolean;
  };
  activityStream: Array<{
    id: string;
    event_type: string;
    post_text?: string;
    status?: string;
    created_at: string;
    metadata?: Record<string, any>;
  }>;
  stats: {
    totalPosted: number;
    totalScheduled: number;
    totalFailed: number;
    averageScore: number;
    lastPostTime?: string;
  };
}

export default function AnalyticsDashboard() {
  const { showToast } = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'error' | 'warning'>('all');

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [healthRes, activityRes] = await Promise.all([
        fetch('/api/admin/autopilot/health'),
        fetch('/api/admin/activity'),
      ]);

      if (!healthRes.ok || !activityRes.ok) throw new Error('Failed to fetch analytics');

      const health = await healthRes.json();
      const activity = await activityRes.json();

      // Calculate stats
      const posts = activity.activities || activity.activity || [];
      const stats = {
        totalPosted: posts.filter((p: any) => p.category === 'posting' && p.severity === 'success').length,
        totalScheduled: posts.filter((p: any) => p.category === 'posting').length,
        totalFailed: posts.filter((p: any) => p.severity === 'error').length,
        averageScore: posts.length
          ? Math.round(
              posts.filter((p: any) => p.metadata?.score).reduce((sum: number, p: any) => sum + (p.metadata?.score || 0), 0) /
                posts.filter((p: any) => p.metadata?.score).length
            )
          : 0,
        lastPostTime: posts[0]?.created_at,
      };

      setData({ health, activityStream: posts, stats });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      showToast('error', 'Failed to load analytics', 'Please try again');
      setLoading(false);
    }
  };

  const colors = {
    primary: '#3b82f6',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      900: '#111827',
    },
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: colors.gray[500] }}>
        Loading analytics...
      </div>
    );
  }

  const filteredActivity = data?.activityStream.filter((item) => {
    if (filter === 'all') return true;
    return (item as any).severity === filter;
  }) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Health Status */}
      <div
        style={{
          backgroundColor: '#fff',
          padding: 28,
          borderRadius: 14,
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, fontWeight: 700 }}>
          Autopilot Health
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
          {/* Spacing Status */}
          <div
            style={{
              padding: 16,
              borderRadius: 10,
              backgroundColor: data?.health.spacing.canPost ? '#dcfce7' : '#fee2e2',
              border: `1px solid ${data?.health.spacing.canPost ? colors.success : colors.danger}`,
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
              {data?.health.spacing.canPost ? '✅' : '⚠️'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.gray[900] }}>
              Post Spacing
            </div>
            <div style={{ fontSize: 12, color: colors.gray[500], marginTop: 4 }}>
              {data?.health.spacing.canPost
                ? `${data.health.spacing.hoursSinceLastPost.toFixed(1)} hrs since last`
                : data?.health.spacing.reason}
            </div>
          </div>

          {/* Variety Status */}
          <div
            style={{
              padding: 16,
              borderRadius: 10,
              backgroundColor: data?.health.variety.isVaried ? '#dcfce7' : '#fef3c7',
              border: `1px solid ${data?.health.variety.isVaried ? colors.success : colors.warning}`,
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
              {data?.health.variety.isVaried ? '✅' : '⚠️'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.gray[900] }}>
              Content Variety
            </div>
            <div style={{ fontSize: 12, color: colors.gray[500], marginTop: 4 }}>
              {data?.health.variety.warnings.length === 0
                ? 'Diverse content'
                : `${data?.health.variety.warnings.length} topic alerts`}
            </div>
          </div>

          {/* Overall Ready */}
          <div
            style={{
              padding: 16,
              borderRadius: 10,
              backgroundColor: data?.health.ready ? '#dcfce7' : '#fee2e2',
              border: `1px solid ${data?.health.ready ? colors.success : colors.danger}`,
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
              {data?.health.ready ? '🚀' : '🛑'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.gray[900] }}>
              Autopilot Ready
            </div>
            <div style={{ fontSize: 12, color: colors.gray[500], marginTop: 4 }}>
              {data?.health.ready ? 'Ready to post' : 'Needs attention'}
            </div>
          </div>
        </div>

        {/* Warnings */}
        {!data?.health.ready && (data?.health.variety.warnings.length || 0) > 0 && (
          <div style={{ padding: 12, backgroundColor: '#fef3c7', borderRadius: 8, borderLeft: `4px solid ${colors.warning}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.warning, marginBottom: 8 }}>
              Content Variety Warnings:
            </div>
            {data?.health.variety.warnings.map((warning: string, i: number) => (
              <div key={i} style={{ fontSize: 12, color: colors.gray[500], marginBottom: 4 }}>
                • {warning}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div
          style={{
            backgroundColor: '#fff',
            padding: 20,
            borderRadius: 14,
            border: '1px solid #e5e7eb',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: colors.success }}>
            {data?.stats.totalPosted}
          </div>
          <div style={{ fontSize: 12, color: colors.gray[500], marginTop: 8 }}>
            Posted
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#fff',
            padding: 20,
            borderRadius: 14,
            border: '1px solid #e5e7eb',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: colors.warning }}>
            {data?.stats.totalScheduled}
          </div>
          <div style={{ fontSize: 12, color: colors.gray[500], marginTop: 8 }}>
            Scheduled
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#fff',
            padding: 20,
            borderRadius: 14,
            border: '1px solid #e5e7eb',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: colors.danger }}>
            {data?.stats.totalFailed}
          </div>
          <div style={{ fontSize: 12, color: colors.gray[500], marginTop: 8 }}>
            Failed
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#fff',
            padding: 20,
            borderRadius: 14,
            border: '1px solid #e5e7eb',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: colors.primary }}>
            {data?.stats.averageScore}/100
          </div>
          <div style={{ fontSize: 12, color: colors.gray[500], marginTop: 8 }}>
            Avg Score
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div
        style={{
          backgroundColor: '#fff',
          padding: 28,
          borderRadius: 14,
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Activity Log</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['all', 'success', 'error', 'warning'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: filter === f ? colors.primary : colors.gray[100],
                  color: filter === f ? '#fff' : colors.gray[500],
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filteredActivity.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: colors.gray[500] }}>
            No activities yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredActivity.slice(0, 20).map((item) => (
              <div
                key={item.id}
                style={{
                  padding: 12,
                  backgroundColor: colors.gray[50],
                  borderRadius: 8,
                  border: `1px solid ${colors.gray[200]}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.gray[900], marginBottom: 4 }}>
                    {(item as any).title || item.event_type || 'Activity'}
                  </div>
                  {(item as any).description && (
                    <div style={{ fontSize: 12, color: colors.gray[600], marginBottom: 4, maxHeight: '40px', overflow: 'hidden' }}>
                      {(item as any).description.substring(0, 100)}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: colors.gray[500] }}>
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
                <div
                  style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    backgroundColor:
                      (item as any).severity === 'success'
                        ? '#dcfce7'
                        : (item as any).severity === 'error'
                          ? '#fee2e2'
                          : '#fef3c7',
                    color:
                      (item as any).severity === 'success'
                        ? colors.success
                        : (item as any).severity === 'error'
                          ? colors.danger
                          : colors.warning,
                    minWidth: '70px',
                    textAlign: 'center',
                  }}
                >
                  {(item as any).severity || 'info'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
