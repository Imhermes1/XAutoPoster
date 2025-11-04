-- Fix media_ids column type to store X API media ID strings instead of UUIDs
-- X API returns media_id_string (TEXT) which we need to store and use when posting

ALTER TABLE bulk_post_queue
  ALTER COLUMN media_ids TYPE TEXT[]
  USING media_ids::TEXT[];

COMMENT ON COLUMN bulk_post_queue.media_ids IS 'X API media ID strings for attached images (up to 4 images per tweet)';

-- No need to change indexes as media_ids was not indexed
