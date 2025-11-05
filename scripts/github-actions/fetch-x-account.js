#!/usr/bin/env node

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const xBearerToken = process.env.X_BEARER_TOKEN;

if (!supabaseUrl || !supabaseServiceKey || !xBearerToken) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fetchUserTweets(userId) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      max_results: '10',
      expansions: 'attachments.media_keys',
      'media.fields': 'url,preview_image_url',
      'tweet.fields': 'created_at,public_metrics',
    });

    const options = {
      hostname: 'api.x.com',
      path: `/2/users/${userId}/tweets?${params.toString()}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${xBearerToken}`,
      },
    };

    https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject).end();
  });
}

async function main() {
  try {
    const { data: accounts, error: accountsError } = await supabase
      .from('sources_accounts')
      .select('id, handle, user_id, last_fetched_at')
      .eq('active', true);

    if (accountsError) throw accountsError;
    if (!accounts || accounts.length === 0) {
      console.log('No active accounts found');
      process.exit(0);
    }

    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    const eligibleAccounts = accounts.filter((acc) => {
      if (!acc.last_fetched_at) return true;
      const lastFetch = new Date(acc.last_fetched_at).getTime();
      return lastFetch < twentyFourHoursAgo;
    });

    if (eligibleAccounts.length === 0) {
      console.log('No eligible accounts to fetch (all recently fetched)');
      process.exit(0);
    }

    const accountToFetch = eligibleAccounts.sort(
      (a, b) => new Date(a.last_fetched_at || 0) - new Date(b.last_fetched_at || 0)
    )[0];

    console.log(`Fetching tweets from @${accountToFetch.handle}`);

    const tweets = await fetchUserTweets(accountToFetch.user_id);
    console.log(`Fetched ${tweets.data?.length || 0} tweets`);

    if (!tweets.data || tweets.data.length === 0) {
      console.log('No tweets found');
      process.exit(0);
    }

    console.log('Sending to Supabase Edge Function for processing...');

    const payload = JSON.stringify({
      accountId: accountToFetch.id,
      handle: accountToFetch.handle,
      tweets: tweets.data,
      media: tweets.includes?.media || [],
    });

    const options = {
      hostname: new URL(supabaseUrl).hostname,
      path: '/functions/v1/ingest-x-account',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('Successfully sent to Edge Function');
          process.exit(0);
        } else {
          console.error(`Edge Function returned ${res.statusCode}:`, data);
          process.exit(1);
        }
      });
    });

    req.on('error', (e) => {
      console.error('Error calling Edge Function:', e);
      process.exit(1);
    });

    req.write(payload);
    req.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
