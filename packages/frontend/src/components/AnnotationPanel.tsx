import { useState, useEffect, useCallback } from 'react';

interface Annotation {
  id: string;
  elementId: string;
  canvasId: string;
  authorId: string;
  message: string;
  resolved: boolean;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AnnotationPanelProps {
  canvasId: string;
  elementId: string;
  currentUserId: string;
  onClose: () => void;
}

function AnnotationThread({
  annotation,
  replies,
  currentUserId,
  onResolve,
  onDelete,
}: {
  annotation: Annotation;
  replies: Annotation[];
  currentUserId: string;
  onResolve: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className={`annotation-thread${annotation.resolved ? ' annotation-thread--resolved' : ''}`}>
      <div className="annotation-comment annotation-comment--root">
        <div className="annotation-comment__header">
          <span className="annotation-comment__author">{annotation.authorId}</span>
          <span className="annotation-comment__date">{new Date(annotation.createdAt).toLocaleString()}</span>
          <div className="annotation-comment__actions">
            <button
              className="annotation-btn annotation-btn--resolve"
              onClick={() => onResolve(annotation.id, !annotation.resolved)}
              aria-label={annotation.resolved ? 'Unresolve' : 'Resolve'}
            >
              {annotation.resolved ? '↩ Unresolve' : '✓ Resolve'}
            </button>
            {annotation.authorId === currentUserId && (
              <button
                className="annotation-btn annotation-btn--delete"
                onClick={() => onDelete(annotation.id)}
                aria-label="Delete annotation"
              >
                🗑
              </button>
            )}
          </div>
        </div>
        <p className="annotation-comment__message">{annotation.message}</p>
      </div>
      {replies.map(reply => (
        <div key={reply.id} className="annotation-comment annotation-comment--reply">
          <div className="annotation-comment__header">
            <span className="annotation-comment__author">{reply.authorId}</span>
            <span className="annotation-comment__date">{new Date(reply.createdAt).toLocaleString()}</span>
          </div>
          <p className="annotation-comment__message">{reply.message}</p>
        </div>
      ))}
    </div>
  );
}

export function AnnotationPanel({ canvasId, elementId, currentUserId, onClose }: AnnotationPanelProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = `/api/v1/canvases/${canvasId}/annotations`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}?elementId=${elementId}`);
      if (!res.ok) throw new Error('Failed to load annotations');
      const data = await res.json() as Annotation[];
      setAnnotations(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [baseUrl, elementId]);

  useEffect(() => { void load(); }, [load]);

  const submit = useCallback(async () => {
    if (!newMessage.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementId, message: newMessage.trim() }),
      });
      if (!res.ok) throw new Error('Failed to post annotation');
      setNewMessage('');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  }, [baseUrl, elementId, newMessage, load]);

  const resolve = useCallback(async (id: string, resolved: boolean) => {
    try {
      await fetch(`${baseUrl}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved }),
      });
      await load();
    } catch { /* non-fatal */ }
  }, [baseUrl, load]);

  const deleteAnnotation = useCallback(async (id: string) => {
    try {
      await fetch(`${baseUrl}/${id}`, { method: 'DELETE' });
      await load();
    } catch { /* non-fatal */ }
  }, [baseUrl, load]);

  const roots = annotations.filter(a => !a.parentId);
  const replies = annotations.filter(a => a.parentId);
  const repliesById = (id: string) => replies.filter(r => r.parentId === id);

  return (
    <aside className="annotation-panel" aria-label="Element Annotations">
      <div className="annotation-panel__header">
        <h3 className="annotation-panel__title">Annotations</h3>
        <button className="annotation-panel__close" onClick={onClose} aria-label="Close annotations">✕</button>
      </div>
      <div className="annotation-panel__body">
        {loading && <p className="annotation-panel__loading">Loading…</p>}
        {!loading && roots.length === 0 && <p className="annotation-panel__empty">No annotations yet.</p>}
        {roots.map(ann => (
          <AnnotationThread
            key={ann.id}
            annotation={ann}
            replies={repliesById(ann.id)}
            currentUserId={currentUserId}
            onResolve={resolve}
            onDelete={deleteAnnotation}
          />
        ))}
      </div>
      {error && <p className="annotation-panel__error">{error}</p>}
      <div className="annotation-panel__composer">
        <textarea
          className="annotation-panel__textarea"
          placeholder="Add a comment…"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) void submit(); }}
          rows={3}
          aria-label="New annotation message"
        />
        <button
          className="annotation-panel__submit"
          onClick={submit}
          disabled={submitting || !newMessage.trim()}
          aria-label="Post annotation"
        >
          {submitting ? 'Posting…' : 'Post (⌘↵)'}
        </button>
      </div>
    </aside>
  );
}
