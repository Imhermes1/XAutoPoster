-- Clear the bulk_post_queue table to start fresh
DELETE FROM bulk_post_queue;

-- Verify it's empty
SELECT 'bulk_post_queue cleared, remaining: ' || COUNT(*) as status FROM bulk_post_queue;
