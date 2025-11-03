# X Autoposter (MVP)

Automates posting 1–3 times daily to X (Twitter) using RSS-sourced topics + LLM generation.

## Quick Start

1. Install deps

```
cd x-autoposter
npm install
```

2. Configure env

```
cp .env.example .env.local
# Fill values for X API, OpenRouter, Supabase
```

3. Run dev

```
npm run dev
```

- Dashboard: `http://localhost:3000/`
- Health: `http://localhost:3000/api/health`
- Trigger a post (manual): `POST /api/cron/post`

## Deploy (Vercel)
- Import the repo
- Set Environment Variables (from `.env.example`)
- Ensure Supabase env vars are set (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- Cron (Hobby): single daily job `0 9 * * *` in `vercel.json`
- Optional security: set `CRON_SECRET` in Vercel and require `Authorization: Bearer <secret>`

LLM keys
- Preferred: `OPENROUTER_API_KEY` (works with OpenRouter base URL)
- Fallback: `OPENAI_API_KEY` (also accepted if you prefer)
- Model env: `OPENROUTER_MODEL` (or `OPENAI_MODEL`) defaults to `google/gemini-2.0-flash-exp:free`

## Database: Supabase setup
Use Supabase (Postgres) instead of Vercel KV. Create tables in the SQL Editor:

```sql
-- Post history
create table if not exists public.posts_history (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  posted_at timestamptz not null,
  topic_id text,
  media_ids text[],
  quote_tweet_id text
);
create index if not exists posts_history_posted_at_idx on public.posts_history (posted_at desc);

-- Manual topics
create table if not exists public.manual_topics (
  id text primary key,
  topic text not null,
  added_at timestamptz not null,
  used boolean not null default false,
  remaining integer not null default 1
);

-- RSS sources
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  category text,
  created_at timestamptz not null default now()
);

-- X ingestion
create table if not exists public.sources_accounts (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique,
  user_id text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_fetched_at timestamptz
);

create table if not exists public.sources_keywords (
  id uuid primary key default gen_random_uuid(),
  query text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_fetched_at timestamptz
);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('tweet','rss')),
  source text not null,
  external_id text not null unique,
  url text,
  title text,
  text text,
  image_url text,
  fetched_at timestamptz not null default now(),
  used boolean not null default false
);
```

Environment variables (server-only):
- `SUPABASE_URL` — your project URL
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (keep server-side only)

RLS: You can keep RLS enabled with permissive policies for service role, or disable RLS for these tables if only accessed server-side.

## Multiple posts/day on Hobby
Vercel Hobby only allows one daily cron. Use GitHub Actions to call your endpoint multiple times per day:

1. Set GitHub repo secrets:
   - `POST_URL` = `https://<your-vercel-domain>/api/cron/post`
   - `CRON_SECRET` = same value as Vercel `CRON_SECRET`
2. Workflow file: `.github/workflows/auto-post.yml` (already included)
   - Schedules: 09:00, 13:00, 18:00 UTC (adjust as needed)
3. The workflow makes a POST with `Authorization: Bearer <CRON_SECRET>`

## Notes
- LLM: `OPENROUTER_MODEL` defaults to `google/gemini-2.0-flash-exp:free`
- Daily cap via `DAILY_POST_LIMIT`
- X API uses OAuth 1.0a to post to `/2/tweets`
