/**
 * Automation Logger
 * Comprehensive logging for automation-first transparency
 */

import { getSupabase } from './supabase';

export type AutomationRunStatus = 'running' | 'completed' | 'failed' | 'skipped';
export type ContentDecision = 'approved' | 'rejected' | 'pending';
export type ActivityCategory = 'ingestion' | 'analysis' | 'posting' | 'system' | 'error';
export type ActivitySeverity = 'info' | 'success' | 'warning' | 'error';

interface DecisionLog {
  timestamp: string;
  decision: string;
  reasoning: string;
  metadata?: Record<string, any>;
}

interface AnalysisScores {
  relevance_score?: number;
  quality_score?: number;
  brand_fit_score?: number;
  engagement_potential?: number;
  overall_score: number;
}

// ============================================================================
// AUTOMATION RUN LOGGING
// ============================================================================

export async function startAutomationRun(triggerType: 'cron' | 'manual' | 'test' = 'cron') {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('automation_runs')
    .insert({
      status: 'running',
      trigger_type: triggerType,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to start automation run log:', error);
    return null;
  }

  // Log activity
  await logActivity({
    category: 'system',
    severity: 'info',
    title: 'Automation Cycle Started',
    description: `New automation cycle initiated (${triggerType})`,
    automation_run_id: data.id,
  });

  return data.id;
}

export async function updateAutomationRun(
  runId: string,
  updates: {
    status?: AutomationRunStatus;
    candidates_evaluated?: number;
    posts_created?: number;
    errors_count?: number;
    error_message?: string;
    config_snapshot?: any;
  }
) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('automation_runs')
    .update({
      ...updates,
      completed_at: updates.status !== 'running' ? new Date().toISOString() : undefined,
    })
    .eq('id', runId);

  if (error) {
    console.error('Failed to update automation run:', error);
  }
}

export async function addDecisionToRun(runId: string, decision: DecisionLog) {
  const supabase = getSupabase();

  // Fetch current decisions
  const { data } = await supabase
    .from('automation_runs')
    .select('decisions')
    .eq('id', runId)
    .single();

  const decisions = (data?.decisions as DecisionLog[]) || [];
  decisions.push(decision);

  await supabase
    .from('automation_runs')
    .update({ decisions })
    .eq('id', runId);
}

export async function completeAutomationRun(
  runId: string,
  status: AutomationRunStatus,
  summary?: { posts_created?: number; candidates_evaluated?: number; errors_count?: number }
) {
  const supabase = getSupabase();

  // Calculate duration
  const { data: run } = await supabase
    .from('automation_runs')
    .select('started_at')
    .eq('id', runId)
    .single();

  const durationMs = run ? Date.now() - new Date(run.started_at).getTime() : 0;

  await supabase
    .from('automation_runs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
      ...summary,
    })
    .eq('id', runId);

  // Log completion activity
  await logActivity({
    category: 'system',
    severity: status === 'completed' ? 'success' : status === 'failed' ? 'error' : 'info',
    title: `Automation Cycle ${status === 'completed' ? 'Completed' : 'Failed'}`,
    description: status === 'completed'
      ? `Created ${summary?.posts_created || 0} posts, evaluated ${summary?.candidates_evaluated || 0} candidates`
      : 'Automation cycle encountered errors',
    automation_run_id: runId,
  });
}

// ============================================================================
// CONTENT ANALYSIS LOGGING
// ============================================================================

export async function logContentAnalysis(params: {
  candidate_id: string;
  automation_run_id?: string;
  scores: AnalysisScores;
  reasoning: string;
  concerns?: string[];
  strengths?: string[];
  decision: ContentDecision;
  rejection_reason?: string;
  model_used?: string;
  tokens_used?: number;
  analysis_duration_ms?: number;
}) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('content_analysis_logs')
    .insert({
      candidate_id: params.candidate_id,
      automation_run_id: params.automation_run_id,
      relevance_score: params.scores.relevance_score,
      quality_score: params.scores.quality_score,
      brand_fit_score: params.scores.brand_fit_score,
      engagement_potential: params.scores.engagement_potential,
      overall_score: params.scores.overall_score,
      reasoning: params.reasoning,
      concerns: params.concerns,
      strengths: params.strengths,
      decision: params.decision,
      rejection_reason: params.rejection_reason,
      model_used: params.model_used,
      tokens_used: params.tokens_used,
      analysis_duration_ms: params.analysis_duration_ms,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to log content analysis:', error);
    return null;
  }

  // Update candidate with analysis reference
  await supabase
    .from('candidates')
    .update({
      analysis_id: data.id,
      overall_score: params.scores.overall_score,
      analyzed_at: new Date().toISOString(),
    })
    .eq('id', params.candidate_id);

  // Log activity
  const severity: ActivitySeverity =
    params.decision === 'approved' ? 'success' :
    params.decision === 'rejected' ? 'warning' :
    'info';

  await logActivity({
    category: 'analysis',
    severity,
    title: `Content ${params.decision === 'approved' ? 'Approved' : params.decision === 'rejected' ? 'Rejected' : 'Analyzed'}`,
    description: params.reasoning,
    metadata: {
      score: params.scores.overall_score,
      concerns: params.concerns,
      strengths: params.strengths,
    },
    automation_run_id: params.automation_run_id,
    candidate_id: params.candidate_id,
  });

  return data.id;
}

