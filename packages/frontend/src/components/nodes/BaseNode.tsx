import { useEffect, useState, type KeyboardEvent } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { CanvasNodeData } from '../../store/canvas-store';
import { useCanvasStore } from '../../store/canvas-store';

interface BaseNodeProps extends NodeProps<CanvasNodeData> {
  subtitle: string;
  badge?: string;
}

export function BaseNode({ id, data, selected, subtitle, badge }: BaseNodeProps) {
  const updateElementLabel = useCanvasStore((state) => state.updateElementLabel);
  const commitCanvas = useCanvasStore((state) => state.commitCanvas);
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(data.label);

  useEffect(() => {
    setDraftLabel(data.label);
  }, [data.label]);

  const commitLabel = () => {
    const nextLabel = draftLabel.trim() || data.label;
    updateElementLabel(id, nextLabel);
    commitCanvas();
    setIsEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      commitLabel();
      return;
    }

    if (event.key === 'Escape') {
      setDraftLabel(data.label);
      setIsEditing(false);
    }
  };

  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      style={{
        minWidth: 180,
        borderRadius: 12,
        border: selected ? '2px solid #111827' : '1px solid rgba(17, 24, 39, 0.2)',
        background: data.color,
        color: '#111827',
        padding: 12,
        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#111827' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        {isEditing ? (
          <input
            autoFocus
            value={draftLabel}
            onChange={(event) => setDraftLabel(event.target.value)}
            onBlur={commitLabel}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              borderRadius: 6,
              border: '1px solid rgba(17, 24, 39, 0.3)',
              padding: '6px 8px',
              fontSize: 14,
              fontWeight: 700,
            }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <strong style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.label}</strong>
            {data.warningMessage ? <span title={data.warningMessage}>⚠️</span> : null}
          </div>
        )}
        {badge ? (
          <span
            style={{
              borderRadius: 999,
              background: 'rgba(17, 24, 39, 0.15)',
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <div style={{ marginTop: 6, fontSize: 11, opacity: 0.85 }}>{subtitle}</div>
      <Handle type="source" position={Position.Right} style={{ background: '#111827' }} />
    </div>
  );
}
