import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { postToX, postToXAdvanced } from '@/lib/x-api';
import { savePostHistory, getLastPostTime } from '@/lib/kv-storage';
import { ingestFromAccountsAndKeywords, ingestFromRSSFeeds } from '@/lib/twitter-reader';
import { fetchRecentNews } from '@/lib/rss-fetcher';
import { startAutomationRun, completeAutomationRun, logActivity } from '@/lib/automation-logger';
import { generatePost } from '@/lib/content-generator';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function getAutomationConfig() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return null;
    }

    const { data, error } = await supabase
      .from('automation_config')
      .select('*')
      .single();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

async function processScheduledPosts() {
  try {
    const now = new Date().toISOString();

    // Fetch all pending posts that are due to be posted
    const { data: duePostsData, error: fetchError } = await supabase
      .from('bulk_post_queue')
      .select('*')
      .eq('status', 'pending')
      .not('scheduled_for', 'is', null)
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true });

    if (fetchError) {
      console.error('Failed to fetch scheduled posts:', fetchError);
      return { error: 'Failed to fetch scheduled posts' };
    }

    const duePosts = duePostsData || [];
    console.log(`Found ${duePosts.length} posts due for posting`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      posts: [] as any[],
    };

    // Process each post
    for (const post of duePosts) {
      try {
        console.log(`Posting scheduled tweet: ${post.id}`);

        // Post to X (with media if available)
        let result;
        if (post.media_ids && post.media_ids.length > 0) {
          console.log(`Posting with ${post.media_ids.length} media attachment(s)`);
          result = await postToXAdvanced({
            text: post.post_text,
            media_ids: post.media_ids,
          });
        } else {
          result = await postToX(post.post_text);
        }

        if (result.success) {
          // Update post status to posted
          const { error: updateError } = await supabase
            .from('bulk_post_queue')
            .update({
              status: 'posted',
              posted_at: new Date().toISOString(),
              x_post_id: result.id,
            })
            .eq('id', post.id);

          if (updateError) {
            console.error(`Failed to update post ${post.id}:`, updateError);
          }

          // Save to post history
          await savePostHistory({
            text: post.post_text,
            postedAt: Date.now(),
            topicId: undefined,
          });

          results.succeeded++;
          results.posts.push({
            id: post.id,
            status: 'posted',
            x_post_id: result.id,
          });

          console.log(`Successfully posted: ${post.id} -> ${result.id}`);
        } else {
          // Update post status to failed
          const { error: updateError } = await supabase
            .from('bulk_post_queue')
            .update({
              status: 'failed',
              error_message: result.error || 'Unknown error',
            })
            .eq('id', post.id);

          if (updateError) {
            console.error(`Failed to update post ${post.id}:`, updateError);
          }

          results.failed++;
          results.posts.push({
            id: post.id,
            status: 'failed',
            error: result.error,
          });

          console.error(`Failed to post: ${post.id} - ${result.error}`);
        }

        results.processed++;

        // Small delay between posts to avoid rate limiting
        if (duePosts.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error);

        // Update post status to failed
        await supabase
          .from('bulk_post_queue')
          .update({
            status: 'failed',
            error_message: String(error),
          })
          .eq('id', post.id);

        results.failed++;
        results.posts.push({
          id: post.id,
          status: 'failed',
          error: String(error),
        });
      }
    }

    return {
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Scheduled post processor failed:', error);
    return { error: 'Failed to process scheduled posts' };
  }
}

/**
 * Unified cron job that handles both:
 * 1. Processing scheduled posts (every run)
 * 2. Generating new posts (at scheduled times only)
 *
 * This consolidates /api/cron/post and /api/cron/process-scheduled into one endpoint
 * to work within Vercel's free tier limit of 1 cron job.
 */