// ============================================================================
// INGESTION LOGGING
// ============================================================================

export async function startIngestionLog(params: {
  source_type: 'rss' | 'keyword' | 'account';
  source_id?: string;
  source_identifier: string;
}) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('ingestion_logs')
    .insert({
      source_type: params.source_type,
      source_id: params.source_id,
      source_identifier: params.source_identifier,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to start ingestion log:', error);
    return null;
  }

  // Log activity
  await logActivity({
    category: 'ingestion',
    severity: 'info',
    title: `Ingestion Started: ${params.source_type}`,
    description: `Fetching content from ${params.source_identifier}`,
    metadata: { source_type: params.source_type },
  });

  return data.id;
}

export async function completeIngestionLog(
  logId: string,
  results: {
    status: 'completed' | 'failed';
    items_found?: number;
    items_new?: number;
    items_duplicate?: number;
    items_filtered?: number;
    raw_items?: any[];
    filter_reasons?: Record<string, any>;
    error_message?: string;
  }
) {
  const supabase = getSupabase();

  // Calculate duration
  const { data: log } = await supabase
    .from('ingestion_logs')
    .select('started_at, source_identifier, source_type')
    .eq('id', logId)
    .single();

  const durationMs = log ? Date.now() - new Date(log.started_at).getTime() : 0;

  await supabase
    .from('ingestion_logs')
    .update({
      ...results,
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
    })
    .eq('id', logId);

  // Log activity
  await logActivity({
    category: 'ingestion',
    severity: results.status === 'completed' ? 'success' : 'error',
    title: `Ingestion ${results.status === 'completed' ? 'Completed' : 'Failed'}`,
    description: results.status === 'completed'
      ? `Found ${results.items_found || 0} items, ${results.items_new || 0} new candidates`
      : results.error_message || 'Ingestion failed',
    metadata: {
      source: log?.source_identifier,
      type: log?.source_type,
      ...results,
    },
  });
}

// ============================================================================
// POST GENERATION LOGGING
// ============================================================================

export async function logPostGeneration(params: {
  topic: string;
  model_used?: string;
  tokens_used?: number;
  duration_ms?: number;
  source_type?: string;
  source_id?: string;
  input_context?: any;
  generated_text: string;
  passed_quality_check?: boolean;
  quality_issues?: string[];
}) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('post_generation_logs')
    .insert({
      topic: params.topic,
      model_used: params.model_used,
      tokens_used: params.tokens_used,
      duration_ms: params.duration_ms,
      source_type: params.source_type,
      source_id: params.source_id,
      input_context: params.input_context,
      generated_text: params.generated_text,
      character_count: params.generated_text.length,
      passed_quality_check: params.passed_quality_check ?? true,
      quality_issues: params.quality_issues,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to log post generation:', error);
    return null;
  }

  return data.id;
}

export async function markGenerationUsed(generationId: string, postId: string) {
  const supabase = getSupabase();
  await supabase
    .from('post_generation_logs')
    .update({ used_for_post: true, post_id: postId })
    .eq('id', generationId);
}

// ============================================================================
// ACTIVITY STREAM
// ============================================================================

export async function logActivity(params: {
  category: ActivityCategory;
  severity?: ActivitySeverity;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  automation_run_id?: string;
  candidate_id?: string;
  post_id?: string;
}) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('activity_stream')
    .insert({
      event_type: `${params.category}_${params.severity || 'info'}`,
      category: params.category,
      severity: params.severity || 'info',
      title: params.title,
      description: params.description,
      metadata: params.metadata,
      automation_run_id: params.automation_run_id,
      candidate_id: params.candidate_id,
      post_id: params.post_id,
      timestamp: new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to log activity:', error);
  }
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

export async function getRecentAutomationRuns(limit: number = 10) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('automation_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[getRecentAutomationRuns] Database error:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[getRecentAutomationRuns] Exception:', err);
    return [];
  }
}

export async function getRecentActivity(limit: number = 50) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('activity_stream')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[getRecentActivity] Database error:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[getRecentActivity] Exception:', err);
    return [];
  }
}

export async function getIngestionHistory(sourceType?: string, limit: number = 20) {
  try {
    const supabase = getSupabase();
    let query = supabase
      .from('ingestion_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (sourceType) {
      query = query.eq('source_type', sourceType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getIngestionHistory] Database error:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[getIngestionHistory] Exception:', err);
    return [];
  }
}

export async function getContentAnalysisLogs(candidateId?: string, limit: number = 20) {
  try {
    const supabase = getSupabase();
    let query = supabase
      .from('content_analysis_logs')
      .select('*')
      .order('analyzed_at', { ascending: false })
      .limit(limit);

    if (candidateId) {
      query = query.eq('candidate_id', candidateId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getContentAnalysisLogs] Database error:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[getContentAnalysisLogs] Exception:', err);
    return [];
  }
}

export async function getPostGenerationHistory(limit: number = 20) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('post_generation_logs')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[getPostGenerationHistory] Database error:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[getPostGenerationHistory] Exception:', err);
    return [];
  }
}

export async function getPipelineStatus() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('content_pipeline_status')
      .select('*');

    if (error) {
      console.error('[getPipelineStatus] Database error:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[getPipelineStatus] Exception:', err);
    return [];
  }
}
