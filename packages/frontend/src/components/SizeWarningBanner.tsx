import { CANVAS_SOFT_SIZE_CAP } from '@choreostudio/shared';
import { useCanvasStore } from '../store/canvas-store';

export function SizeWarningBanner() {
  const nodeCount = useCanvasStore((state) => state.nodes.length);
  const edgeCount = useCanvasStore((state) => state.edges.length);

  if (nodeCount <= CANVAS_SOFT_SIZE_CAP) {
    return null;
  }

  // AC4 is a manual benchmarking target; unit tests only cover warning behavior.
  return (
    <div
      role="alert"
      aria-label="canvas-size-warning"
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        borderRadius: 8,
        border: '1px solid #d97706',
        background: '#fffbeb',
        padding: '8px 16px',
        color: '#92400e',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        fontSize: 14,
      }}
    >
      ⚠️ Performance warning: canvas has <strong>{nodeCount}</strong> elements and <strong>{edgeCount}</strong> edges
      {' '}(soft cap: {CANVAS_SOFT_SIZE_CAP}). Large canvases may affect rendering performance.
    </div>
  );
}
