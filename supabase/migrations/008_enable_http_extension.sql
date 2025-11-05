-- Enable HTTP extension for database triggers to call Edge Functions
create extension if not exists "http" with schema extensions;

-- Verify extension is installed
select * from pg_extension where extname = 'http';
