import { NextResponse } from 'next/server';
import { DAILY_POST_LIMIT } from '@/lib/constants';
import { fetchRecentNews } from '@/lib/rss-fetcher';
import { generatePost } from '@/lib/content-generator';
import { postToX, postToXAdvanced, uploadMediaFromUrl } from '@/lib/x-api';
import { getPostCount, getUnusedManualTopics, markTopicAsUsed, savePostHistory } from '@/lib/kv-storage';
import { createClient } from '@supabase/supabase-js';
import {
  startAutomationRun,
  completeAutomationRun,
  addDecisionToRun,
  logActivity,
  logPostGeneration,
  markGenerationUsed,
} from '@/lib/automation-logger';
import { analyzeContent, getAnalysisContext } from '@/lib/content-analyzer';
import { fetchAndClaimCandidate } from '@/lib/candidates';

export const dynamic = 'force-dynamic';

async function getAutomationConfig() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return null;
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

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

export async function GET(req: Request) {
  return handlePost(req);
}

export async function POST(req: Request) {
  return handlePost(req);
}

async function handlePost(req: Request) {
  const runId = await startAutomationRun('cron');
  let candidatesEvaluated = 0;
  let postsCreated = 0;
  let errorsCount = 0;

  try {
    // Auth check - fail closed for security
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      console.error('[cron-post] CRON_SECRET not configured');
      return NextResponse.json(
        { success: false, error: 'CRON_SECRET not configured on server' },
        { status: 500 }
      );
    }

    const auth = req.headers.get('authorization') || '';
    const expected = `Bearer ${secret}`;
    if (auth !== expected) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    // Check if automation is enabled
    const config = await getAutomationConfig();
    if (config && !config.enabled) {
      await addDecisionToRun(runId!, {
        timestamp: new Date().toISOString(),
        decision: 'skip',
        reasoning: 'Automation is disabled in config',
      });
      await completeAutomationRun(runId!, 'skipped');
      return NextResponse.json({ skipped: true, reason: 'automation disabled' });
    }

    await addDecisionToRun(runId!, {
      timestamp: new Date().toISOString(),
      decision: 'proceed',
      reasoning: 'Automation is enabled, checking daily limit',
    });

    // Check daily limit
    const dailyLimit = config?.daily_limit || DAILY_POST_LIMIT;
    const count = await getPostCount(1);
    if (count >= dailyLimit) {
      await addDecisionToRun(runId!, {
        timestamp: new Date().toISOString(),
        decision: 'skip',
        reasoning: `Daily limit reached: ${count}/${dailyLimit} posts today`,
      });
      await completeAutomationRun(runId!, 'skipped');
      return NextResponse.json({ skipped: true, reason: 'daily limit reached', count });
    }

    await addDecisionToRun(runId!, {
      timestamp: new Date().toISOString(),
      decision: 'proceed',
      reasoning: `Daily limit OK: ${count}/${dailyLimit} posts today`,
    });

    // Get analysis context
    const analysisContext = await getAnalysisContext();

    // Atomically fetch and claim the next best candidate (prevents race conditions)
    // This ensures only one process will use this candidate
    const bestCandidate = await fetchAndClaimCandidate(20);

    if (bestCandidate && bestCandidate.id) {
      candidatesEvaluated++;

      await logActivity({
        category: 'system',
        severity: 'info',
        title: 'Candidate Claimed',
        description: `Claimed candidate with score ${bestCandidate.overall_score || 'not analyzed'}`,
        automation_run_id: runId!,
      });

      // Analyze if not already analyzed
      let bestScore = bestCandidate.overall_score || 0;
      let analysis;

      if (bestCandidate.overall_score && bestCandidate.overall_score > 0) {
        analysis = {
          scores: { overall_score: bestCandidate.overall_score },
          decision: bestCandidate.overall_score > 0.7 ? 'approved' : 'rejected',
          reasoning: 'Previously analyzed',
          strengths: [],
          concerns: [],
        };
      } else {
        // Analyze content if not previously analyzed
        analysis = await analyzeContent(
          {
            id: bestCandidate.id,
            type: bestCandidate.type,
            title: bestCandidate.title ?? undefined,
            text: bestCandidate.text ?? undefined,
            url: bestCandidate.url ?? undefined,
            source: bestCandidate.source,
            likes_count: bestCandidate.likes_count,
            retweets_count: bestCandidate.retweets_count,
            replies_count: bestCandidate.replies_count,
          },
          analysisContext,
          runId!
        );
        bestScore = analysis.scores.overall_score || 0;
      }

      if (analysis.decision !== 'approved') {
        // Candidate was already marked as used by fetchAndClaimCandidate()
        // Just log the rejection
        await logActivity({
          category: 'analysis',
          severity: 'info',
          title: 'Candidate Rejected',
          description: `Rejected with score ${bestScore.toFixed(2)}: ${analysis.reasoning || 'Did not meet approval threshold'}`,
          automation_run_id: runId!,
        });

        await completeAutomationRun(runId!, 'skipped', {
          candidates_evaluated: candidatesEvaluated,
          posts_created: 0,
          errors_count: 0,
        });

        return NextResponse.json({ skipped: true, reason: 'candidate_rejected', score: bestScore });
      } else {
        await addDecisionToRun(runId!, {
          timestamp: new Date().toISOString(),
          decision: 'use_candidate',
          reasoning: `Selected candidate with score ${bestScore.toFixed(2)}: ${bestCandidate.title || bestCandidate.text?.substring(0, 50)}`,
          metadata: { candidateId: bestCandidate.id, score: bestScore },
        });

        // Generate post from candidate
        const topicText = bestCandidate.type === 'rss'
          ? `${bestCandidate.title || ''} ${bestCandidate.url || ''}`
          : bestCandidate.text || '';

        const startGen = Date.now();
        const post = await generatePost(topicText);
        const genDuration = Date.now() - startGen;

        const generationId = await logPostGeneration({
          topic: topicText,
          generated_text: post,
          duration_ms: genDuration,
          source_type: 'candidate',
          source_id: bestCandidate.id,
        });

        // Post it (with image if available)
        let result: { success: boolean; id?: string; error?: string };
        if (bestCandidate.image_url) {
          const mediaUpload = await uploadMediaFromUrl(bestCandidate.image_url);
          if (mediaUpload.success && mediaUpload.media_id) {
            result = await postToXAdvanced({ text: post, media_ids: [mediaUpload.media_id] });
          } else {
            // Fall back to posting without image if upload fails
            result = await postToX(post);
          }
        } else {
          result = await postToX(post);
        }

        if (!result.success) {
          errorsCount++;
          throw new Error(result.error || 'Post failed');
        }

        postsCreated++;
        // Note: Candidate is already marked as used by fetchAndClaimCandidate()
        await savePostHistory({ text: post, postedAt: Date.now(), topicId: undefined });
        if (generationId) await markGenerationUsed(generationId, result.id!);

        await logActivity({
          category: 'posting',
          severity: 'success',
          title: 'Post Created from Candidate',
          description: `Posted with score ${bestScore.toFixed(2)}`,
          automation_run_id: runId!,
        });

        await completeAutomationRun(runId!, 'completed', {
          candidates_evaluated: candidatesEvaluated,
          posts_created: postsCreated,
          errors_count: errorsCount,
        });

        return NextResponse.json({ success: true, id: result.id, text: post, score: bestScore });
      }
    } else {
      // No best candidate available (all were claimed by other processes or none exist)
      await logActivity({
        category: 'system',
        severity: 'info',
        title: 'No Candidates Available',
        description: 'No approved candidates available to post',
        automation_run_id: runId!,
      });
    }

    // Fallback to manual topics or RSS
    await addDecisionToRun(runId!, {
      timestamp: new Date().toISOString(),
      decision: 'fallback',
      reasoning: 'No approved candidates, trying manual topics or RSS',
    });

    let topicText: string | null = null;
    let manualId: string | undefined;
    let mediaUrl: string | undefined;

    const manual = await getUnusedManualTopics();
    if (manual.length > 0) {
      const t = manual[Math.floor(Math.random() * manual.length)];
      topicText = t.topic;
      manualId = t.id;
      await addDecisionToRun(runId!, {
        timestamp: new Date().toISOString(),
        decision: 'use_manual_topic',
        reasoning: `Using manual topic: ${topicText}`,
      });
    } else {
      const news = await fetchRecentNews();
      if (news.length > 0) {
        const item = news[Math.floor(Math.random() * news.length)];
        topicText = `${item.title} — ${item.source} ${item.link}`.trim();
        mediaUrl = item.imageUrl || undefined;
        await addDecisionToRun(runId!, {
          timestamp: new Date().toISOString(),
          decision: 'use_rss',
          reasoning: `Using RSS: ${item.title}`,
          metadata: mediaUrl ? { imageUrl: mediaUrl } : undefined,
        });
      } else {
        topicText = 'Latest trends in AI, app dev, iOS, Android, and coding';
        await addDecisionToRun(runId!, {
          timestamp: new Date().toISOString(),
          decision: 'use_default',
          reasoning: 'No manual topics or RSS, using default',
        });
      }
    }

    const startGen = Date.now();
    const post = await generatePost(topicText!);
    const genDuration = Date.now() - startGen;

    const generationId = await logPostGeneration({
      topic: topicText!,
      generated_text: post,
      duration_ms: genDuration,
      source_type: manualId ? 'manual_topic' : 'rss',
    });

    let result: { success: boolean; id?: string; error?: string };
    if (mediaUrl) {
      const mediaUpload = await uploadMediaFromUrl(mediaUrl);
      if (mediaUpload.success && mediaUpload.media_id) {
        result = await postToXAdvanced({ text: post, media_ids: [mediaUpload.media_id] });
      } else {
        result = await postToX(post);
      }
    } else {
      result = await postToX(post);
    }

    if (!result.success) {
      errorsCount++;
      throw new Error(result.error || 'Post failed');
    }

    postsCreated++;
    await savePostHistory({ text: post, postedAt: Date.now(), topicId: manualId });
    if (manualId) await markTopicAsUsed(manualId);
    if (generationId) await markGenerationUsed(generationId, result.id!);

    await completeAutomationRun(runId!, 'completed', {
      candidates_evaluated: candidatesEvaluated,
      posts_created: postsCreated,
      errors_count: errorsCount,
    });

    return NextResponse.json({ success: true, id: result.id, text: post });
  } catch (e: any) {
    errorsCount++;
    await addDecisionToRun(runId!, {
      timestamp: new Date().toISOString(),
      decision: 'error',
      reasoning: `Error occurred: ${e.message}`,
    });
    await completeAutomationRun(runId!, 'failed', {
      candidates_evaluated: candidatesEvaluated,
      posts_created: postsCreated,
      errors_count: errorsCount,
    });
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
