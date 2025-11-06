-- Add performance indexes for high-traffic queries
-- These indexes improve query speed as data grows

-- Index for bulk_post_queue status and scheduling queries
CREATE INDEX IF NOT EXISTS idx_queue_status_scheduled
ON bulk_post_queue(status, scheduled_for);

-- Index for candidates used/unused filtering and sorting
CREATE INDEX IF NOT EXISTS idx_candidates_used_score
ON candidates(used DESC, overall_score DESC);

-- Index for ingestion logs - uses created_at for consistency
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_status_created
ON ingestion_logs(status, created_at DESC);
