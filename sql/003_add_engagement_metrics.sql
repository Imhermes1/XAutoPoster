-- Add engagement metrics to candidates table for trending detection
-- These metrics come with the tweet data when fetching, so no extra API calls needed

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retweets_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replies_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_score NUMERIC(10, 2) GENERATED ALWAYS AS (
    (likes_count * 1.0) + (retweets_count * 2.0) + (replies_count * 0.5)
  ) STORED;

-- Index for finding high-engagement candidates
CREATE INDEX IF NOT EXISTS candidates_engagement_idx ON candidates(engagement_score DESC) WHERE NOT used;

-- View for trending candidates (high engagement, recent, unused)
CREATE OR REPLACE VIEW trending_candidates AS
SELECT
  id,
  type,
  source,
  external_id,
  url,
  title,
  text,
  image_url,
  likes_count,
  retweets_count,
  replies_count,
  engagement_score,
  fetched_at,
  overall_score
FROM candidates
WHERE NOT used
  AND type = 'tweet'
  AND engagement_score > 100  -- Threshold for "trending"
  AND fetched_at > NOW() - INTERVAL '24 hours'  -- Recent only
ORDER BY engagement_score DESC, fetched_at DESC
LIMIT 50;

COMMENT ON COLUMN candidates.engagement_score IS 'Calculated engagement score: (likes * 1.0) + (retweets * 2.0) + (replies * 0.5)';
COMMENT ON VIEW trending_candidates IS 'High-engagement tweets from the last 24 hours, sorted by viral potential';
