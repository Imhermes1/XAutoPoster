-- Add brand voice preset column to automation_config
ALTER TABLE automation_config
ADD COLUMN brand_voice_preset TEXT DEFAULT NULL;

-- Add comment describing the column
COMMENT ON COLUMN automation_config.brand_voice_preset IS 'Selected brand voice preset (e.g., "default", "slow_developer"). When set, overrides brand_voice_instructions.';
