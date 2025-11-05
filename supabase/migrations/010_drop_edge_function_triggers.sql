-- Drop triggers that depend on unavailable 'net' extension
-- We handle all processing in Node.js code, not in database triggers

drop trigger if exists on_candidate_created on bulk_post_queue;
drop trigger if exists on_analysis_complete on bulk_post_queue;

drop function if exists trigger_analyze_content();
drop function if exists trigger_generate_tweet();
