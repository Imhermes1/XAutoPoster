"use client";

import { useEffect, useState } from 'react';

type LogType = 'automation' | 'ingestion' | 'analysis' | 'generation';

export default function LogsViewer() {
  const [activeLog, setActiveLog] = useState<LogType>('automation');
  const [automationRuns, setAutomationRuns] = useState<any[]>([]);
  const [ingestionLogs, setIngestionLogs] = useState<any[]>([]);
  const [analysisLogs, setAnalysisLogs] = useState<any[]>([]);
  const [generationLogs, setGenerationLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [automation, ingestion, analysis, generation] = await Promise.all([
        fetch('/api/admin/logs/automation?limit=20').then(r => r.json()).catch(() => ({ logs: [] })),
        fetch('/api/admin/logs/ingestion?limit=20').then(r => r.json()).catch(() => ({ logs: [] })),
        fetch('/api/admin/logs/analysis?limit=20').then(r => r.json()).catch(() => ({ logs: [] })),
        fetch('/api/admin/logs/generation?limit=20').then(r => r.json()).catch(() => ({ logs: [] })),
      ]);
      setAutomationRuns(automation.logs || []);
      setIngestionLogs(ingestion.logs || []);
      setAnalysisLogs(analysis.logs || []);
      setGenerationLogs(generation.logs || []);
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    } finally {
      setLoading(false);
    }
  };

  const colors = {
    primary: '#2563eb',
    success: '#16a34a',
    danger: '#dc2626',
    warning: '#f59e0b',
    gray: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 600: '#666', 900: '#111827' }
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '10px 20px',
    background: isActive ? colors.primary : colors.gray[100],
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: isActive ? '#fff' : colors.gray[600],
    transition: 'all 0.2s',
  });

  const logCardStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    marginBottom: 12,
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button style={tabStyle(activeLog === 'automation')} onClick={() => setActiveLog('automation')}>
          Automation Runs
        </button>
        <button style={tabStyle(activeLog === 'ingestion')} onClick={() => setActiveLog('ingestion')}>
          Ingestion
        </button>
        <button style={tabStyle(activeLog === 'analysis')} onClick={() => setActiveLog('analysis')}>
          Content Analysis
        </button>
        <button style={tabStyle(activeLog === 'generation')} onClick={() => setActiveLog('generation')}>
          Post Generation
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: colors.gray[600] }}>
          Loading logs...
        </div>
      ) : (
        <>
          {activeLog === 'automation' && <AutomationRunsLog logs={automationRuns} />}
          {activeLog === 'ingestion' && <IngestionLog logs={ingestionLogs} />}
          {activeLog === 'analysis' && <AnalysisLog logs={analysisLogs} />}
          {activeLog === 'generation' && <GenerationLog logs={generationLogs} />}
        </>
      )}
    </div>
  );
}

function AutomationRunsLog({ logs }: { logs: any[] }) {
  const colors = { success: '#16a34a', danger: '#dc2626', warning: '#f59e0b', gray: { 600: '#666' } };

  if (logs.length === 0) {
    return <EmptyState message="No automation runs yet" />;
  }

  return (
    <div>
      {logs.map(log => (
        <div
          key={log.id}
          style={{
            backgroundColor: '#fff',
            padding: 20,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              Automation Run #{log.id.substring(0, 8)}
            </div>
            <div style={{
              padding: '4px 12px',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: log.status === 'completed' ? '#dcfce7' : log.status === 'failed' ? '#fee2e2' : '#fef3c7',
              color: log.status === 'completed' ? colors.success : log.status === 'failed' ? colors.danger : colors.warning,
            }}>
              {log.status.toUpperCase()}
            </div>
          </div>

          <div style={{ fontSize: 13, color: colors.gray[600], marginBottom: 8 }}>
            Started: {new Date(log.started_at).toLocaleString()}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: colors.gray[600] }}>Posts Created</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{log.posts_created || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: colors.gray[600] }}>Candidates Evaluated</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{log.candidates_evaluated || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: colors.gray[600] }}>Duration</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : 'N/A'}
              </div>
            </div>
          </div>

          {log.error_message && (
            <div style={{
              marginTop: 12,
              padding: 12,
              backgroundColor: '#fee2e2',
              borderRadius: 6,
              fontSize: 13,
              color: '#991b1b',
            }}>
              Error: {log.error_message}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function IngestionLog({ logs }: { logs: any[] }) {
  if (logs.length === 0) {
    return <EmptyState message="No ingestion logs yet" />;
  }

  return (
    <div>
      {logs.map(log => (
        <div
          key={log.id}
          style={{
            backgroundColor: '#fff',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            {log.source_type.toUpperCase()}: {log.source_identifier}
          </div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
            {new Date(log.started_at).toLocaleString()}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
            <span>Found: {log.items_found || 0}</span>
            <span>New: {log.items_new || 0}</span>
            <span>Duplicates: {log.items_duplicate || 0}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalysisLog({ logs }: { logs: any[] }) {
  if (logs.length === 0) {
    return <EmptyState message="No content analysis logs yet" />;
  }

  return (
    <div>
      {logs.map(log => (
        <div
          key={log.id}
          style={{
            backgroundColor: '#fff',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              Score: {log.overall_score?.toFixed(2) || 'N/A'}
            </div>
            <div style={{
              padding: '2px 8px',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              backgroundColor: log.decision === 'approved' ? '#dcfce7' : '#fee2e2',
              color: log.decision === 'approved' ? '#16a34a' : '#dc2626',
            }}>
              {log.decision.toUpperCase()}
            </div>
          </div>
          <div style={{ fontSize: 13, color: '#374151', marginBottom: 8 }}>
            {log.reasoning || 'No reasoning provided'}
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {new Date(log.analyzed_at).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

function GenerationLog({ logs }: { logs: any[] }) {
  if (logs.length === 0) {
    return <EmptyState message="No generation logs yet" />;
  }

  return (
    <div>
      {logs.map(log => (
        <div
          key={log.id}
          style={{
            backgroundColor: '#fff',
            padding: 16,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
            Topic: {log.topic}
          </div>
          <div style={{ fontSize: 14, color: '#111', marginBottom: 8 }}>
            "{log.generated_text}"
          </div>
          <div style={{ fontSize: 11, color: '#666' }}>
            {new Date(log.generated_at).toLocaleString()} • {log.character_count} chars
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
      <div style={{ fontSize: 16 }}>{message}</div>
      <div style={{ fontSize: 13, marginTop: 8 }}>
        Logs will appear here as the system runs
      </div>
    </div>
  );
}
