"use client";
import { useState } from 'react';

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    const res = await fetch('/api/admin/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.href = '/admin';
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Login failed');
    }
  };

  return (
    <main>
      <h1>Admin Login</h1>
      <div style={{ maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
        />
        <button onClick={onSubmit} style={{ padding: '8px 12px' }}>Login</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    </main>
  );
}

