# GitHub Actions Cron Setup

This workflow runs your X Autoposter cron jobs **3 times per day** using GitHub Actions instead of Vercel Cron, bypassing Vercel's Hobby tier limitation of 1 daily cron job.

## Setup Instructions

### 1. Add GitHub Secret

You need to add your Vercel app URL as a secret:

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `VERCEL_APP_URL`
5. Value: Your Vercel app URL (e.g., `https://your-app.vercel.app`)
6. Click **Add secret**

### 2. Enable GitHub Actions

GitHub Actions should be enabled by default, but verify:

1. Go to **Settings** → **Actions** → **General**
2. Ensure "Allow all actions and reusable workflows" is selected
3. Save if needed

### 3. Verify Workflow

1. Go to **Actions** tab in your repository
2. You should see "X Autoposter Cron Jobs" workflow
3. Click on it to see scheduled runs

## Schedule

The workflow runs at:
- **9:00 AM UTC** - Morning post generation
- **1:00 PM UTC** - Afternoon post generation
- **6:00 PM UTC** - Evening post generation

Each run:
1. Processes any scheduled posts ready to be published
2. Generates new content if it's a posting time
3. Logs success/failure to GitHub Actions

## Manual Trigger

You can manually trigger the workflow:

1. Go to **Actions** tab
2. Select "X Autoposter Cron Jobs"
3. Click **Run workflow** → **Run workflow**

## Benefits

✅ **Free** - GitHub Actions is free for public repositories
✅ **No Vercel limits** - Doesn't count against Vercel's cron job limits
✅ **Flexible schedule** - Run as many times per day as needed
✅ **Reliable** - GitHub's infrastructure handles scheduling
✅ **Logs** - View execution logs in GitHub Actions tab

## Troubleshooting

If the workflow fails:

1. Check the **Actions** tab for error logs
2. Verify `VERCEL_APP_URL` secret is set correctly
3. Ensure your Vercel app is deployed and accessible
4. Check that `/api/cron/automation` endpoint is working

## Cost

- **GitHub Actions**: Free for public repos (2,000 minutes/month for private repos)
- **Vercel API calls**: 3 calls per day from GitHub Actions (doesn't count against cron limit)
- **Total**: Completely free! 🎉
