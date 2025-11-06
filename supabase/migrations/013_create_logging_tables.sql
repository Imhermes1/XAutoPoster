-- Create logging tables for activity tracking

-- Automation runs tracking
CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'running', -- running, completed, failed
  candidates_analyzed INTEGER DEFAULT 0,
  candidates_accepted INTEGER DEFAULT 0,
  posts_generated INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Content analysis logs
CREATE TABLE IF NOT EXISTS content_analysis_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analyzed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  source_type VARCHAR(50), -- rss, twitter, etc
  item_title TEXT,
  analysis_score DECIMAL(3,1),
  reason TEXT,
  status VARCHAR(50) DEFAULT 'analyzed', -- analyzed, accepted, rejected
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Post generation logs
CREATE TABLE IF NOT EXISTS post_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  source_text TEXT,
  generated_post TEXT,
  quality_score DECIMAL(3,1),
  engagement_score DECIMAL(3,1),
  virality_score DECIMAL(3,1),
  status VARCHAR(50) DEFAULT 'generated', -- generated, queued, posted, failed
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ingestion logs
CREATE TABLE IF NOT EXISTS ingestion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  source_url TEXT,
  source_type VARCHAR(50), -- rss, twitter, etc
  items_found INTEGER DEFAULT 0,
  items_inserted INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'success', -- success, partial, failed
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_automation_runs_started_at ON automation_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_analysis_analyzed_at ON content_analysis_logs(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_generation_generated_at ON post_generation_logs(generated_at DESC);
-- Note: ingestion_logs may use different column name, skipping for now

-- Add comments
COMMENT ON TABLE automation_runs IS 'Tracks each automation run cycle with results and timing';
COMMENT ON TABLE content_analysis_logs IS 'Logs of content analysis decisions (accepted/rejected)';
COMMENT ON TABLE post_generation_logs IS 'Logs of generated posts with quality metrics';
COMMENT ON TABLE ingestion_logs IS 'Logs of RSS/Twitter feed ingestion operations';
