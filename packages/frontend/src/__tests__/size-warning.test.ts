import { createElement } from 'react';
import { act, render, screen } from '@testing-library/react';
import type { Edge, Node } from 'reactflow';
import { afterEach, describe, expect, it } from 'vitest';
import { CANVAS_SOFT_SIZE_CAP } from '@choreostudio/shared';
import { SizeWarningBanner } from '../components/SizeWarningBanner';
import { useCanvasStore, type CanvasNodeData } from '../store/canvas-store';

function createNodes(count: number): Node<CanvasNodeData>[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `node-${index}`,
    type: 'domainEvent',
    position: { x: index * 10, y: 0 },
    data: {
      label: `Event${index}Created`,
      elementType: 'domainEvent',
      color: '#FF9900',
    },
  }));
}

function createEdges(count: number): Edge[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `edge-${index}`,
    source: `node-${index}`,
    target: `node-${index + 1}`,
  }));
}

function setCanvasCounts(nodeCount: number, edgeCount: number) {
  useCanvasStore.setState({
    nodes: createNodes(nodeCount),
    edges: createEdges(edgeCount),
    canvasDoc: null,
  });
}

afterEach(() => {
  useCanvasStore.setState({ nodes: [], edges: [], canvasDoc: null });
});

describe('SizeWarningBanner', () => {
  it('does not render when the node count is at or below the soft cap', () => {
    setCanvasCounts(CANVAS_SOFT_SIZE_CAP, 12);

    render(createElement(SizeWarningBanner));

    expect(screen.queryByRole('alert', { name: 'canvas-size-warning' })).not.toBeInTheDocument();
  });

  it('renders when the node count exceeds the soft cap', () => {
    setCanvasCounts(CANVAS_SOFT_SIZE_CAP + 1, 12);

    render(createElement(SizeWarningBanner));

    expect(screen.getByRole('alert', { name: 'canvas-size-warning' })).toBeInTheDocument();
  });

  it('shows the current node and edge counts', () => {
    setCanvasCounts(CANVAS_SOFT_SIZE_CAP + 5, 17);

    render(createElement(SizeWarningBanner));

    const banner = screen.getByRole('alert', { name: 'canvas-size-warning' });
    expect(banner).toHaveTextContent(`canvas has ${CANVAS_SOFT_SIZE_CAP + 5} elements and 17 edges`);
  });

  it('disappears when the node count drops back to the soft cap after deletions', () => {
    setCanvasCounts(CANVAS_SOFT_SIZE_CAP + 1, 9);

    render(createElement(SizeWarningBanner));
    expect(screen.getByRole('alert', { name: 'canvas-size-warning' })).toBeInTheDocument();

    act(() => {
      setCanvasCounts(CANVAS_SOFT_SIZE_CAP, 8);
    });

    expect(screen.queryByRole('alert', { name: 'canvas-size-warning' })).not.toBeInTheDocument();
  });
});
