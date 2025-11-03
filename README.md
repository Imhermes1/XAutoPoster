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
# Fill values for X API, OpenRouter, KV
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
- Ensure KV (Upstash Redis) is provisioned and `KV_URL`/`KV_TOKEN` set
- Cron: single job with multi-hour schedule `0 9,13,18 * * *` (fits lower plan limits)

## Notes
- LLM: `OPENROUTER_MODEL` defaults to `google/gemini-2.0-flash-exp:free`
- Daily cap via `DAILY_POST_LIMIT`
- X API uses OAuth 1.0a to post to `/2/tweets`
