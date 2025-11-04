"use client";

import { useEffect, useState } from 'react';
import { useToast } from './Toast';
import MediaPicker from './MediaPicker';

export default function ManualControls({ onRefresh }: { onRefresh: () => void }) {
  const { showToast } = useToast();
  const [compose, setCompose] = useState('');
  const [posting, setPosting] = useState(false);
  const [aiImproving, setAiImproving] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [tweetToQuote, setTweetToQuote] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [ingesting, setIngesting] = useState(false);

  // Batch generator state
  const [batchTopic, setBatchTopic] = useState('');
  const [batchCount, setBatchCount] = useState(3);
  const [schedulingMode, setSchedulingMode] = useState<'auto' | 'custom'>('auto');
  const [timeRangeHours, setTimeRangeHours] = useState(24);
  const [generatedPosts, setGeneratedPosts] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [batchImageUrl, setBatchImageUrl] = useState('');

  // Media picker state
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'compose' | 'batch'>('compose');

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const res = await fetch('/api/admin/candidates?limit=10');
      const data = await res.json();
      setCandidates(data.items || []);
    } catch (e) {
      console.error('Failed to fetch candidates:', e);
    }
  };

  const aiEnhance = async () => {
    if (!compose.trim() || aiImproving) return;
    setAiImproving(true);
    try {
      const res = await fetch('/api/admin/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: compose }),
      });
      const data = await res.json();
      if (res.ok) {
        setCompose(data.text);
        showToast('success', 'Text Enhanced', 'AI improved your text');
      } else {
        showToast('error', 'Enhancement Failed', data.error || 'Failed to enhance text');
      }
    } catch (e: any) {
      showToast('error', 'Enhancement Failed', e.message);
    } finally {
      setAiImproving(false);
    }
  };

  const postNow = async () => {
    if (!compose.trim() || compose.length > 280) return;
    setPosting(true);
    try {
      const res = await fetch('/api/admin/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: compose, image_url: imageUrl || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Post failed');

      setCompose('');
      setImageUrl('');
      showToast('success', 'Posted Successfully!', 'Your post is now live on X');
      onRefresh();
    } catch (e: any) {
      showToast('error', 'Post Failed', e.message);
    } finally {
      setPosting(false);
    }
  };

  const quoteNow = async (useAi: boolean) => {
    if (!tweetToQuote.trim()) return;
    setQuoting(true);
    try {
      let text = compose;
      if (useAi || !text.trim()) {
        showToast('info', 'Generating Comment', 'AI is writing a comment...');
        const resAi = await fetch('/api/admin/ai/enhance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text || 'Add a concise, insightful comment.' }),
        });
        const dataAi = await resAi.json();
        if (resAi.ok) text = dataAi.text;
        else throw new Error(dataAi.error || 'AI failed');
      }

      const res = await fetch('/api/admin/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, quote_tweet_id: tweetToQuote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Quote failed');

      setTweetToQuote('');
      setCompose('');
      showToast('success', 'Quote Tweet Posted!', 'Successfully quoted the tweet');
      onRefresh();
    } catch (e: any) {
      showToast('error', 'Quote Failed', e.message);
    } finally {
      setQuoting(false);
    }
  };

  const ingestNow = async () => {
    setIngesting(true);
    showToast('info', 'Ingesting Content', 'Fetching from all sources...');
    try {
      const res = await fetch('/api/admin/candidates/ingest', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('success', 'Ingestion Complete', `Found ${data.inserted || 0} new candidates`);
        fetchCandidates();
      } else {
        showToast('error', 'Ingestion Failed', data.error || 'Failed to ingest');
      }
    } catch (e: any) {
      showToast('error', 'Ingestion Failed', e.message);
    } finally {
      setIngesting(false);
    }
  };

  const aiQuoteCandidate = async (id: string) => {
    showToast('info', 'Processing', 'Generating AI comment and posting...');
    try {
      const res = await fetch(`/api/admin/candidates/${id}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', 'Quote Failed', data.error || 'Failed to quote');
      } else {
        showToast('success', 'Quote Posted!', 'Successfully quoted the candidate');
        fetchCandidates();
        onRefresh();
      }
    } catch (e: any) {
      showToast('error', 'Quote Failed', e.message);
    }
  };

  const generateBatchPosts = async () => {
    if (!batchTopic.trim() || generating) return;
    setGenerating(true);
    showToast('info', 'Generating Posts', `Creating ${batchCount} tweets about "${batchTopic}"...`);
    try {
      const res = await fetch('/api/admin/bulk/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: batchTopic,
          count: batchCount,
          save_as_draft: true, // Save as drafts for preview
          image_url: batchImageUrl || undefined, // Include image URL if provided
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');

      setGeneratedPosts(data.posts || []);
      showToast('success', 'Posts Generated!', `Created ${data.posts_generated} tweets`);
    } catch (e: any) {
      showToast('error', 'Generation Failed', e.message);
    } finally {
      setGenerating(false);
    }
  };

  const calculateSpreadTimes = (count: number, hours: number): Date[] => {
    const now = new Date();
    const interval = (hours * 60) / (count - 1); // minutes between posts
    return Array.from({ length: count }, (_, i) =>
      new Date(now.getTime() + i * interval * 60 * 1000)
    );
  };

  const scheduleAllPosts = async () => {
    if (generatedPosts.length === 0 || scheduling) return;
    setScheduling(true);
    showToast('info', 'Scheduling Posts', 'Setting up scheduled times...');
    try {
      const times = calculateSpreadTimes(generatedPosts.length, timeRangeHours);
      const post_schedules = generatedPosts.map((post, i) => ({
        id: post.id,
        scheduled_for: times[i].toISOString(),
      }));

      const batchId = generatedPosts[0]?.batch_id;
      if (!batchId) throw new Error('No batch ID found');

      const res = await fetch(`/api/admin/bulk/${batchId}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_schedules }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule');

      showToast('success', 'Posts Scheduled!', `${data.updated} tweets scheduled over ${timeRangeHours} hours`);
      setGeneratedPosts([]);
      setBatchTopic('');
      setBatchImageUrl('');
      onRefresh();
    } catch (e: any) {
      showToast('error', 'Scheduling Failed', e.message);
    } finally {
      setScheduling(false);
    }
  };

  const updatePostText = (index: number, newText: string) => {
    const updated = [...generatedPosts];
    updated[index].post_text = newText;
    setGeneratedPosts(updated);
  };

  const colors = {
    primary: '#2563eb',
    success: '#16a34a',
    danger: '#dc2626',
    warning: '#f59e0b',
    gray: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 600: '#666', 900: '#111827' }
  };

  const section: React.CSSProperties = {
    padding: 20,
    border: `1px solid ${colors.gray[200]}`,
    borderRadius: 8,
    background: '#fff',
    marginBottom: 16,
  };

  const input: React.CSSProperties = {
    padding: '10px 12px',
    border: `1px solid ${colors.gray[300]}`,
    borderRadius: 6,
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box',
  };

  const button: React.CSSProperties = {
    padding: '10px 16px',
    borderRadius: 6,
    border: 'none',
    background: colors.primary,
    color: 'white',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    transition: 'all 0.2s',
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Batch Tweet Generator Section */}
      <div style={section}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>🚀 Batch Tweet Generator</h3>
        <p style={{ fontSize: 13, color: colors.gray[600], marginBottom: 16 }}>
          Generate multiple tweets on a topic and schedule them to post over time
        </p>

        {/* Topic Input */}
        <input
          placeholder="Enter topic (e.g., 'Benefits of TypeScript')"
          value={batchTopic}
          onChange={e => setBatchTopic(e.target.value)}
          style={{ ...input, marginBottom: 12 }}
        />

        {/* Image Selection */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <button
              onClick={() => {
                setMediaPickerTarget('batch');
                setShowMediaPicker(true);
              }}
              style={{
                ...button,
                background: colors.gray[600],
                padding: '8px 16px',
                fontSize: 13,
              }}
            >
              🖼️ Select Image (Optional)
            </button>
            {batchImageUrl && (
              <button
                onClick={() => setBatchImageUrl('')}
                style={{
                  ...button,
                  background: colors.danger,
                  padding: '8px 16px',
                  fontSize: 13,
                }}
              >
                Remove
              </button>
            )}
          </div>
          {batchImageUrl && (
            <div>
              <img
                src={batchImageUrl}
                alt="Batch attachment"
                style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 8, border: '1px solid ' + colors.gray[200], marginBottom: 8 }}
              />
              <p style={{ fontSize: 11, color: colors.gray[600] }}>
                This image will be attached to all {batchCount} tweets
              </p>
            </div>
          )}
        </div>

        {/* Count Selector */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.gray[900], display: 'block', marginBottom: 6 }}>
            Number of tweets: {batchCount}
          </label>
          <input
            type="range"
            min="3"
            max="5"
            value={batchCount}
            onChange={e => setBatchCount(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.gray[600] }}>
            <span>3</span>
            <span>4</span>
            <span>5</span>
          </div>
        </div>

        {/* Time Range Selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: colors.gray[900], display: 'block', marginBottom: 6 }}>
            Spread over: {timeRangeHours} hours
          </label>
          <select
            value={timeRangeHours}
            onChange={e => setTimeRangeHours(parseInt(e.target.value))}
            style={{ ...input }}
          >
            <option value="1">1 hour</option>
            <option value="3">3 hours</option>
            <option value="6">6 hours</option>
            <option value="12">12 hours</option>
            <option value="24">24 hours</option>
            <option value="48">48 hours</option>
            <option value="72">72 hours</option>
          </select>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateBatchPosts}
          disabled={!batchTopic.trim() || generating}
          style={{ ...button, width: '100%', marginBottom: 16 }}
        >
          {generating ? '⟳ Generating...' : `Generate ${batchCount} Tweets`}
        </button>

        {/* Preview Section */}
        {generatedPosts.length > 0 && (
          <div style={{
            marginTop: 16,
            padding: 16,
            background: colors.gray[50],
            border: `1px solid ${colors.gray[200]}`,
            borderRadius: 6,
          }}>
            <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Preview & Edit</h4>
            {generatedPosts.map((post, index) => {
              const scheduledTime = calculateSpreadTimes(generatedPosts.length, timeRangeHours)[index];
              return (
                <div
                  key={post.id}
                  style={{
                    marginBottom: 12,
                    padding: 12,
                    background: 'white',
                    border: `1px solid ${colors.gray[300]}`,
                    borderRadius: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: colors.gray[600] }}>
                      Tweet {index + 1}
                    </span>
                    <span style={{ fontSize: 11, color: colors.gray[600] }}>
                      📅 {scheduledTime.toLocaleString()}
                    </span>
                  </div>
                  <textarea
                    value={post.post_text}
                    onChange={e => updatePostText(index, e.target.value)}
                    style={{ ...input, minHeight: 60, marginBottom: 4, fontFamily: 'inherit' }}
                  />
                  <div style={{ fontSize: 11, color: post.post_text.length > 280 ? colors.danger : colors.gray[600] }}>
                    {post.post_text.length}/280
                  </div>
                </div>
              );
            })}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                onClick={scheduleAllPosts}
                disabled={scheduling || generatedPosts.some(p => p.post_text.length > 280)}
                style={{ ...button, flex: 1, background: colors.success }}
              >
                {scheduling ? 'Scheduling...' : `Schedule All ${generatedPosts.length} Tweets`}
              </button>
              <button
                onClick={() => setGeneratedPosts([])}
                style={{ ...button, background: colors.gray[600] }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Compose Section */}
      <div style={section}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>✍️ Compose Post</h3>
        <textarea
          value={compose}
          onChange={e => setCompose(e.target.value)}
          placeholder="What's happening?"
          style={{ ...input, minHeight: 120, marginBottom: 12, fontFamily: 'inherit' }}
        />

        {/* Image Attachment */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => {
                setMediaPickerTarget('compose');
                setShowMediaPicker(true);
              }}
              style={{
                ...button,
                background: colors.gray[600],
                padding: '8px 16px',
                fontSize: 13,
              }}
            >
              🖼️ Add Image
            </button>
            {imageUrl && (
              <button
                onClick={() => setImageUrl('')}
                style={{
                  ...button,
                  background: colors.danger,
                  padding: '8px 16px',
                  fontSize: 13,
                }}
              >
                Remove
              </button>
            )}
          </div>
          {imageUrl && (
            <div style={{ marginTop: 12, position: 'relative' }}>
              <img
                src={imageUrl}
                alt="Attachment"
                style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid ' + colors.gray[200] }}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: compose.length > 280 ? colors.danger : compose.length > 240 ? colors.warning : colors.gray[600],
          }}>
            {compose.length}/280
          </div>
          <div style={{ fontSize: 12, color: colors.gray[600] }}>
            {280 - compose.length} characters remaining
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={aiEnhance}
            disabled={!compose.trim() || aiImproving}
            style={{ ...button, background: colors.warning }}
          >
            {aiImproving ? '⟳ Improving...' : 'AI Improve'}
          </button>
          <button
            onClick={postNow}
            disabled={!compose.trim() || compose.length > 280 || posting}
            style={{ ...button, background: colors.success }}
          >
            {posting ? 'Posting...' : 'Post Now'}
          </button>
        </div>
      </div>

      {/* Quote Tweet Section */}
      <div style={section}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>💬 Quote Tweet</h3>
        <input
          placeholder="Tweet ID or URL"
          value={tweetToQuote}
          onChange={e => setTweetToQuote(e.target.value)}
          style={{ ...input, marginBottom: 12 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => quoteNow(true)}
            disabled={!tweetToQuote || quoting}
            style={button}
          >
            {quoting ? 'Processing...' : 'AI Comment & Quote'}
          </button>
          <button
            onClick={() => quoteNow(false)}
            disabled={!tweetToQuote || quoting || !compose.trim()}
            style={{ ...button, background: colors.gray[600] }}
          >
            Quote Now
          </button>
        </div>
      </div>

      {/* Image Post Section */}
      <div style={section}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>🖼️ Post with Image</h3>
        <input
          placeholder="Image URL"
          value={imageUrl}
          onChange={e => setImageUrl(e.target.value)}
          style={input}
        />
        <p style={{ fontSize: 12, color: colors.gray[600], marginTop: 8 }}>
          Downloads and re-uploads the image to attach it to your post
        </p>
      </div>

      {/* Candidates Section */}
      <div style={section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>🎯 Candidates</h3>
          <button
            onClick={ingestNow}
            disabled={ingesting}
            style={{ ...button, padding: '8px 16px', fontSize: 13 }}
          >
            {ingesting ? 'Ingesting...' : 'Ingest Now'}
          </button>
        </div>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {candidates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: colors.gray[600] }}>
              No candidates yet. Click "Ingest Now" to fetch content.
            </div>
          ) : (
            candidates.map(c => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: 12,
                  marginBottom: 12,
                  background: colors.gray[50],
                  border: `1px solid ${colors.gray[200]}`,
                  borderRadius: 6,
                  alignItems: 'center',
                }}
              >
                {c.image_url && (
                  <img
                    src={c.image_url}
                    alt="thumb"
                    style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 4 }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: colors.gray[600], marginBottom: 4 }}>
                    {c.type.toUpperCase()} — {c.source}
                  </div>
                  <div style={{ fontSize: 14, color: colors.gray[900] }}>
                    {c.title || c.text?.substring(0, 100) || 'No title'}
                  </div>
                </div>
                {c.type === 'tweet' && (
                  <button
                    onClick={() => aiQuoteCandidate(c.id)}
                    style={{ ...button, padding: '8px 12px', fontSize: 13, background: colors.success }}
                  >
                    AI Quote
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <MediaPicker
          onSelect={(url) => {
            if (mediaPickerTarget === 'compose') {
              setImageUrl(url);
            } else {
              setBatchImageUrl(url);
            }
          }}
          onClose={() => setShowMediaPicker(false)}
        />
      )}
    </div>
  );
}
