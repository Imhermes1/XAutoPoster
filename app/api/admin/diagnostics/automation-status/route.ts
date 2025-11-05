import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET() {
  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      checks: {},
      blockers: [],
      warnings: [],
      ready_to_automate: false,
    };

    // 1. Check automation config
    try {
      const { data: config, error } = await supabase
        .from('automation_config')
        .select('*')
        .single();

      if (error || !config) {
        diagnostics.checks.automation_config = {
          status: 'error',
          message: 'No automation_config found in database',
        };
        diagnostics.blockers.push('No automation configuration exists. Run migrations first.');
      } else {
        diagnostics.checks.automation_config = {
          status: config.enabled ? 'ok' : 'disabled',
          enabled: config.enabled,
          posting_times: config.posting_times || ['09:00', '12:00', '14:00', '16:00', '18:00'],
          timezone: config.timezone || 'Australia/Sydney',
          daily_limit: config.daily_limit || 2,
          llm_model: config.llm_model || 'not set',
        };

        if (!config.enabled) {
          diagnostics.blockers.push('Automation is DISABLED. Set enabled=true in automation_config.');
        }

        if (!config.llm_model) {
          diagnostics.blockers.push('LLM model not configured. Set llm_model in automation_config.');
        }
      }
    } catch (e: any) {
      diagnostics.checks.automation_config = {
        status: 'error',
        message: e.message,
      };
      diagnostics.blockers.push(`Failed to check automation config: ${e.message}`);
    }

    // 2. Check LLM API key
    const hasOpenrouterKey = !!process.env.OPENROUTER_API_KEY;
    diagnostics.checks.llm_api_key = {
      status: hasOpenrouterKey ? 'ok' : 'missing',
      env_var_set: hasOpenrouterKey,
    };
    if (!hasOpenrouterKey) {
      diagnostics.blockers.push('OPENROUTER_API_KEY not set in environment variables.');
    }

    // 3. Check X API credentials
    const hasXApiKey = !!process.env.X_API_KEY;
    const hasXApiSecret = !!process.env.X_API_SECRET;
    const hasXAccessToken = !!process.env.X_ACCESS_TOKEN;
    const hasXAccessSecret = !!process.env.X_ACCESS_TOKEN_SECRET;

    diagnostics.checks.x_api_credentials = {
      status:
        hasXApiKey && hasXApiSecret && hasXAccessToken && hasXAccessSecret
          ? 'ok'
          : 'missing',
      x_api_key: hasXApiKey,
      x_api_secret: hasXApiSecret,
      x_access_token: hasXAccessToken,
      x_access_token_secret: hasXAccessSecret,
    };

    if (!hasXApiKey || !hasXApiSecret || !hasXAccessToken || !hasXAccessSecret) {
      diagnostics.blockers.push(
        'X API credentials incomplete. Need: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET'
      );
    }

    // 4. Check X Accounts sources
    try {
      const { data: accounts, error } = await supabase
        .from('sources_accounts')
        .select('id, handle, active')
        .eq('active', true);

      if (error) {
        diagnostics.checks.x_accounts = {
          status: 'error',
          message: error.message,
        };
      } else {
        diagnostics.checks.x_accounts = {
          status: accounts && accounts.length > 0 ? 'ok' : 'none',
          active_count: accounts?.length || 0,
          accounts: accounts?.map((a: any) => a.handle) || [],
        };

        if (!accounts || accounts.length === 0) {
          diagnostics.warnings.push(
            'No active X accounts configured. Add accounts via Admin Dashboard > Sources > X Accounts'
          );
        }
      }
    } catch (e: any) {
      diagnostics.checks.x_accounts = {
        status: 'error',
        message: e.message,
      };
    }

    // 5. Check Keywords sources
    try {
      const { data: keywords, error } = await supabase
        .from('sources_keywords')
        .select('id, query, active')
        .eq('active', true);

      if (error) {
        diagnostics.checks.keywords = {
          status: 'error',
          message: error.message,
        };
      } else {
        diagnostics.checks.keywords = {
          status: keywords && keywords.length > 0 ? 'ok' : 'none',
          active_count: keywords?.length || 0,
          keywords: keywords?.map((k: any) => k.query) || [],
        };

        if (!keywords || keywords.length === 0) {
          diagnostics.warnings.push(
            'No active keywords configured. Add keywords via Admin Dashboard > Sources > Keywords'
          );
        }
      }
    } catch (e: any) {
      diagnostics.checks.keywords = {
        status: 'error',
        message: e.message,
      };
    }

    // 6. Check RSS sources
    try {
      const { data: rss, error } = await supabase
        .from('sources')
        .select('id, url')
        .limit(5);

      if (error) {
        diagnostics.checks.rss_sources = {
          status: 'error',
          message: error.message,
        };
      } else {
        diagnostics.checks.rss_sources = {
          status: rss && rss.length > 0 ? 'ok' : 'none',
          count: rss?.length || 0,
          sources: rss?.map((r: any) => r.url) || [],
        };
      }
    } catch (e: any) {
      diagnostics.checks.rss_sources = {
        status: 'error',
        message: e.message,
      };
    }

    // 7. Check for candidates
    try {
      const { data: candidates, error } = await supabase
        .from('candidates')
        .select('id')
        .eq('used', false)
        .limit(1);

      if (error) {
        diagnostics.checks.candidates = {
          status: 'error',
          message: error.message,
        };
      } else {
        diagnostics.checks.candidates = {
          status: 'ok',
          unused_count: candidates?.length || 0,
        };

        if (!candidates || candidates.length === 0) {
          diagnostics.warnings.push(
            'No candidate content available. Ensure sources are configured and run ingestion.'
          );
        }
      }
    } catch (e: any) {
      diagnostics.checks.candidates = {
        status: 'error',
        message: e.message,
      };
    }

    // 8. Check daily post count
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: posts, error } = await supabase
        .from('posts_history')
        .select('id')
        .gte('posted_at', oneDayAgo);

      if (error) {
        diagnostics.checks.daily_posts = {
          status: 'error',
          message: error.message,
        };
      } else {
        const config = diagnostics.checks.automation_config?.daily_limit || 2;
        const count = posts?.length || 0;
        diagnostics.checks.daily_posts = {
          status: 'ok',
          posts_today: count,
          daily_limit: config,
          limit_reached: count >= config,
        };

        if (count >= config) {
          diagnostics.warnings.push(
            `Daily post limit reached (${count}/${config}). Automation will skip until tomorrow.`
          );
        }
      }
    } catch (e: any) {
      diagnostics.checks.daily_posts = {
        status: 'error',
        message: e.message,
      };
    }

    // Determine if automation is ready
    diagnostics.ready_to_automate =
      diagnostics.blockers.length === 0 && !diagnostics.checks.automation_config?.disabled;

    // Summary
    diagnostics.summary = {
      blockers_count: diagnostics.blockers.length,
      warnings_count: diagnostics.warnings.length,
      status: diagnostics.ready_to_automate ? 'READY' : 'NOT READY',
    };

    return NextResponse.json(diagnostics);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Diagnostics failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
