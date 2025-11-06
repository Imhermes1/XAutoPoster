import { NextResponse } from 'next/server';
import { processScheduledPosts } from '@/lib/scheduled-posts-processor';

export async function GET() {
  try {
    const result = await processScheduledPosts();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Scheduled post processor failed:', error);
    return NextResponse.json(
      { error: 'Failed to process scheduled posts', success: false },
      { status: 500 }
    );
  }
}
