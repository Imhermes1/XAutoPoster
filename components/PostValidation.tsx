'use client';

import { useState } from 'react';

interface ValidationResult {
  valid: boolean;
  canPost: boolean;
  quality: string;
  qualityScore: number;
  warnings: string[];
  errors: string[];
  details: any;
}

interface PostValidationProps {
  postText: string;
  title?: string;
  description?: string;
  type?: 'manual' | 'rss';
  onValidate?: (result: ValidationResult) => void;
  onDismiss?: () => void;
}

export default function PostValidation({
  postText,
  title,
  description,
  type = 'manual',
  onValidate,
  onDismiss,
}: PostValidationProps) {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/autopilot/validate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: postText, title, description, type }),
      });

      const data = await res.json();
      setResult(data);
      onValidate?.(data);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!result) {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={validate}
          disabled={loading || !postText}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#3b82f6',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading || !postText ? 0.6 : 1,
          }}
        >
          {loading ? 'Validating...' : '🔍 Validate'}
        </button>
      </div>
    );
  }

  const colors = {
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      500: '#6b7280',
      700: '#374151',
      900: '#111827',
    },
  };

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 10,
        border: `2px solid ${result.valid ? colors.success : result.errors.length > 0 ? colors.danger : colors.warning}`,
        backgroundColor: result.valid ? '#f0fdf4' : result.errors.length > 0 ? '#fef2f2' : '#fefce8',
        marginTop: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: colors.gray[900],
              marginBottom: 4,
            }}
          >
            {result.valid ? '✅ Ready to Post' : result.errors.length > 0 ? '❌ Cannot Post' : '⚠️ Warnings'}
          </div>
          <div style={{ fontSize: 12, color: colors.gray[500] }}>
            Quality: <strong>{result.qualityScore}/100</strong> ({result.quality})
          </div>
        </div>
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 18,
            cursor: 'pointer',
            color: colors.gray[500],
          }}
        >
          ✕
        </button>
      </div>

      {/* Spacing Status */}
      <div style={{ fontSize: 12, marginBottom: 8, color: colors.gray[700] }}>
        {result.details.spacing.canPost ? (
          <div>
            ✓ Post spacing OK ({result.details.spacing.hoursSinceLastPost.toFixed(1)} hrs since last)
          </div>
        ) : (
          <div style={{ color: colors.danger }}>✗ {result.details.spacing.reason}</div>
        )}
      </div>

      {/* Variety Status */}
      <div style={{ fontSize: 12, marginBottom: 12, color: colors.gray[700] }}>
        {result.details.variety.isVaried ? (
          <div>✓ Content variety looks good</div>
        ) : (
          <div>
            {result.details.variety.warnings.map((w: string, i: number) => (
              <div key={i} style={{ color: colors.warning }}>
                ⚠ {w}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Errors */}
      {result.errors.length > 0 && (
        <div style={{ marginBottom: 12, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.danger, marginBottom: 6 }}>
            Errors:
          </div>
          {result.errors.map((err, i) => (
            <div key={i} style={{ fontSize: 12, color: colors.danger, marginBottom: 4 }}>
              • {err}
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div style={{ marginBottom: 12, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.warning, marginBottom: 6 }}>
            Warnings:
          </div>
          {result.warnings.map((warn, i) => (
            <div key={i} style={{ fontSize: 12, color: colors.warning, marginBottom: 4 }}>
              • {warn}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
