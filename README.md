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
- Cron (Hobby): single daily job `0 9 * * *` in `vercel.json`
- Optional security: set `CRON_SECRET` in Vercel and require `Authorization: Bearer <secret>`

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
