-- Seed automation_config with default row if table is empty
-- This ensures fresh Supabase projects have a working config
-- Without this seed, generatePost() fails with "No LLM model configured"

INSERT INTO automation_config (
  id,
  enabled,
  posting_times,
  timezone,
  randomize_minutes,
  daily_limit,
  llm_model,
  brand_voice_instructions,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  true,
  ARRAY['09:00', '13:00', '18:00'],
  'UTC',
  15,
  2,
  'google/gemini-2.0-flash-exp:free',
  'You are a helpful AI assistant creating engaging social media posts.',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM automation_config LIMIT 1);
