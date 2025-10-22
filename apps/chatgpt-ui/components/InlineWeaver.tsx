"use client";
import { useState } from 'react';

/**
 * InlineWeaver - Compact memory capture widget
 *
 * A lightweight form that can be embedded anywhere to quickly capture
 * moments in conversation. Perfect for ChatGPT integration or quick notes.
 *
 * Features:
 * - Minimal fields: title + narrative
 * - Auto-creates, sets core, and locks in one flow
 * - Shows confirmation with link to full detail
 * - Optional: add quick layers after creation
 */

interface InlineWeaverProps {
  /** API base URL (defaults to /api/proxy) */
  apiBase?: string;
  /** Called after successful memory creation */
  onMemoryCreated?: (memoryId: string, title: string) => void;
  /** Custom styling */
  className?: string;
  /** Compact mode (minimal UI) */
  compact?: boolean;
}

export default function InlineWeaver({
  apiBase = '/api/proxy',
  onMemoryCreated,
  className = '',
  compact = false
}: InlineWeaverProps) {
  const [title, setTitle] = useState('');
  const [narrative, setNarrative] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    memoryId: string;
    title: string;
  } | null>(null);

  /**
   * Create and lock a memory in one flow:
   * 1. POST /v1/memories (create)
   * 2. PUT /v1/memories/:id/core (set narrative)
   * 3. POST /v1/memories/:id/lock (lock core)
   */
  async function captureMemory() {
    if (!title.trim() || !narrative.trim()) {
      setError('Please provide both a title and narrative');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Create memory
      const createRes = await fetch(`${apiBase}/v1/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() })
      });

      if (!createRes.ok) {
        throw new Error(`Failed to create memory: ${createRes.statusText}`);
      }

      const created = await createRes.json();
      const memoryId = created.memory_id;

      // Step 2: Set core narrative
      const coreRes = await fetch(`${apiBase}/v1/memories/${memoryId}/core`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narrative: narrative.trim(),
          anchors: [],
          people: []
        })
      });

      if (!coreRes.ok) {
        throw new Error(`Failed to set core: ${coreRes.statusText}`);
      }

      // Step 3: Lock core
      const lockRes = await fetch(`${apiBase}/v1/memories/${memoryId}/lock`, {
        method: 'POST'
      });

      if (!lockRes.ok) {
        throw new Error(`Failed to lock core: ${lockRes.statusText}`);
      }

      // Success!
      setSuccess({ memoryId, title: title.trim() });
      setTitle('');
      setNarrative('');

      if (onMemoryCreated) {
        onMemoryCreated(memoryId, title.trim());
      }

    } catch (e: any) {
      setError(e.message || 'Failed to capture memory');
    } finally {
      setLoading(false);
    }
  }

  // Handle keyboard shortcuts
  function handleKeyDown(e: React.KeyboardEvent) {
    // Cmd/Ctrl + Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      captureMemory();
    }
  }

  // Reset to capture another memory
  function reset() {
    setSuccess(null);
    setError(null);
  }

  return (
    <div
      className={`inline-weaver ${compact ? 'compact' : ''} ${className}`}
      style={defaultStyles.container}
    >
      {!success ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            captureMemory();
          }}
          style={defaultStyles.form}
        >
          <div style={defaultStyles.header}>
            <h3 style={defaultStyles.heading}>
              {compact ? 'Quick Capture' : 'Capture This Moment'}
            </h3>
            <p style={defaultStyles.subtitle}>
              Save a memory with title and narrative
            </p>
          </div>

          <div style={defaultStyles.field}>
            <label style={defaultStyles.label}>
              Title
              <span style={defaultStyles.required}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Coffee chat with Sarah"
              style={defaultStyles.input}
              disabled={loading}
              onKeyDown={handleKeyDown}
              autoFocus={!compact}
            />
          </div>

          <div style={defaultStyles.field}>
            <label style={defaultStyles.label}>
              What happened?
              <span style={defaultStyles.required}>*</span>
            </label>
            <textarea
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="Tell the story... what happened, how did you feel, what did you learn?"
              style={{
                ...defaultStyles.textarea,
                minHeight: compact ? '60px' : '100px'
              }}
              disabled={loading}
              onKeyDown={handleKeyDown}
            />
            <div style={defaultStyles.hint}>
              Tip: Press {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'} + Enter to save
            </div>
          </div>

          {error && (
            <div style={defaultStyles.error}>
              {error}
            </div>
          )}

          <div style={defaultStyles.actions}>
            <button
              type="submit"
              style={{
                ...defaultStyles.button,
                ...defaultStyles.primaryButton
              }}
              disabled={loading || !title.trim() || !narrative.trim()}
            >
              {loading ? 'Capturing...' : 'Capture This Moment'}
            </button>
          </div>
        </form>
      ) : (
        <div style={defaultStyles.success}>
          <div style={defaultStyles.successIcon}>✓</div>
          <h3 style={defaultStyles.successHeading}>Memory Captured!</h3>
          <p style={defaultStyles.successMessage}>
            <strong>{success.title}</strong> has been saved to your Weave.
          </p>

          <div style={defaultStyles.successActions}>
            <a
              href={`/memories/${success.memoryId}`}
              style={{
                ...defaultStyles.button,
                ...defaultStyles.primaryButton
              }}
            >
              View Full Memory
            </a>
            <button
              onClick={reset}
              style={{
                ...defaultStyles.button,
                ...defaultStyles.secondaryButton
              }}
            >
              Capture Another
            </button>
          </div>

          <div style={defaultStyles.successDetails}>
            <p style={defaultStyles.detailText}>
              Memory ID: <code style={defaultStyles.code}>{success.memoryId}</code>
            </p>
            <p style={defaultStyles.detailText}>
              The core narrative is now locked. You can add layers (reflections,
              images, updates) at any time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Default styles (can be overridden with className or inline styles)
const defaultStyles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  } as React.CSSProperties,

  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px'
  } as React.CSSProperties,

  header: {
    marginBottom: '8px'
  } as React.CSSProperties,

  heading: {
    margin: '0 0 4px 0',
    fontSize: '20px',
    fontWeight: 600,
    color: '#1a1a1a'
  } as React.CSSProperties,

  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#666'
  } as React.CSSProperties,

  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px'
  } as React.CSSProperties,

  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#333'
  } as React.CSSProperties,

  required: {
    color: '#e63946',
    marginLeft: '4px'
  } as React.CSSProperties,

  input: {
    padding: '10px 12px',
    fontSize: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit'
  } as React.CSSProperties,

  textarea: {
    padding: '10px 12px',
    fontSize: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    lineHeight: '1.5',
    transition: 'border-color 0.2s'
  } as React.CSSProperties,

  hint: {
    fontSize: '12px',
    color: '#999',
    fontStyle: 'italic'
  } as React.CSSProperties,

  error: {
    padding: '10px 12px',
    backgroundColor: '#fee',
    border: '1px solid #fcc',
    borderRadius: '6px',
    color: '#c33',
    fontSize: '14px'
  } as React.CSSProperties,

  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px'
  } as React.CSSProperties,

  button: {
    padding: '10px 20px',
    fontSize: '15px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block'
  } as React.CSSProperties,

  primaryButton: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    flex: 1
  } as React.CSSProperties,

  secondaryButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db'
  } as React.CSSProperties,

  success: {
    textAlign: 'center' as const,
    padding: '20px'
  } as React.CSSProperties,

  successIcon: {
    width: '64px',
    height: '64px',
    margin: '0 auto 16px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: 'bold'
  } as React.CSSProperties,

  successHeading: {
    margin: '0 0 8px 0',
    fontSize: '22px',
    fontWeight: 600,
    color: '#1a1a1a'
  } as React.CSSProperties,

  successMessage: {
    margin: '0 0 24px 0',
    fontSize: '15px',
    color: '#555'
  } as React.CSSProperties,

  successActions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    justifyContent: 'center'
  } as React.CSSProperties,

  successDetails: {
    textAlign: 'left' as const,
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    fontSize: '13px'
  } as React.CSSProperties,

  detailText: {
    margin: '8px 0',
    color: '#666'
  } as React.CSSProperties,

  code: {
    fontFamily: 'monospace',
    backgroundColor: '#e5e7eb',
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '12px'
  } as React.CSSProperties
};
