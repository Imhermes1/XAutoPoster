-- Create sources table for managing RSS feeds and other content sources
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  category TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sources_created_at ON sources(created_at DESC);

-- Add comment
COMMENT ON TABLE sources IS 'RSS feeds and content sources for article ingestion';
