import { NextRequest, NextResponse } from 'next/server';
import { checkPostSpacing, checkContentVariety, scoreFeedContent } from '@/lib/smart-autopilot';
import { isAdminAuthorized } from '@/lib/auth';

/**
 * POST /api/admin/autopilot/validate-post
 * Validate a post before publishing - checks spacing, variety, quality
 */
export async function POST(request: NextRequest) {
  try {
    const cookies = request.headers.get('cookie');
    if (!isAdminAuthorized(cookies)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, title, description, type = 'manual' } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Post text required' },
        { status: 400 }
      );
    }

    // Run all validation checks in parallel
    const [spacingCheck, varietyCheck, qualityScore] = await Promise.all([
      checkPostSpacing(1),
      checkContentVariety(10),
      type === 'rss' && description
        ? scoreFeedContent({
            title: title || text.substring(0, 50),
            description,
          })
        : Promise.resolve(null),
    ]);

    // Determine if post should proceed
    const canPost = spacingCheck.canPost && varietyCheck.isVaried;
    const quality = qualityScore?.quality || 'good';
    const qualityScore_num = qualityScore?.score || 75;

    const warnings: string[] = [];
    const errors: string[] = [];

    if (!spacingCheck.canPost) {
      errors.push(spacingCheck.reason || 'Not enough time since last post');
    }

    if (!varietyCheck.isVaried && varietyCheck.warnings.length > 0) {
      warnings.push(...varietyCheck.warnings);
    }

    if (qualityScore && qualityScore.score < 40) {
      errors.push('Content quality too low for auto-posting');
    } else if (qualityScore && qualityScore.score < 60) {
      warnings.push('Content quality below recommended threshold');
    }

    return NextResponse.json({
      valid: canPost && errors.length === 0,
      canPost,
      quality,
      qualityScore: qualityScore_num,
      warnings,
      errors,
      details: {
        spacing: spacingCheck,
        variety: varietyCheck,
        qualityReasons: qualityScore?.reasoning || [],
      },
    });
  } catch (error) {
    console.error('Error validating post:', error);
    return NextResponse.json(
      { error: 'Failed to validate post' },
      { status: 500 }
    );
  }
}
