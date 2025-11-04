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
  uploaded_at: string;
}

interface MediaPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

const colors = {
  primary: '#1DA1F2',
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

export default function MediaPicker({ onSelect, onClose }: MediaPickerProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState('');

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const res = await fetch('/api/admin/media');
      const data = await res.json();
      setMedia(data.media || []);
    } catch (error) {
      console.error('Failed to fetch media:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMediaUrl = (filePath: string) => {
    const supabase = getSupabase();
    if (!supabase) return '';
    const { data } = supabase.storage.from('x-autoposter').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSelectMedia = (filePath: string) => {
    const url = getMediaUrl(filePath);
    onSelect(url);
    onClose();
  };

  const handleUseUrl = () => {
    if (urlInput.trim()) {
      onSelect(urlInput.trim());
      onClose();
    }
  };

  const overlay: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modal: React.CSSProperties = {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    maxWidth: 800,
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  };

  const button: React.CSSProperties = {
    padding: '8px 16px',
    backgroundColor: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>Select Media</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: colors.gray[500],
            }}
          >
            ×
          </button>
        </div>

        {/* URL Input Option */}
        <div style={{ marginBottom: 24, padding: 16, backgroundColor: colors.gray[50], borderRadius: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Or use an external URL:</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="https://example.com/image.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid ' + colors.gray[300],
                borderRadius: 6,
                fontSize: 14,
              }}
            />
            <button onClick={handleUseUrl} disabled={!urlInput.trim()} style={button}>
              Use URL
            </button>
          </div>
        </div>

        {/* Media Library */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: colors.gray[700] }}>
            From Media Library ({media.length}):
          </p>

          {loading ? (
            <p style={{ textAlign: 'center', color: colors.gray[500], padding: 40 }}>Loading...</p>
          ) : media.length === 0 ? (
            <p style={{ textAlign: 'center', color: colors.gray[500], padding: 40 }}>
              No media uploaded yet. Go to Media tab to upload images.
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 12,
              }}
            >
              {media.map((item) => {
                const url = getMediaUrl(item.file_path);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectMedia(item.file_path)}
                    style={{
                      border: '2px solid ' + colors.gray[200],
                      borderRadius: 8,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = colors.primary;
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = colors.gray[200];
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <div style={{ position: 'relative', paddingBottom: '100%', backgroundColor: colors.gray[100] }}>
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
                    <div style={{ padding: 8, backgroundColor: '#fff' }}>
                      <p
                        style={{
                          fontSize: 11,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={item.file_name}
                      >
                        {item.file_name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
