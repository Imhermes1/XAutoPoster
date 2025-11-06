'use client';

import { useEffect, useState } from 'react';

interface Post {
  id: string;
  post_text: string;
  status: 'draft' | 'pending' | 'posted' | 'failed';
  quality_score?: number;
  engagement_score?: number;
  virality_score?: number;
  content_type?: string;
  created_at: string;
  scheduled_for?: string;
  posted_at?: string;
  x_post_id?: string;
}

interface Stats {
  total: number;
  by_status: {
    draft: number;
    pending: number;
    posted: number;
    failed: number;
  };
  by_quality: {
    excellent: number;
    good: number;
    okay: number;
    low: number;
  };
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
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

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1>📊 Generated Posts Dashboard</h1>

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

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
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
              color: statusFilter === status ? 'white' : 'black'
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
          {posts.map((post) => (
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
  );
}
