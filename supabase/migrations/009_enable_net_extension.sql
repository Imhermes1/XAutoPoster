-- Enable net extension for HTTP calls from database functions
create extension if not exists "net" with schema public;

-- Verify extension is installed
select * from pg_extension where extname = 'net';
