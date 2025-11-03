"use client";

import { useEffect, useState } from 'react';

export default function PipelineStatus() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const [candidates, history] = await Promise.all([
        fetch('/api/admin/candidates?limit=100').then(r => r.json()),
        fetch('/api/admin/history?limit=1').then(r => r.json()),
      ]);

      const candidatesList = candidates.items || [];
      const analyzed = candidatesList.filter((c: any) => c.analyzed_at);
      const highQuality = candidatesList.filter((c: any) => c.overall_score && c.overall_score > 0.7);
      const approved = candidatesList.filter((c: any) => c.overall_score && c.overall_score > 0.7 && !c.used);

      setStats({
        total: candidatesList.length,
        analyzed: analyzed.length,
        highQuality: highQuality.length,
        approved: approved.length,
        lastPost: history.items?.[0] || null,
      });
      setLoading(false);
    } catch (e) {
      console.error('Failed to fetch pipeline stats:', e);
      setLoading(false);
    }
  };

  const colors = {
    primary: '#2563eb',
    success: '#16a34a',
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

  const pipelineStepStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    backgroundColor: colors.gray[50],
    border: `1px solid ${colors.gray[200]}`,
    marginBottom: 12,
  };

  const numberStyle: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 700,
    color: colors.primary,
  };

  if (loading) {
    return (
      <div style={cardStyle}>
        <h2 style={titleStyle}>⚙️ Content Pipeline</h2>
        <p style={{ color: colors.gray[600] }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h2 style={titleStyle}>⚙️ Content Pipeline</h2>

      <div style={pipelineStepStyle}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.gray[900] }}>
            Total Candidates
          </div>
          <div style={{ fontSize: 12, color: colors.gray[600], marginTop: 4 }}>
            Content awaiting processing
          </div>
        </div>
        <div style={numberStyle}>{stats?.total || 0}</div>
      </div>

      <div style={pipelineStepStyle}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.gray[900] }}>
            Analyzed
          </div>
          <div style={{ fontSize: 12, color: colors.gray[600], marginTop: 4 }}>
            AI scoring completed
          </div>
        </div>
        <div style={numberStyle}>{stats?.analyzed || 0}</div>
      </div>

      <div style={pipelineStepStyle}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.gray[900] }}>
            High Quality (&gt;0.7)
          </div>
          <div style={{ fontSize: 12, color: colors.gray[600], marginTop: 4 }}>
            Passed quality threshold
          </div>
        </div>
        <div style={{ ...numberStyle, color: colors.success }}>{stats?.highQuality || 0}</div>
      </div>

      <div style={pipelineStepStyle}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.gray[900] }}>
            Ready to Post
          </div>
          <div style={{ fontSize: 12, color: colors.gray[600], marginTop: 4 }}>
            Approved and unused
          </div>
        </div>
        <div style={{ ...numberStyle, color: colors.success }}>{stats?.approved || 0}</div>
      </div>

      {stats?.lastPost && (
        <div style={{
          marginTop: 16,
          padding: 16,
          backgroundColor: '#dbeafe',
          borderRadius: 8,
          border: '1px solid #93c5fd',
        }}>
          <div style={{ fontSize: 12, color: colors.gray[600], marginBottom: 6 }}>
            Last Posted
          </div>
          <div style={{ fontSize: 14, color: colors.gray[900], marginBottom: 4 }}>
            {stats.lastPost.text.substring(0, 80)}
            {stats.lastPost.text.length > 80 && '...'}
          </div>
          <div style={{ fontSize: 11, color: colors.gray[600] }}>
            {new Date(stats.lastPost.posted_at).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
