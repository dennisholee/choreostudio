import type { DragEvent } from 'react';
import { ELEMENT_COLORS, type ElementType } from '@choreostudio/shared';

const ELEMENTS: Array<{ type: ElementType; label: string }> = [
  { type: 'domainEvent', label: 'Domain Event' },
  { type: 'command', label: 'Command' },
  { type: 'policy', label: 'Policy' },
  { type: 'aggregate', label: 'Aggregate' },
  { type: 'readModel', label: 'Read Model' },
];

export function ElementPalette() {
  const handleDragStart = (event: DragEvent<HTMLDivElement>, type: ElementType) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside
      style={{
        width: 240,
        borderRight: '1px solid #e5e7eb',
        padding: 16,
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: 18 }}>Palette</h2>
        <p style={{ margin: '6px 0 0', color: '#475569', fontSize: 13 }}>Drag one of the five semantic elements onto the canvas.</p>
      </div>
      {ELEMENTS.map((element) => (
        <div
          key={element.type}
          draggable
          onDragStart={(event) => handleDragStart(event, element.type)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderRadius: 10,
            border: '1px solid #cbd5e1',
            background: '#fff',
            padding: '12px 14px',
            cursor: 'grab',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: ELEMENT_COLORS[element.type],
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 600 }}>{element.label}</span>
        </div>
      ))}
    </aside>
  );
}
