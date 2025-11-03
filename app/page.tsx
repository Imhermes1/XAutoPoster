"use client";

import { useState } from 'react';

export default function Page() {
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAddTopic = async () => {
    setMessage(null);
    const res = await fetch('/api/manual/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
    const data = await res.json();
    if (res.ok) setMessage(`Added topic: ${data.topic}`);
    else setMessage(`Error: ${data.error || 'Failed to add topic'}`);
  };

  const handlePreview = async () => {
    setPreview(null);
    const res = await fetch('/api/manual/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, context }),
    });
    const data = await res.json();
    if (res.ok) setPreview(data.post);
    else setPreview(`Error: ${data.error || 'Failed to preview'}`);
  };

  return (
    <main>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>X Autoposter</h1>
      <p style={{ color: '#555', marginTop: 8 }}>
        Simple dashboard to add topics and preview posts.
      </p>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Manual Topic</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <input
            placeholder="Enter a topic..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
          />
          <textarea
            placeholder="Optional context..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6, minHeight: 100 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAddTopic} style={{ padding: '8px 12px' }}>Add Topic</button>
            <button onClick={handlePreview} style={{ padding: '8px 12px' }}>Preview Post</button>
          </div>
        </div>
        {message && <p style={{ marginTop: 8 }}>{message}</p>}
        {preview && (
          <pre style={{ marginTop: 12, background: '#fafafa', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap' }}>
            {preview}
          </pre>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>Health</h2>
        <a href="/api/health">Check /api/health</a>
      </section>
    </main>
  );
}

