"use client";

import { useEffect, useState } from 'react';
import { useToast } from './Toast';

export default function QueueViewer({ onRefresh }: { onRefresh: () => void }) {
  const { showToast } = useToast();
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/admin/bulk/queue');
      const data = await res.json();
      setQueue(data.posts || []);
      setLoading(false);
    } catch (e) {
      console.error('Failed to fetch queue:', e);
      setLoading(false);
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm('Delete this scheduled post?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/bulk/post/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete');
      }
      showToast('success', 'Post Deleted', 'Removed from queue');
      fetchQueue();
      onRefresh();
    } catch (e: any) {
      showToast('error', 'Delete Failed', e.message);
    } finally {
      setDeleting(null);
    }
  };

  const colors = {
    primary: '#2563eb',
    success: '#16a34a',
    danger: '#dc2626',
    warning: '#f59e0b',
    gray: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 600: '#666', 900: '#111827' }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    marginBottom: 20,
  };

  const pending = queue.filter(p => p.status === 'pending');
  const posted = queue.filter(p => p.status === 'posted');
  const failed = queue.filter(p => p.status === 'failed');

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: colors.gray[600] }}>
        Loading queue...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: colors.warning }}>{pending.length}</div>
          <div style={{ fontSize: 14, color: colors.gray[600] }}>Pending</div>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: colors.success }}>{posted.length}</div>
          <div style={{ fontSize: 14, color: colors.gray[600] }}>Posted</div>
        </div>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: colors.danger }}>{failed.length}</div>
          <div style={{ fontSize: 14, color: colors.gray[600] }}>Failed</div>
        </div>
      </div>

      {/* Pending Posts */}
      {pending.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>⏰ Scheduled Posts</h3>
          {pending.map((post: any) => (
            <div
              key={post.id}
              style={{
                padding: 16,
                borderRadius: 8,
                backgroundColor: colors.gray[50],
                border: `1px solid ${colors.gray[200]}`,
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: colors.warning, fontWeight: 600, marginBottom: 4 }}>
                    📅 {new Date(post.scheduled_for).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 14, color: colors.gray[900], marginBottom: 8 }}>
                    {post.post_text}
                  </div>
                  {post.media_ids && post.media_ids.length > 0 && (
                    <div style={{ fontSize: 12, color: colors.gray[600] }}>
                      🖼️ {post.media_ids.length} image(s) attached
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deletePost(post.id)}
                  disabled={deleting === post.id}
                  style={{
                    padding: '6px 12px',
                    fontSize: 13,
                    backgroundColor: colors.danger,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: deleting === post.id ? 'not-allowed' : 'pointer',
                    opacity: deleting === post.id ? 0.6 : 1,
                  }}
                >
                  {deleting === post.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Posted Posts */}
      {posted.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>✅ Recently Posted</h3>
          {posted.slice(0, 10).map((post: any) => (
            <div
              key={post.id}
              style={{
                padding: 16,
                borderRadius: 8,
                backgroundColor: colors.gray[50],
                border: `1px solid ${colors.gray[200]}`,
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 13, color: colors.success, fontWeight: 600, marginBottom: 4 }}>
                ✅ Posted {new Date(post.posted_at).toLocaleString()}
              </div>
              <div style={{ fontSize: 14, color: colors.gray[900] }}>
                {post.post_text}
              </div>
              {post.x_post_id && (
                <a
                  href={`https://x.com/i/web/status/${post.x_post_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: colors.primary, textDecoration: 'none' }}
                >
                  View on X →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Failed Posts */}
      {failed.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>❌ Failed Posts</h3>
          {failed.map((post: any) => (
            <div
              key={post.id}
              style={{
                padding: 16,
                borderRadius: 8,
                backgroundColor: colors.gray[50],
                border: `1px solid ${colors.gray[200]}`,
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 13, color: colors.danger, fontWeight: 600, marginBottom: 4 }}>
                ❌ Failed
              </div>
              <div style={{ fontSize: 14, color: colors.gray[900], marginBottom: 4 }}>
                {post.post_text}
              </div>
              {post.error_message && (
                <div style={{ fontSize: 12, color: colors.danger, fontStyle: 'italic' }}>
                  Error: {post.error_message}
                </div>
              )}
              <button
                onClick={() => deletePost(post.id)}
                disabled={deleting === post.id}
                style={{
                  padding: '6px 12px',
                  fontSize: 13,
                  backgroundColor: colors.danger,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: deleting === post.id ? 'not-allowed' : 'pointer',
                  opacity: deleting === post.id ? 0.6 : 1,
                  marginTop: 8,
                }}
              >
                {deleting === post.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      )}

      {queue.length === 0 && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: colors.gray[900], marginBottom: 8 }}>
            Queue is Empty
          </div>
          <div style={{ fontSize: 14, color: colors.gray[600] }}>
            Generate and schedule posts from the Manual tab to see them here
          </div>
        </div>
      )}
    </div>
  );
}
