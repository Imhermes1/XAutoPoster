-- Add quality score columns to bulk_post_queue table
-- These columns store the AI quality assessment results

ALTER TABLE bulk_post_queue
ADD COLUMN quality_score DECIMAL(3,1) DEFAULT NULL,
ADD COLUMN engagement_score DECIMAL(3,1) DEFAULT NULL,
ADD COLUMN virality_score DECIMAL(3,1) DEFAULT NULL,
ADD COLUMN content_type VARCHAR(50) DEFAULT NULL;

-- Add comments to explain each column
COMMENT ON COLUMN bulk_post_queue.quality_score IS 'Overall quality score (0-10) from AI assessment. Tweets < 7.0 are rejected.';
COMMENT ON COLUMN bulk_post_queue.engagement_score IS 'Engagement potential score (0-10) - likelihood of getting likes/comments';
COMMENT ON COLUMN bulk_post_queue.virality_score IS 'Virality potential score (0-10) - likelihood of being retweeted/shared';
COMMENT ON COLUMN bulk_post_queue.content_type IS 'Content classification: conversation-starter, tips-tricks, informative, or other';