async function runAutomation(request: NextRequest) {
  let automationRunId: string | null = null;

  try {
    const results: any = {
      ingestion: null,
      scheduled_posts: null,
      new_post_generation: null,
    };

    console.log('[automation] Starting unified cron job');

    // Start automation logging
    automationRunId = await startAutomationRun('cron');
    if (!automationRunId) {
      console.error('[automation] Failed to start automation run log');
    } else {
      console.log('[automation] Started automation run:', automationRunId);
    }

    // 0. Ingest from sources (X accounts, keywords, RSS feeds)
    try {
      console.log('[automation] Running ingestion from sources...');
      await logActivity({
        category: 'ingestion',
        severity: 'info',
        title: 'Starting Content Ingestion',
        description: 'Fetching from X accounts, keywords, and RSS feeds',
        automation_run_id: automationRunId || undefined,
      });

      // Run X accounts and keywords ingestion (24hr cooldown per source)
      const xIngestionResult = await ingestFromAccountsAndKeywords();
      console.log('[automation] X sources ingestion complete:', xIngestionResult);

      // Run RSS feed ingestion (no cooldown - free to fetch multiple times daily)
      const rssIngestionResult = await ingestFromRSSFeeds();
      console.log('[automation] RSS ingestion complete:', rssIngestionResult);

      // Combine results
      const totalInserted = (xIngestionResult.inserted || 0) + (rssIngestionResult.inserted || 0);
      results.ingestion = {
        x_sources: xIngestionResult,
        rss: rssIngestionResult,
        total_inserted: totalInserted,
      };

      // Log ingestion completion
      await logActivity({
        category: 'ingestion',
        severity: 'success',
        title: 'Content Ingestion Complete',
        description: `Ingested ${totalInserted} new items from all sources`,
        automation_run_id: automationRunId || undefined,
        metadata: results.ingestion,
      });
    } catch (error) {
      console.error('[automation] Ingestion failed:', error);
      results.ingestion = { error: 'Ingestion failed', details: String(error) };

      await logActivity({
        category: 'ingestion',
        severity: 'error',
        title: 'Content Ingestion Failed',
        description: `Error during ingestion: ${String(error)}`,
        automation_run_id: automationRunId || undefined,
      });
    }

    // 0.5. Schedule any unscheduled draft posts
    try {
      console.log('[automation] Scheduling unscheduled draft posts...');

      // Get automation config for posting times
      const config = await getAutomationConfig();
      if (!config) {
        console.log('[automation] No automation config found, skipping draft scheduling');
      } else {
        const postingTimes: string[] = config.posting_times || [
          '08:00', '10:00', '12:00', '14:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
        ];
        const timezone = config.timezone || 'Australia/Sydney';

        // Get unscheduled drafts
        const { data: drafts, error: draftsError } = await supabase
          .from('bulk_post_queue')
          .select('id, created_at, batch_id')
          .eq('status', 'draft')
          .is('scheduled_for', null)
          .order('created_at', { ascending: true });

        if (!draftsError && drafts && drafts.length > 0) {
          // Get today's date in the configured timezone
          const now = new Date();
          const today = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
          today.setHours(0, 0, 0, 0);

          // Group drafts by batch
          const batchMap = new Map<string | null, typeof drafts>();
          for (const draft of drafts) {
            const batchId = draft.batch_id || 'single';
            if (!batchMap.has(batchId)) {
              batchMap.set(batchId, []);
            }
            batchMap.get(batchId)!.push(draft);
          }

          // Schedule drafts across posting times
          const updates: any[] = [];
          for (const [batchId, batchDrafts] of batchMap.entries()) {
            for (let i = 0; i < batchDrafts.length; i++) {
              const timeIndex = i % postingTimes.length;
              const postingTime = postingTimes[timeIndex];
              const [hours, minutes] = postingTime.split(':').map(Number);

              const scheduledDate = new Date(today);
              scheduledDate.setHours(hours, minutes, 0, 0);

              // If time has passed today, schedule for tomorrow
              if (scheduledDate < now) {
                scheduledDate.setDate(scheduledDate.getDate() + 1);
              }

              updates.push({
                id: batchDrafts[i].id,
                scheduled_for: scheduledDate.toISOString(),
                status: 'pending'
              });
            }
          }

          // Update all drafts to pending
          if (updates.length > 0) {
            const { error: updateError } = await supabase
              .from('bulk_post_queue')
              .upsert(updates, { onConflict: 'id' });

            if (!updateError) {
              console.log(`[automation] Scheduled ${updates.length} draft posts`);
              await logActivity({
                category: 'system',
                severity: 'success',
                title: 'Draft Posts Scheduled',
                description: `Automatically scheduled ${updates.length} draft posts`,
                automation_run_id: automationRunId || undefined,
                metadata: { scheduled_count: updates.length, posting_times: postingTimes }
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('[automation] Error scheduling drafts:', error);
    }

    // 0.75. Generate tweets from analyzed candidates (from candidates table)
    try {
      console.log('[automation] Step 0.75: Generating tweets from analyzed candidates...');

      await logActivity({
        category: 'system',
        severity: 'info',
        title: 'Starting Tweet Generation',
        description: 'Checking for analyzed candidates to generate tweets from',
        automation_run_id: automationRunId || undefined,
      });

      // Get candidates that have been analyzed but not yet generated
      const { data: candidates, error: candidatesError } = await supabase
        .from('candidates')
        .select('id, text, analysis_score, source')
        .not('analysis_score', 'is', null)
        .is('generated_at', null)
        .order('analysis_score', { ascending: false })
        .limit(5); // Generate up to 5 per cycle

      console.log('[automation] Candidates query result:', {
        found: candidates?.length || 0,
        error: candidatesError?.message || 'none'
      });

      if (candidatesError) {
        await logActivity({
          category: 'system',
          severity: 'error',
          title: 'Failed to Query Candidates',
          description: `Error querying candidates: ${candidatesError.message}`,
          automation_run_id: automationRunId || undefined,
        });
      }

      if (!candidatesError && candidates && candidates.length > 0) {
        console.log(`[automation] Found ${candidates.length} candidates to generate`);

        const config = await getAutomationConfig();

        let generated = 0;
        for (const candidate of candidates) {
          try {
            console.log(`[automation] Generating tweet for candidate ${candidate.id}`);

            // Generate tweet
            const tweetText = await generatePost(
              candidate.text,
              undefined, // context
              config?.brand_voice_instructions
            );

            if (tweetText) {
              // Update candidate as generated
              const { error: updateError } = await supabase
                .from('candidates')
                .update({
                  generated_at: new Date().toISOString(),
                  generated_text: tweetText
                })
                .eq('id', candidate.id);

              if (!updateError) {
                // Add generated tweet to bulk_post_queue as draft
                const { error: queueError } = await supabase
                  .from('bulk_post_queue')
                  .insert({
                    text: tweetText,
                    status: 'draft',
                    metadata: {
                      candidate_id: candidate.id,
                      source: candidate.source,
                      analysis_score: candidate.analysis_score
                    }
                  });

                if (!queueError) {
                  generated++;
                  console.log(`[automation] Generated tweet for ${candidate.id} and added to queue`);
                } else {
                  console.error(`[automation] Failed to add to queue:`, queueError);
                }
              }
            }
          } catch (error) {
            console.error(`[automation] Error generating for candidate ${candidate.id}:`, error);
          }
        }

        if (generated > 0) {
          await logActivity({
            category: 'system',
            severity: 'success',
            title: 'Tweets Generated from Candidates',
            description: `Generated ${generated} tweets from analyzed candidates`,
            automation_run_id: automationRunId || undefined,
            metadata: { generated_count: generated }
          });
        }
      } else if (!candidatesError) {
        console.log('[automation] No candidates found that need generation');
        await logActivity({
          category: 'system',
          severity: 'info',
          title: 'No Candidates to Generate',
          description: 'No analyzed candidates found that need tweet generation',
          automation_run_id: automationRunId || undefined,
        });
      }
    } catch (error) {
      console.error('[automation] Error generating candidate tweets:', error);
      await logActivity({
        category: 'system',
        severity: 'error',
        title: 'Tweet Generation Error',
        description: `Error during tweet generation: ${String(error)}`,
        automation_run_id: automationRunId || undefined,
      });
    }

    // 1. Always process scheduled posts
    try {
      console.log('[automation] Processing scheduled posts...');
      await logActivity({
        category: 'posting',
        severity: 'info',
        title: 'Processing Scheduled Posts',
        description: 'Checking for and posting scheduled tweets',
        automation_run_id: automationRunId || undefined,
      });

      results.scheduled_posts = await processScheduledPosts();
      console.log('[automation] Scheduled posts result:', results.scheduled_posts);

      const postedCount = results.scheduled_posts?.succeeded || 0;
      const failedCount = results.scheduled_posts?.failed || 0;

      if (postedCount > 0 || failedCount > 0) {
        await logActivity({
          category: 'posting',
          severity: postedCount > 0 ? 'success' : 'warning',
          title: 'Scheduled Posts Processed',
          description: `Posted ${postedCount} tweets, ${failedCount} failed`,
          automation_run_id: automationRunId || undefined,
          metadata: results.scheduled_posts,
        });
      }
    } catch (error) {
      console.error('Error processing scheduled posts:', error);
      results.scheduled_posts = { error: 'Failed to process scheduled posts', details: String(error) };

      await logActivity({
        category: 'posting',
        severity: 'error',
        title: 'Scheduled Posts Processing Failed',
        description: `Error processing scheduled posts: ${String(error)}`,
        automation_run_id: automationRunId || undefined,
      });
    }

    // 2. Check if it's time to generate new posts (run at posting times)
    const now = new Date();

    // Fetch config to check posting times
    try {
      const config = await getAutomationConfig();
      console.log('[automation] Config:', {
        enabled: config?.enabled,
        posting_times: config?.posting_times,
        timezone: config?.timezone,
        has_config: !!config
      });

      if (config && config.enabled && config.posting_times) {
        // Convert current UTC time to the configured timezone
        const timeZone = config.timezone || 'Australia/Sydney';
        const localTime = now.toLocaleString('en-US', { timeZone, hour12: false, hour: '2-digit', minute: '2-digit' });
        const [currentHour, currentMinute] = localTime.split(':').map(Number);

        console.log(`[automation] Current time in ${timeZone}: ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`);
        console.log(`[automation] UTC time: ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`);

        // Check if current time matches any posting time (within 45 min window for testing)
        const shouldGenerate = config.posting_times.some((time: string) => {
          const [hours, minutes] = time.split(':').map(Number);
          const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (hours * 60 + minutes));
          const matches = timeDiff <= 45; // 45 minute window for testing
          console.log(`[automation] Checking time ${time}: diff=${timeDiff}min, matches=${matches}`);
          return matches;
        });

        console.log(`[automation] Should generate new post: ${shouldGenerate}`);

        if (shouldGenerate) {
          // Check rate limit: no more than 1 post per hour
          const lastPostTime = await getLastPostTime();
          const oneHourAgo = Date.now() - (60 * 60 * 1000);

          if (lastPostTime && lastPostTime > oneHourAgo) {
            const minutesSinceLastPost = Math.floor((Date.now() - lastPostTime) / (60 * 1000));
            const minutesUntilNextPost = 60 - minutesSinceLastPost;
            console.log(`[automation] Rate limit: Last post was ${minutesSinceLastPost} minutes ago, need to wait ${minutesUntilNextPost} more minutes`);
            results.new_post_generation = {
              skipped: 'Rate limit: Less than 1 hour since last post',
              last_post_minutes_ago: minutesSinceLastPost,
              wait_minutes: minutesUntilNextPost,
            };
          } else {
            // Import the handler from /api/cron/post dynamically
            const { GET: postHandler } = await import('../post/route');
            const response = await postHandler(request);
            results.new_post_generation = await response.json();
            console.log('[automation] New post generation result:', results.new_post_generation);
          }
        } else {
          results.new_post_generation = {
            skipped: 'Not a posting time',
            current_time: `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')} ${config.timezone}`,
            posting_times: config.posting_times
          };
        }
      } else {
        results.new_post_generation = {
          skipped: 'Automation disabled or no config',
          has_config: !!config,
          enabled: config?.enabled
        };
      }
    } catch (error) {
      console.error('Error generating new posts:', error);
      results.new_post_generation = { error: 'Failed to generate new posts', details: String(error) };
    }

    console.log('[automation] Unified cron job completed');

    // Complete automation logging
    if (automationRunId) {
      await completeAutomationRun(automationRunId, 'completed', {
        posts_created: results.scheduled_posts?.succeeded || 0,
        candidates_evaluated: 0,
        errors_count: results.scheduled_posts?.failed || 0,
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
      automation_run_id: automationRunId,
    });
  } catch (error: any) {
    console.error('Unified cron error:', error);

    // Log the failure
    if (automationRunId) {
      await completeAutomationRun(automationRunId, 'failed', {
        errors_count: 1,
      });
    }

    await logActivity({
      category: 'system',
      severity: 'error',
      title: 'Automation Cycle Failed',
      description: `Critical error in automation: ${String(error)}`,
      automation_run_id: automationRunId || undefined,
    });

    return NextResponse.json(
      { error: error.message || 'Cron job failed', details: String(error), automation_run_id: automationRunId },
      { status: 500 }
    );
  }
}

// Export both GET and POST handlers
export async function GET(request: NextRequest) {
  return runAutomation(request);
}

export async function POST(request: NextRequest) {
  return runAutomation(request);
}
