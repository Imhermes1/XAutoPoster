-- Complete Database Schema for X Autoposter
-- Run this in Supabase SQL Editor to create all tables
-- Safe to run multiple times (uses IF NOT EXISTS)

-- ============================================================================
-- BASE TABLES
-- ============================================================================

-- Table: posts_history
-- Stores all posted tweets
CREATE TABLE IF NOT EXISTS posts_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL,
  topic_id TEXT,
  media_ids TEXT[],
  quote_tweet_id TEXT
);

CREATE INDEX IF NOT EXISTS posts_history_posted_at_idx ON posts_history(posted_at DESC);

-- Table: manual_topics
-- Manually added topics for posting
CREATE TABLE IF NOT EXISTS manual_topics (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  remaining INTEGER DEFAULT 1
);

-- Table: sources
-- RSS feed sources
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: sources_accounts
-- X accounts for ingestion
CREATE TABLE IF NOT EXISTS sources_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT UNIQUE NOT NULL,
  user_id TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_fetched_at TIMESTAMPTZ
);

-- Table: sources_keywords
-- Keywords to search for on X
CREATE TABLE IF NOT EXISTS sources_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_fetched_at TIMESTAMPTZ
);

-- Table: candidates
-- Content candidates (from RSS or X) awaiting review
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('tweet', 'rss')),
  source TEXT NOT NULL,
  external_id TEXT UNIQUE NOT NULL,
  url TEXT,
  title TEXT,
  text TEXT,
  image_url TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  used BOOLEAN DEFAULT false
);

-- ============================================================================
-- NEW TABLES (from migration)
-- ============================================================================

-- Table: automation_config
-- Global automation settings
CREATE TABLE IF NOT EXISTS automation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  posting_times TEXT[] DEFAULT ARRAY['09:00', '13:00', '18:00'],
  timezone TEXT DEFAULT 'UTC',
  randomize_minutes INTEGER DEFAULT 15,
  daily_limit INTEGER DEFAULT 2,
  llm_model TEXT DEFAULT 'google/gemini-2.0-flash-exp:free',
  llm_provider TEXT DEFAULT 'openrouter',
  brand_voice_instructions TEXT DEFAULT 'You are a helpful AI assistant creating engaging social media posts.',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: media_library
-- Uploaded media files
CREATE TABLE IF NOT EXISTS media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  description TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by TEXT,
  UNIQUE(file_path)
);

-- Table: api_usage_tracking
-- Tracks LLM API costs and usage
CREATE TABLE IF NOT EXISTS api_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  provider TEXT NOT NULL,
  model TEXT,
  endpoint TEXT,
  tokens_used INTEGER,
  cost_usd NUMERIC(10, 6),
  status TEXT,
  error_message TEXT
);

-- Table: bulk_post_queue
-- Queue for bulk posting operations
CREATE TABLE IF NOT EXISTS bulk_post_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL,
  post_text TEXT NOT NULL,
  media_ids UUID[],
  link_url TEXT,
  scheduled_for TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  posted_at TIMESTAMPTZ,
  x_post_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage_tracking(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_provider ON api_usage_tracking(provider);
CREATE INDEX IF NOT EXISTS idx_bulk_queue_batch ON bulk_post_queue(batch_id);
CREATE INDEX IF NOT EXISTS idx_bulk_queue_status ON bulk_post_queue(status);
CREATE INDEX IF NOT EXISTS idx_media_library_uploaded_at ON media_library(uploaded_at DESC);

-- ============================================================================
-- ALTER EXISTING TABLES (add new columns)
-- ============================================================================

-- Add columns to posts_history
ALTER TABLE posts_history
  ADD COLUMN IF NOT EXISTS media_ids UUID[];
ALTER TABLE posts_history
  ADD COLUMN IF NOT EXISTS link_url TEXT;
ALTER TABLE posts_history
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual';
ALTER TABLE posts_history
  ADD COLUMN IF NOT EXISTS llm_model TEXT;
ALTER TABLE posts_history
  ADD COLUMN IF NOT EXISTS tokens_used INTEGER;

-- Add columns to manual_topics
ALTER TABLE manual_topics
  ADD COLUMN IF NOT EXISTS media_id UUID REFERENCES media_library(id);
ALTER TABLE manual_topics
  ADD COLUMN IF NOT EXISTS link_url TEXT;

-- Add brand_voice_instructions column to automation_config
ALTER TABLE automation_config
  ADD COLUMN IF NOT EXISTS brand_voice_instructions TEXT DEFAULT 'You are a helpful AI assistant creating engaging social media posts.';

-- Add LLM API key storage columns
ALTER TABLE automation_config
  ADD COLUMN IF NOT EXISTS llm_api_key TEXT;
ALTER TABLE automation_config
  ADD COLUMN IF NOT EXISTS openrouter_api_key TEXT;

-- Add X API credentials (optional if stored in env)
ALTER TABLE automation_config
  ADD COLUMN IF NOT EXISTS x_api_key TEXT;
ALTER TABLE automation_config
  ADD COLUMN IF NOT EXISTS x_api_secret TEXT;
ALTER TABLE automation_config
  ADD COLUMN IF NOT EXISTS x_access_token TEXT;
ALTER TABLE automation_config
  ADD COLUMN IF NOT EXISTS x_access_token_secret TEXT;

-- Add OAuth 2.0 token storage (user context)
ALTER TABLE automation_config
  ADD COLUMN IF NOT EXISTS oauth2_access_token TEXT;
ALTER TABLE automation_config
  ADD COLUMN IF NOT EXISTS oauth2_refresh_token TEXT;
ALTER TABLE automation_config
  ADD COLUMN IF NOT EXISTS oauth2_expires_at TIMESTAMPTZ;
ALTER TABLE automation_config
  ADD COLUMN IF NOT EXISTS oauth2_scope TEXT;

-- ============================================================================
-- COMPLETE - All tables and columns created
-- ============================================================================
