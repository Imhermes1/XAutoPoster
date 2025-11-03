"use client";

import { useEffect, useState } from 'react';

interface Activity {
  id: string;
  timestamp: string;
  category: string;
  severity: string;
  title: string;
  description?: string;
  metadata?: any;
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/admin/activity?limit=20');
      const data = await res.json();
      setActivities(data.activities || []);
      setLoading(false);
    } catch (e) {
      console.error('Failed to fetch activities:', e);
      setLoading(false);
    }
  };

  const colors = {
    primary: '#2563eb',
    success: '#16a34a',
    danger: '#dc2626',
    warning: '#f59e0b',
    info: '#3b82f6',
    gray: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 600: '#666', 900: '#111827' }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    maxHeight: 600,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 20,
    color: colors.gray[900],
  };

  const feedContainerStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    paddingRight: 8,
  };

  const getIconAndColor = (activity: Activity) => {
    if (activity.severity === 'success') return { icon: '✓', color: colors.success, bg: '#dcfce7' };
    if (activity.severity === 'error') return { icon: '✕', color: colors.danger, bg: '#fee2e2' };
    if (activity.severity === 'warning') return { icon: '⚠', color: colors.warning, bg: '#fef3c7' };
    return { icon: 'ℹ', color: colors.info, bg: '#dbeafe' };
  };

  const timeAgo = (timestamp: string) => {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = now - then;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <div style={cardStyle}>
        <h2 style={titleStyle}>📡 Live Activity</h2>
        <p style={{ color: colors.gray[600] }}>Loading activity feed...</p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h2 style={titleStyle}>📡 Live Activity</h2>

      <div style={feedContainerStyle}>
        {activities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: colors.gray[600] }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 14 }}>No recent activity</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Activity will appear here as the system runs</div>
          </div>
        ) : (
          activities.map((activity, index) => {
            const { icon, color, bg } = getIconAndColor(activity);

            return (
              <div
                key={activity.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: 12,
                  marginBottom: 8,
                  borderRadius: 8,
                  backgroundColor: bg,
                  border: `1px solid ${color}20`,
                  animation: index === 0 ? 'slideIn 0.3s ease-out' : 'none',
                }}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: color,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: colors.gray[900],
                    }}>
                      {activity.title}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: colors.gray[600],
                      whiteSpace: 'nowrap',
                      marginLeft: 8,
                    }}>
                      {timeAgo(activity.timestamp)}
                    </div>
                  </div>

                  {activity.description && (
                    <div style={{
                      fontSize: 13,
                      color: colors.gray[600],
                      lineHeight: 1.4,
                    }}>
                      {activity.description}
                    </div>
                  )}

                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <div style={{
                      marginTop: 6,
                      padding: 8,
                      backgroundColor: 'rgba(255, 255, 255, 0.6)',
                      borderRadius: 4,
                      fontSize: 11,
                      color: colors.gray[600],
                    }}>
                      {Object.entries(activity.metadata).slice(0, 3).map(([key, value]) => (
                        <div key={key}>
                          <strong>{key}:</strong> {JSON.stringify(value).substring(0, 50)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
