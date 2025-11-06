import { NextResponse } from 'next/server';
import { addSource, listSources } from '@/lib/sources';
import { handleApiError, validationError, safeJsonParse } from '@/lib/error-handler';

export async function GET() {
  try {
    const sources = await listSources();
    return NextResponse.json({
      success: true,
      data: sources,
      count: sources.length,
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/sources');
  }
}

export async function POST(req: Request) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch (parseError) {
      return validationError('body', 'invalid JSON format');
    }

    const url = (body?.url || '').toString().trim();
    const category = (body?.category || '').toString().trim() || undefined;

    // Validate URL
    if (!url) {
      return validationError('url', 'url is required');
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return validationError('url', 'invalid URL format', { provided: url });
    }

    const src = await addSource(url, category);
    return NextResponse.json({
      success: true,
      data: src,
      message: 'Source added successfully',
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/sources');
  }
}

