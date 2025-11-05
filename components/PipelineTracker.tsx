'use client';

import { useEffect, useState } from 'react';
import { useToast } from './Toast';

interface PipelineStats {
  ingestion: {
    total: number;
    status: 'complete' | 'in-progress' | 'pending';
    detail: string;
  };
  analysis: {
    analyzed: number;
    total: number;
    status: 'complete' | 'in-progress' | 'pending';
    detail: string;
  };
  generation: {
    generated: number;
    total: number;
    status: 'complete' | 'in-progress' | 'pending';
    detail: string;
  };
  posting: {
    posted: number;
    scheduled: number;
    status: 'complete' | 'in-progress' | 'pending';
    detail: string;
  };
}

export default function PipelineTracker() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const colors = {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
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

  useEffect(() => {
    fetchPipelineStats();
    const interval = setInterval(fetchPipelineStats, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchPipelineStats = async () => {
    try {
      const [candidatesRes, historyRes, logsRes] = await Promise.all([
        fetch('/api/admin/candidates?limit=100'),
        fetch('/api/admin/history?limit=1'),
        fetch('/api/admin/activity?limit=50'),
      ]);

      const candidates = await candidatesRes.json();
      const history = await historyRes.json();
      const logs = await logsRes.json();

      // Calculate stats from candidates table
      const candidateList = candidates.items || candidates.candidates || [];
      const totalCandidates = candidateList.length;
      const analyzedCandidates = candidateList.filter((c: any) => c.analysis_score !== null).length;
      const generatedCandidates = candidateList.filter((c: any) => c.used === true).length;

      // Get posting info from history
      const postedCount = history.posts?.length || history.history?.length || 0;
      const scheduledCount = candidateList.filter((c: any) => c.used === false && c.analysis_score !== null && c.analysis_score >= 0.6).length || 0;

      // Get recent activities
      const activities = logs.activities || [];
      const recentIngestion = activities.find((a: any) => a.category === 'ingestion');
      const recentAnalysis = activities.find((a: any) => a.category === 'analysis');
      const recentGeneration = activities.find((a: any) => a.category === 'generation');
      const recentPosting = activities.find((a: any) => a.category === 'posting');

      const newStats: PipelineStats = {
        ingestion: {
          total: totalCandidates,
          status: recentIngestion?.severity === 'error' ? 'pending' : totalCandidates > 0 ? 'complete' : 'pending',
          detail: totalCandidates > 0 ? `${totalCandidates} candidates fetched` : 'No content fetched yet',
        },
        analysis: {
          analyzed: analyzedCandidates,
          total: totalCandidates,
          status: analyzedCandidates > 0 ? 'complete' : totalCandidates > 0 ? 'in-progress' : 'pending',
          detail: totalCandidates > 0 ? `${analyzedCandidates}/${totalCandidates} analyzed` : 'Waiting for content',
        },
        generation: {
          generated: generatedCandidates,
          total: analyzedCandidates,
          status: generatedCandidates > 0 ? 'complete' : analyzedCandidates > 0 ? 'in-progress' : 'pending',
          detail: analyzedCandidates > 0 ? `${generatedCandidates}/${analyzedCandidates} tweets generated` : 'Waiting for analysis',
        },
        posting: {
          posted: postedCount,
          scheduled: scheduledCount,
          status: postedCount > 0 ? 'complete' : scheduledCount > 0 ? 'in-progress' : 'pending',
          detail: `${postedCount} posted, ${scheduledCount} scheduled`,
        },
      };

      setStats(newStats);
      setLastUpdate(new Date().toLocaleTimeString());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pipeline stats:', error);
      showToast('error', 'Failed to load pipeline stats', 'Please try again');
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return colors.success;
      case 'in-progress':
        return colors.warning;
      case 'pending':
        return colors.gray[300];
      default:
        return colors.gray[300];
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return '✅';
      case 'in-progress':
        return '⏳';
      case 'pending':
        return '⭕';
      default:
        return '❓';
    }
  };

  if (loading || !stats) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: colors.gray[500] }}>
        Loading pipeline status...
      </div>
    );
  }

  const stages = [
    {
      title: 'Ingestion',
      subtitle: 'RSS feeds & X accounts',
      icon: '📥',
      stat: stats.ingestion,
      color: colors.success,
    },
    {
      title: 'Analysis',
      subtitle: 'AI scoring & approval',
      icon: '🤖',
      stat: stats.analysis,
      color: colors.primary,
    },
    {
      title: 'Generation',
      subtitle: 'AI creates tweets',
      icon: '✍️',
      stat: stats.generation,
      color: colors.warning,
    },
    {
      title: 'Posting',
      subtitle: 'Posts to X',
      icon: '🚀',
      stat: stats.posting,
      color: colors.danger,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Pipeline Progress Visualization */}
      <div
        style={{
          backgroundColor: '#fff',
          padding: 28,
          borderRadius: 14,
          border: '1px solid ' + colors.gray[200],
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 700, color: colors.gray[900] }}>
            Content Pipeline Progress
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: colors.gray[500] }}>
            Track content through each processing stage
            {lastUpdate && ` • Last updated: ${lastUpdate}`}
          </p>
        </div>

        {/* Pipeline Stages */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          {stages.map((stage, index) => (
            <div key={stage.title} style={{ flex: '1 1 200px', minWidth: 180 }}>
              {/* Stage Card */}
              <div
                style={{
                  backgroundColor: colors.gray[50],
                  border: `2px solid ${getStatusColor(stage.stat.status)}`,
                  borderRadius: 12,
                  padding: 16,
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  opacity: stage.stat.status === 'pending' ? 0.6 : 1,
                }}
              >
                {/* Icon */}
                <div style={{ fontSize: 32, marginBottom: 8 }}>
                  {stage.icon}
                </div>

                {/* Title */}
                <h3 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 700, color: colors.gray[900] }}>
                  {stage.title}
                </h3>

                {/* Subtitle */}
                <p style={{ margin: '0 0 12px 0', fontSize: 12, color: colors.gray[500] }}>
                  {stage.subtitle}
                </p>

                {/* Status Badge */}
                <div
                  style={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    borderRadius: 6,
                    backgroundColor: getStatusColor(stage.stat.status),
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 12,
                  }}
                >
                  {getStatusIcon(stage.stat.status)} {stage.stat.status.charAt(0).toUpperCase() + stage.stat.status.slice(1)}
                </div>

                {/* Details */}
                <div style={{ fontSize: 13, color: colors.gray[700], fontWeight: 500, marginBottom: 8 }}>
                  {stage.stat.detail}
                </div>

                {/* Progress bar (for analysis and generation) */}
                {(stage.title === 'Analysis' || stage.title === 'Generation') && 'total' in stage.stat && stage.stat.total > 0 && (
                  <div
                    style={{
                      height: 6,
                      backgroundColor: colors.gray[200],
                      borderRadius: 3,
                      overflow: 'hidden',
                      marginTop: 8,
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        backgroundColor: getStatusColor(stage.stat.status),
                        width: `${(stage.stat as any)[stage.title === 'Analysis' ? 'analyzed' : 'generated'] / (stage.stat as any).total * 100}%`,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Arrow to next stage */}
              {index < stages.length - 1 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginTop: 12,
                    fontSize: 20,
                    color: colors.gray[300],
                  }}
                >
                  ↓
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div
          style={{
            backgroundColor: '#fff',
            padding: 20,
            borderRadius: 12,
            border: '1px solid ' + colors.gray[200],
          }}
        >
          <div style={{ fontSize: 12, color: colors.gray[500], marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
            Total Candidates
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: colors.gray[900] }}>
            {stats.ingestion.total}
          </div>
          <div style={{ fontSize: 12, color: colors.gray[500], marginTop: 4 }}>
            Content in pipeline
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#fff',
            padding: 20,
            borderRadius: 12,
            border: '1px solid ' + colors.gray[200],
          }}
        >
          <div style={{ fontSize: 12, color: colors.gray[500], marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
            Ready to Post
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: colors.success }}>
            {stats.posting.scheduled}
          </div>
          <div style={{ fontSize: 12, color: colors.gray[500], marginTop: 4 }}>
            Waiting in queue
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#fff',
            padding: 20,
            borderRadius: 12,
            border: '1px solid ' + colors.gray[200],
          }}
        >
          <div style={{ fontSize: 12, color: colors.gray[500], marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
            Already Posted
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: colors.primary }}>
            {stats.posting.posted}
          </div>
          <div style={{ fontSize: 12, color: colors.gray[500], marginTop: 4 }}>
            Published to X
          </div>
        </div>
      </div>

      {/* Pipeline Status Legend */}
      <div
        style={{
          backgroundColor: '#fff',
          padding: 16,
          borderRadius: 12,
          border: '1px solid ' + colors.gray[200],
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: colors.gray[700], marginBottom: 12 }}>
          Legend
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <span style={{ color: colors.gray[600] }}>Complete - Stage finished</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⏳</span>
            <span style={{ color: colors.gray[600] }}>In Progress - Currently processing</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⭕</span>
            <span style={{ color: colors.gray[600] }}>Pending - Waiting to start</span>
          </div>
        </div>
      </div>
    </div>
  );
}
