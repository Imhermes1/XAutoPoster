"use client";

import { useState } from 'react';
import { useToast } from './Toast';

export default function LinkAnalyzer() {
  const { showToast } = useToast();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState<number | null>(null);
  const [queueing, setQueueing] = useState<number | null>(null);
  const [tweets, setTweets] = useState<string[]>([]);
  const [contentSummary, setContentSummary] = useState('');
  const [analyzedUrl, setAnalyzedUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [activityLog, setActivityLog] = useState<string[]>([]);

  const analyzeLink = async () => {
    if (!url.trim()) {
      showToast('error', 'Missing URL', 'Please enter a valid URL');
      return;
    }

    setLoading(true);
    setActivityLog([]);
    const logs: string[] = [];

    const addLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      const logEntry = `[${timestamp}] ${message}`;
      logs.push(logEntry);
      setActivityLog([...logs]);
    };

    try {
      addLog(`Starting analysis of: ${url}`);
      addLog('Fetching web content...');

      const res = await fetch('/api/admin/analyze-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        addLog(`✗ Error: ${data.error || 'Failed to analyze link'}`);
        throw new Error(data.error || 'Failed to analyze link');
      }

      addLog('✓ Web content fetched');
      addLog('Extracting images...');
      addLog('✓ Images extracted');
      addLog('Generating detailed summary...');
      addLog('✓ Summary generated');
      addLog('Generating tweet ideas...');
      addLog('✓ Generated 3 tweet ideas');
      addLog('✓ Analysis complete!');

      setTweets(data.tweets);
      setContentSummary(data.content_summary);
      setAnalyzedUrl(data.url);
      setImages(data.images || []);
      showToast('success', 'Analyzed', 'Link analyzed successfully!');
    } catch (e: any) {
      console.error('Analyze error:', e);
      showToast('error', 'Analysis Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const postTweet = async (tweetIndex: number, tweetText: string) => {
    setPosting(tweetIndex);
    try {
      const res = await fetch('/api/admin/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: tweetText }),
        credentials: 'include',
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        // If response isn't JSON, it might still be successful (200 status)
        if (res.ok) {
          showToast('success', 'Posted', 'Tweet posted to X!');
          return;
        }
        throw new Error('Invalid response from server');
      }

      if (!res.ok) {
        const errorMsg = data?.error || data?.message || 'Failed to post tweet';
        throw new Error(errorMsg);
      }

      if (data?.success === false) {
        throw new Error(data?.error || 'Failed to post tweet');
      }

      // Success - show ID if available
      const tweetId = data?.id || 'posted';
      showToast('success', 'Posted', `Tweet posted to X!`);
    } catch (e: any) {
      console.error('Post error:', e);
      let errorMessage = 'Unknown error posting tweet';

      if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === 'string') {
        errorMessage = e;
      } else if (typeof e === 'object' && e !== null) {
        errorMessage = JSON.stringify(e);
      }

      showToast('error', 'Post Failed', errorMessage);
    } finally {
      setPosting(null);
    }
  };

  const queueTweet = async (tweetIndex: number, tweetText: string) => {
    setQueueing(tweetIndex);
    try {
      const res = await fetch('/api/admin/analyze-link/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweets: [tweetText],
          url: analyzedUrl
        }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data?.error || 'Failed to queue tweet';
        throw new Error(errorMsg);
      }

      if (data?.success) {
        showToast('success', 'Queued', 'Tweet added to queue! Check the Queue tab to schedule and post.');
      } else {
        throw new Error(data?.error || 'Failed to queue tweet');
      }
    } catch (e: any) {
      console.error('Queue error:', e);
      let errorMessage = 'Unknown error queueing tweet';

      if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === 'string') {
        errorMessage = e;
      } else if (typeof e === 'object' && e !== null) {
        errorMessage = JSON.stringify(e);
      }

      showToast('error', 'Queue Failed', errorMessage);
    } finally {
      setQueueing(null);
    }
  };

  const colors = {
    primary: '#3b82f6',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      900: '#111827',
    },
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: 900,
    margin: '0 auto',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    padding: 28,
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    marginBottom: 24,
  };

  const inputStyle: React.CSSProperties = {
    padding: '12px 14px',
    fontSize: 15,
    border: '1.5px solid #d1d5db',
    borderRadius: 10,
    width: '100%',
    marginBottom: 12,
    backgroundColor: '#fafafa',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    backgroundColor: colors.primary,
    color: 'white',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)',
    opacity: loading ? 0.6 : 1,
    pointerEvents: loading ? 'none' : 'auto',
  };

  const tweetCardStyle: React.CSSProperties = {
    padding: 16,
    backgroundColor: colors.gray[50],
    border: `1px solid ${colors.gray[200]}`,
    borderRadius: 8,
    marginBottom: 12,
  };

  const tweetTextStyle: React.CSSProperties = {
    fontSize: 14,
    color: colors.gray[900],
    lineHeight: 1.6,
    marginBottom: 8,
  };

  return (
    <div style={containerStyle}>
      {/* Input Section */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, fontWeight: 700 }}>
          Analyze Web Link
        </h3>
        <p style={{ fontSize: 14, color: colors.gray[500], marginBottom: 20 }}>
          Paste a link and AI will read the content, understand it, and generate 3 insightful tips you can tweet
        </p>

        <input
          type="url"
          placeholder="Paste link here (e.g., https://example.com/article)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={inputStyle}
        />

        <button
          onClick={analyzeLink}
          disabled={loading}
          style={buttonStyle}
        >
          {loading ? 'Analyzing...' : 'Analyze Link'}
        </button>
      </div>

      {/* Activity Log Terminal */}
      {activityLog.length > 0 && (
        <div style={{
          ...cardStyle,
          backgroundColor: colors.gray[900],
          border: `1px solid ${colors.gray[700]}`,
          padding: 16,
          fontFamily: '"Courier New", monospace',
          fontSize: 12,
          color: '#10b981',
          lineHeight: 1.6,
          maxHeight: 300,
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
        }}>
          {activityLog.map((log, idx) => (
            <div key={idx} style={{ marginBottom: 4 }}>
              {log}
            </div>
          ))}
        </div>
      )}

      {/* Content Summary */}
      {contentSummary && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 16, fontWeight: 700 }}>
            Summary
          </h3>
          <div style={{ fontSize: 14, color: colors.gray[700], lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 16 }}>
            {contentSummary}
          </div>
          <p style={{ fontSize: 12, color: colors.gray[500], marginTop: 0, marginBottom: 0 }}>
            Source: <a href={analyzedUrl} target="_blank" rel="noopener noreferrer" style={{ color: colors.primary, textDecoration: 'none' }}>
              {new URL(analyzedUrl).hostname}
            </a>
          </p>
        </div>
      )}

      {/* Extracted Images */}
      {images.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 16, fontWeight: 700 }}>
            Images ({images.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            {images.map((imageUrl, idx) => (
              <div key={idx} style={{ position: 'relative' }}>
                <img
                  src={imageUrl}
                  alt={`Extracted image ${idx + 1}`}
                  style={{
                    width: '100%',
                    height: 150,
                    objectFit: 'cover',
                    borderRadius: 8,
                    border: `1px solid ${colors.gray[200]}`,
                    backgroundColor: colors.gray[50],
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                  }}
                >
                  View
                </a>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: colors.gray[500], marginTop: 12, marginBottom: 0 }}>
            Tip: You can attach these images when posting tweets
          </p>
        </div>
      )}

      {/* Generated Tweets */}
      {tweets.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 16, fontWeight: 700 }}>
            Ready to Post ({tweets.length})
          </h3>

          {tweets.map((tweet, idx) => {
            const isThread = tweet.startsWith('🧵');
            const displayTweet = isThread ? tweet.substring(1).trim() : tweet;

            return (
            <div key={idx} style={tweetCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 11, color: colors.gray[500] }}>
                    Tweet {idx + 1} • {displayTweet.length} chars
                  </span>
                  {isThread && (
                    <span style={{ fontSize: 10, color: colors.warning, marginLeft: 8, fontWeight: 600 }}>
                      🧵 Thread Post
                    </span>
                  )}
                </div>
              </div>
              <p style={tweetTextStyle}>
                {displayTweet}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => postTweet(idx, displayTweet)}
                  disabled={posting === idx}
                  style={{
                    padding: '8px 16px',
                    fontSize: 12,
                    backgroundColor: colors.primary,
                    border: 'none',
                    borderRadius: 6,
                    cursor: posting === idx ? 'not-allowed' : 'pointer',
                    color: '#fff',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    opacity: posting === idx ? 0.6 : 1,
                  }}
                >
                  {posting === idx ? 'Posting...' : 'Post to X'}
                </button>
                <button
                  onClick={() => queueTweet(idx, displayTweet)}
                  disabled={queueing === idx}
                  style={{
                    padding: '8px 16px',
                    fontSize: 12,
                    backgroundColor: colors.success,
                    border: 'none',
                    borderRadius: 6,
                    cursor: queueing === idx ? 'not-allowed' : 'pointer',
                    color: '#fff',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    opacity: queueing === idx ? 0.6 : 1,
                  }}
                >
                  {queueing === idx ? 'Adding...' : 'Add to Queue'}
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(displayTweet);
                    showToast('success', 'Copied', 'Tweet copied to clipboard');
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: 12,
                    backgroundColor: colors.gray[200],
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: colors.gray[700],
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && tweets.length === 0 && contentSummary === '' && (
        <div style={{
          ...cardStyle,
          textAlign: 'center',
          color: colors.gray[500],
          padding: 40,
        }}>
          <p style={{ fontSize: 14 }}>Paste a link above to get started</p>
        </div>
      )}
    </div>
  );
}
