-- Add draft status support to bulk_post_queue for scheduled posting
-- This allows users to save generated tweets as drafts before scheduling

-- The status flow is:
-- 'draft' -> User generated but hasn't scheduled yet
-- 'pending' -> Scheduled and waiting for scheduled_for time
-- 'posted' -> Successfully posted to X
-- 'failed' -> Attempted to post but encountered an error

COMMENT ON COLUMN bulk_post_queue.status IS 'Status: draft (saved), pending (scheduled), posted (live), failed (error)';
COMMENT ON COLUMN bulk_post_queue.scheduled_for IS 'When to post this tweet (NULL for immediate, set for scheduled)';

-- Index for efficiently querying posts that need to be processed
CREATE INDEX IF NOT EXISTS idx_bulk_queue_scheduled
ON bulk_post_queue(scheduled_for, status)
WHERE status = 'pending' AND scheduled_for IS NOT NULL;

-- Index for querying draft posts
CREATE INDEX IF NOT EXISTS idx_bulk_queue_drafts
ON bulk_post_queue(batch_id, created_at)
WHERE status = 'draft';

COMMENT ON INDEX idx_bulk_queue_scheduled IS 'Optimizes cron job queries for scheduled posts ready to be posted';
COMMENT ON INDEX idx_bulk_queue_drafts IS 'Optimizes queries for fetching draft posts by batch';
