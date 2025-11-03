-- Create automation_config table
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

-- Create media_library table
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

-- Create api_usage_tracking table
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

-- Create bulk_post_queue table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage_tracking(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_provider ON api_usage_tracking(provider);
CREATE INDEX IF NOT EXISTS idx_bulk_queue_batch ON bulk_post_queue(batch_id);
CREATE INDEX IF NOT EXISTS idx_bulk_queue_status ON bulk_post_queue(status);
CREATE INDEX IF NOT EXISTS idx_media_library_uploaded_at ON media_library(uploaded_at DESC);

-- Add columns to posts_history
ALTER TABLE posts_history
  ADD COLUMN IF NOT EXISTS media_ids UUID[],
  ADD COLUMN IF NOT EXISTS link_url TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS llm_model TEXT,
  ADD COLUMN IF NOT EXISTS tokens_used INTEGER;

-- Add columns to manual_topics
ALTER TABLE manual_topics
  ADD COLUMN IF NOT EXISTS media_id UUID REFERENCES media_library(id),
  ADD COLUMN IF NOT EXISTS link_url TEXT;

-- Add brand_voice_instructions column to automation_config if it doesn't exist
ALTER TABLE automation_config
  ADD COLUMN IF NOT EXISTS brand_voice_instructions TEXT DEFAULT 'You are a helpful AI assistant creating engaging social media posts.';

-- Add LLM API key storage columns if they don't exist (OpenRouter only used by app)
ALTER TABLE automation_config
  ADD COLUMN IF NOT EXISTS llm_api_key TEXT;
ALTER TABLE automation_config
  ADD COLUMN IF NOT EXISTS openrouter_api_key TEXT;
-- X API credentials (optional if stored in env)
ALTER TABLE automation_config
  ADD COLUMN IF NOT EXISTS x_api_key TEXT;
ALTER TABLE automation_config
  ADD COLUMN IF NOT EXISTS x_api_secret TEXT;
ALTER TABLE automation_config
  ADD COLUMN IF NOT EXISTS x_access_token TEXT;
ALTER TABLE automation_config
  ADD COLUMN IF NOT EXISTS x_access_token_secret TEXT;

-- OAuth 2.0 token storage (user context)
ALTER TABLE automation_config
  ADD COLUMN IF NOT EXISTS oauth2_access_token TEXT,
  ADD COLUMN IF NOT EXISTS oauth2_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS oauth2_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS oauth2_scope TEXT;
