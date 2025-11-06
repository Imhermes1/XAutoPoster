import { NextResponse } from 'next/server';
import { listCandidates } from '@/lib/candidates';
import { handleApiError, validationError } from '@/lib/error-handler';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') as any;
    const limitParam = url.searchParams.get('limit');

    // Validate limit parameter
    const limit = Number(limitParam || 20);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return validationError('limit', 'must be a number between 1 and 100', { provided: limitParam });
    }

    // Validate type parameter if provided
    if (type && !['tweet', 'rss'].includes(type)) {
      return validationError('type', 'must be "tweet" or "rss"', { provided: type });
    }

    const items = await listCandidates(limit, type);
    return NextResponse.json({
      success: true,
      data: items,
      count: items.length,
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/candidates');
  }
}

