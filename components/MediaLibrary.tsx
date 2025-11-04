'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

interface MediaItem {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  description?: string;
  uploaded_at: string;
}

interface MediaLibraryProps {
  showToast: (type: 'success' | 'error', title: string, message: string) => void;
}

const colors = {
  primary: '#1DA1F2',
  success: '#10B981',
  error: '#EF4444',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
};

export default function MediaLibrary({ showToast }: MediaLibraryProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const res = await fetch('/api/admin/media');
      const data = await res.json();
      setMedia(data.media || []);
    } catch (error) {
      showToast('error', 'Fetch Failed', 'Failed to load media library');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Invalid File', 'Only image files are supported');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('error', 'Unsupported Format', 'Supported formats: JPEG, PNG, GIF, WebP');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast('error', 'File Too Large', 'Maximum file size is 5MB');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Upload failed');
      }

      showToast('success', 'Upload Successful', `${selectedFile.name} uploaded successfully`);

      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);

      // Refresh media list
      await fetchMedia();
    } catch (error: any) {
      showToast('error', 'Upload Failed', error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm(`Delete ${fileName}?`)) return;

    try {
      const res = await fetch(`/api/admin/media/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Delete failed');

      showToast('success', 'Deleted', `${fileName} deleted successfully`);
      await fetchMedia();
    } catch (error) {
      showToast('error', 'Delete Failed', 'Failed to delete media');
    }
  };

  const getMediaUrl = (filePath: string) => {
    const supabase = getSupabase();
    if (!supabase) return '';
    const { data } = supabase.storage
      .from('x-autoposter')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('success', 'Copied', 'URL copied to clipboard');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const section: React.CSSProperties = {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    marginBottom: 20,
  };

  const uploadBox: React.CSSProperties = {
    border: '2px dashed ' + colors.gray[300],
    borderRadius: 8,
    padding: 32,
    textAlign: 'center',
    backgroundColor: colors.gray[50],
  };

  const button: React.CSSProperties = {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  };

  const deleteButton: React.CSSProperties = {
    ...button,
    backgroundColor: colors.error,
    padding: '6px 12px',
    fontSize: 12,
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Upload Section */}
      <div style={section}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>📤 Upload Media</h3>

        <div style={uploadBox}>
          {!previewUrl ? (
            <>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🖼️</div>
              <p style={{ fontSize: 14, color: colors.gray[600], marginBottom: 16 }}>
                Upload images to use in your posts
              </p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <div style={{ ...button, display: 'inline-block' }}>
                  Choose Image
                </div>
              </label>
              <p style={{ fontSize: 12, color: colors.gray[500], marginTop: 12 }}>
                JPEG, PNG, GIF, WebP • Max 5MB
              </p>
            </>
          ) : (
            <div>
              <img
                src={previewUrl}
                alt="Preview"
                style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, marginBottom: 16 }}
              />
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                {selectedFile?.name} ({formatFileSize(selectedFile?.size || 0)})
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  style={{ ...button, opacity: uploading ? 0.5 : 1 }}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  style={{ ...button, backgroundColor: colors.gray[500] }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Media Gallery */}
      <div style={section}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          🖼️ Media Library ({media.length})
        </h3>

        {loading ? (
          <p style={{ textAlign: 'center', color: colors.gray[500], padding: 40 }}>
            Loading media...
          </p>
        ) : media.length === 0 ? (
          <p style={{ textAlign: 'center', color: colors.gray[500], padding: 40 }}>
            No media uploaded yet. Upload your first image above!
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 16,
            }}
          >
            {media.map((item) => {
              const url = getMediaUrl(item.file_path);
              return (
                <div
                  key={item.id}
                  style={{
                    border: '1px solid ' + colors.gray[200],
                    borderRadius: 8,
                    overflow: 'hidden',
                    backgroundColor: '#fff',
                  }}
                >
                  <div style={{ position: 'relative', paddingBottom: '75%', backgroundColor: colors.gray[100] }}>
                    <img
                      src={url}
                      alt={item.file_name}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </div>
                  <div style={{ padding: 12 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={item.file_name}
                    >
                      {item.file_name}
                    </p>
                    <p style={{ fontSize: 11, color: colors.gray[500], marginBottom: 8 }}>
                      {formatFileSize(item.file_size)} • {new Date(item.uploaded_at).toLocaleDateString()}
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => copyToClipboard(url)}
                        style={{
                          ...button,
                          flex: 1,
                          padding: '6px 12px',
                          fontSize: 12,
                          backgroundColor: colors.success,
                        }}
                      >
                        Copy URL
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.file_name)}
                        style={deleteButton}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
