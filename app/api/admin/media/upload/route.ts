import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `media/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('x-autoposter')
      .upload(filePath, buffer, {
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    // Record in database
    const { data, error: dbError } = await supabase
      .from('media_library')
      .insert([
        {
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          uploaded_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, media: data });
  } catch (error) {
    console.error('Failed to upload media:', error);
    return NextResponse.json({ error: 'Failed to upload media' }, { status: 500 });
  }
}
