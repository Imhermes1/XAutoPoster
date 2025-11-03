-- ============================================================================
-- AUTOMATION LOGGING TABLES
-- Comprehensive logging for automation-first transparency
-- ============================================================================

-- Table: automation_runs
-- Logs each automation cycle execution
CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
  trigger_type TEXT DEFAULT 'cron', -- cron, manual, test

  -- Execution metrics
  duration_ms INTEGER,
  candidates_evaluated INTEGER DEFAULT 0,
  posts_created INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,

  -- Decision log
  decisions JSONB DEFAULT '[]'::jsonb, -- Array of decision objects
  error_message TEXT,

  -- Configuration snapshot
  config_snapshot JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_started ON automation_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_runs_status ON automation_runs(status);

-- Table: content_analysis_logs
-- Logs AI analysis and scoring of content before posting
CREATE TABLE IF NOT EXISTS content_analysis_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  automation_run_id UUID REFERENCES automation_runs(id) ON DELETE CASCADE,

  -- Analysis results
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  relevance_score NUMERIC(3, 2), -- 0.00 to 1.00
  quality_score NUMERIC(3, 2),
  brand_fit_score NUMERIC(3, 2),
  engagement_potential NUMERIC(3, 2),
  overall_score NUMERIC(3, 2),

  -- AI reasoning
  reasoning TEXT, -- Why this score was given
  concerns TEXT[], -- Any red flags
  strengths TEXT[], -- What makes it good

  -- Decision
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'pending')),
  rejection_reason TEXT,

  -- Model info
  model_used TEXT,
  tokens_used INTEGER,
  analysis_duration_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_analysis_candidate ON content_analysis_logs(candidate_id);
CREATE INDEX IF NOT EXISTS idx_content_analysis_run ON content_analysis_logs(automation_run_id);
CREATE INDEX IF NOT EXISTS idx_content_analysis_decision ON content_analysis_logs(decision);

-- Table: ingestion_logs
-- Logs each RSS/keyword ingestion operation
CREATE TABLE IF NOT EXISTS ingestion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Source info
  source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'keyword', 'account')),
  source_id UUID, -- references sources, sources_keywords, or sources_accounts
  source_identifier TEXT NOT NULL, -- URL, query, or @handle

  -- Results
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  items_found INTEGER DEFAULT 0,
  items_new INTEGER DEFAULT 0,
  items_duplicate INTEGER DEFAULT 0,
  items_filtered INTEGER DEFAULT 0,

  -- Details
  raw_items JSONB DEFAULT '[]'::jsonb, -- Sample of what was found
  filter_reasons JSONB DEFAULT '{}'::jsonb, -- Why items were filtered
  error_message TEXT,

  -- Performance
  duration_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_logs_started ON ingestion_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_source_type ON ingestion_logs(source_type);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_source_id ON ingestion_logs(source_id);

-- Table: activity_stream
-- Real-time activity feed for dashboard
CREATE TABLE IF NOT EXISTS activity_stream (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Event classification
  event_type TEXT NOT NULL, -- ingestion_start, ingestion_complete, analysis_start, post_created, etc.
  category TEXT NOT NULL CHECK (category IN ('ingestion', 'analysis', 'posting', 'system', 'error')),
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'success', 'warning', 'error')),

  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Related entities
  automation_run_id UUID REFERENCES automation_runs(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  post_id UUID REFERENCES posts_history(id) ON DELETE SET NULL,

  -- Auto-cleanup old events (optional trigger)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_stream_timestamp ON activity_stream(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_stream_category ON activity_stream(category);
CREATE INDEX IF NOT EXISTS idx_activity_stream_run ON activity_stream(automation_run_id);

-- Table: post_generation_logs
-- Logs each AI post generation attempt
CREATE TABLE IF NOT EXISTS post_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,

  -- Generation details
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_used TEXT,
  tokens_used INTEGER,
  duration_ms INTEGER,

  -- Input context
  source_type TEXT, -- manual_topic, rss, candidate
  source_id UUID,
  input_context JSONB, -- What info was used to generate

  -- Output
  generated_text TEXT NOT NULL,
  character_count INTEGER,

  -- Quality check
  passed_quality_check BOOLEAN DEFAULT true,
  quality_issues TEXT[],

  -- Usage
  used_for_post BOOLEAN DEFAULT false,
  post_id UUID REFERENCES posts_history(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_generation_generated_at ON post_generation_logs(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_generation_used ON post_generation_logs(used_for_post);

-- ============================================================================
-- ENHANCED EXISTING TABLES
-- ============================================================================

-- Add analysis reference to candidates
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS analysis_id UUID REFERENCES content_analysis_logs(id);

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS overall_score NUMERIC(3, 2);

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ;

-- Add generation reference to posts_history
ALTER TABLE posts_history
  ADD COLUMN IF NOT EXISTS generation_id UUID REFERENCES post_generation_logs(id);

ALTER TABLE posts_history
  ADD COLUMN IF NOT EXISTS automation_run_id UUID REFERENCES automation_runs(id);

ALTER TABLE posts_history
  ADD COLUMN IF NOT EXISTS content_analysis_id UUID REFERENCES content_analysis_logs(id);

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View: recent_activity_summary
-- Quick overview of recent automation activity
CREATE OR REPLACE VIEW recent_activity_summary AS
SELECT
  DATE(started_at) as date,
  COUNT(*) as runs,
  SUM(posts_created) as total_posts,
  SUM(candidates_evaluated) as total_candidates,
  SUM(errors_count) as total_errors,
  AVG(duration_ms) as avg_duration_ms
FROM automation_runs
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(started_at)
ORDER BY date DESC;

-- View: content_pipeline_status
-- Current state of content pipeline
CREATE OR REPLACE VIEW content_pipeline_status AS
SELECT
  'Total Candidates' as stage,
  COUNT(*) as count,
  NULL::NUMERIC as avg_score
FROM candidates
WHERE NOT used

UNION ALL

SELECT
  'Analyzed' as stage,
  COUNT(*) as count,
  AVG(overall_score) as avg_score
FROM candidates
WHERE NOT used AND analyzed_at IS NOT NULL

UNION ALL

SELECT
  'High Quality (>0.7)' as stage,
  COUNT(*) as count,
  AVG(overall_score) as avg_score
FROM candidates
WHERE NOT used AND overall_score > 0.7

UNION ALL

SELECT
  'Posted Today' as stage,
  COUNT(*) as count,
  NULL::NUMERIC as avg_score
FROM posts_history
WHERE posted_at > NOW() - INTERVAL '1 day';

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Function to auto-archive old activity stream entries
CREATE OR REPLACE FUNCTION cleanup_old_activity_stream()
RETURNS void AS $$
BEGIN
  DELETE FROM activity_stream
  WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMPLETE
-- ============================================================================
