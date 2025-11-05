"use client";

import { useState } from 'react';

interface BreakingNewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface GeneratedTweet {
  id: string;
  text: string;
  imageUrl?: string;
  order: number;
}

type Step = 'input' | 'generating' | 'review';

export default function BreakingNewsModal({ isOpen, onClose, onSuccess }: BreakingNewsModalProps) {
  const [step, setStep] = useState<Step>('input');
  const [url, setUrl] = useState('');
  const [tweetCount, setTweetCount] = useState(3);
  const [hashtag, setHashtag] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [manualImage, setManualImage] = useState('');
  const [generatedTweets, setGeneratedTweets] = useState<GeneratedTweet[]>([]);
  const [error, setError] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setError('');
    setStep('generating');

    try {
      const response = await fetch('/api/admin/breaking-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          count: tweetCount,
          hashtag: hashtag.trim() || undefined,
          imageUrl: (manualImage.trim() || imageUrl.trim()) || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate tweets');
      }

      setGeneratedTweets(data.tweets || []);
      setStep('review');
    } catch (err) {
      setError(String(err));
      setStep('input');
    }
  };

  const handleGoLive = async () => {
    if (generatedTweets.length === 0) {
      setError('No tweets to publish');
      return;
    }

    setError('');
    setIsPublishing(true);

    try {
      const response = await fetch('/api/admin/breaking-news/go-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweets: generatedTweets,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish tweets');
      }

      // Success!
      if (onSuccess) onSuccess();
      handleClose();
    } catch (err) {
      setError(String(err));
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    setStep('input');
    setUrl('');
    setTweetCount(3);
    setHashtag('');
    setImageUrl('');
    setManualImage('');
    setGeneratedTweets([]);
    setError('');
    setIsPublishing(false);
    onClose();
  };

  const deleteTweet = (id: string) => {
    setGeneratedTweets(prev => prev.filter(t => t.id !== id));
  };

  const updateTweetText = (id: string, newText: string) => {
    setGeneratedTweets(prev =>
      prev.map(t => (t.id === id ? { ...t, text: newText } : t))
    );
  };

  const colors = {
    danger: '#ef4444',
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 20,
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: 12,
    maxWidth: 800,
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  };

  const headerStyle: React.CSSProperties = {
    padding: '24px 32px',
    borderBottom: `1px solid ${colors.gray[200]}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const bodyStyle: React.CSSProperties = {
    padding: 32,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    fontSize: 14,
    border: `1px solid ${colors.gray[300]}`,
    borderRadius: 8,
    fontFamily: 'inherit',
    marginBottom: 16,
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 8,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: colors.danger,
    color: 'white',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: colors.gray[200],
    color: colors.gray[700],
  };

  return (
    <div style={overlayStyle} onClick={handleClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: colors.gray[900] }}>
            🚨 Breaking News
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: colors.gray[500],
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          {/* Step 1: Input */}
          {step === 'input' && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: colors.gray[700] }}>
                  URL (Web link or Twitter post) *
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: colors.gray[700] }}>
                  Number of Tweets (3-5) *
                </label>
                <input
                  type="number"
                  min={3}
                  max={5}
                  value={tweetCount}
                  onChange={(e) => setTweetCount(Math.min(5, Math.max(3, parseInt(e.target.value) || 3)))}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: colors.gray[700] }}>
                  Hashtag (optional)
                </label>
                <input
                  type="text"
                  value={hashtag}
                  onChange={(e) => setHashtag(e.target.value)}
                  placeholder="#BreakingNews"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: colors.gray[700] }}>
                  Image URL (optional - will auto-extract if not provided)
                </label>
                <input
                  type="text"
                  value={manualImage}
                  onChange={(e) => setManualImage(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  style={inputStyle}
                />
              </div>

              {error && (
                <div style={{
                  padding: 12,
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${colors.danger}`,
                  borderRadius: 8,
                  color: colors.danger,
                  fontSize: 14,
                  marginBottom: 24,
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button onClick={handleClose} style={secondaryButtonStyle}>
                  Cancel
                </button>
                <button onClick={handleGenerate} style={primaryButtonStyle}>
                  🔥 GO BREAKING
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Generating */}
          {step === 'generating' && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: colors.gray[900], marginBottom: 8 }}>
                Generating Breaking News Tweets...
              </div>
              <div style={{ fontSize: 14, color: colors.gray[500] }}>
                Using Claude Haiku 4.5 to create exciting, engagement-focused content
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.gray[900], marginBottom: 16 }}>
                  Review Generated Tweets ({generatedTweets.length})
                </h3>
                <div style={{ fontSize: 13, color: colors.gray[600], marginBottom: 16 }}>
                  First tweet posts immediately, remaining tweets post every 15 minutes
                </div>

                {generatedTweets.map((tweet, index) => (
                  <div
                    key={tweet.id}
                    style={{
                      border: `1px solid ${colors.gray[200]}`,
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: 12,
                      backgroundColor: colors.gray[50],
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: colors.gray[500] }}>
                        Tweet #{index + 1} {index === 0 ? '(Posts immediately)' : `(+${index * 15} min)`}
                      </span>
                      <button
                        onClick={() => deleteTweet(tweet.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: colors.danger,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                    <textarea
                      value={tweet.text}
                      onChange={(e) => updateTweetText(tweet.id, e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: 80,
                        padding: 12,
                        fontSize: 14,
                        border: `1px solid ${colors.gray[300]}`,
                        borderRadius: 6,
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                    {tweet.imageUrl && (
                      <div style={{ marginTop: 12 }}>
                        <img
                          src={tweet.imageUrl}
                          alt="Tweet image"
                          style={{
                            maxWidth: '100%',
                            maxHeight: 200,
                            borderRadius: 6,
                            objectFit: 'cover',
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {error && (
                <div style={{
                  padding: 12,
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${colors.danger}`,
                  borderRadius: 8,
                  color: colors.danger,
                  fontSize: 14,
                  marginBottom: 24,
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button onClick={() => setStep('input')} style={secondaryButtonStyle} disabled={isPublishing}>
                  Back
                </button>
                <button
                  onClick={handleGoLive}
                  disabled={isPublishing || generatedTweets.length === 0}
                  style={{
                    ...primaryButtonStyle,
                    opacity: isPublishing || generatedTweets.length === 0 ? 0.5 : 1,
                    cursor: isPublishing || generatedTweets.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isPublishing ? 'Publishing...' : '🚀 GO LIVE'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
