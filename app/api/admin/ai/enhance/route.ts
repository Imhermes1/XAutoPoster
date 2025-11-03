import { NextResponse } from 'next/server';
import { improveText } from '@/lib/content-generator';

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  // Clean up expired entries
  if (limit && now > limit.resetAt) {
    rateLimitMap.delete(ip);
  }

  // Check current rate limit (max 5 requests per minute)
  const current = rateLimitMap.get(ip);
  if (current && now < current.resetAt) {
    if (current.count >= 5) {
      return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
    }
    current.count++;
    return { allowed: true };
  }

  // Set new rate limit window (1 minute)
  rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
  return { allowed: true };
}

export async function POST(req: Request) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Please wait ${rateLimit.retryAfter} seconds before trying again.` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
      );
    }

    const body = await req.json();
    const text = (body?.text || '').toString();

    if (!text.trim()) {
      return NextResponse.json({ error: 'text required' }, { status: 400 });
    }

    if (text.length > 500) {
      return NextResponse.json({ error: 'Text too long (max 500 characters)' }, { status: 400 });
    }

    const improved = await improveText(text);
    return NextResponse.json({ text: improved });
  } catch (e: any) {
    console.error('AI enhance error:', e);

    // Return specific error messages
    const errorMessage = e?.message || String(e);
    const statusCode = e?.status === 429 ? 429 : 500;

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

