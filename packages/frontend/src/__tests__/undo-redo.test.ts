import { beforeEach, describe, expect, it, vi } from 'vitest';

const EMPTY_HISTORY_ENTRY = { nodes: [], edges: [] };

const loadStore = async () => (await import('../store/canvas-store')).useCanvasStore;

let useCanvasStore: Awaited<ReturnType<typeof loadStore>>;

async function resetStore() {
  useCanvasStore.setState({
    nodes: [],
    edges: [],
    canvasDoc: null,
    history: [],
    future: [],
    _lastCommitted: EMPTY_HISTORY_ENTRY,
  });
}

describe('undo/redo', () => {
  beforeEach(async () => {
    vi.resetModules();
    useCanvasStore = await loadStore();
    await resetStore();
  });

  it('undo reverses addElement', () => {
    useCanvasStore.getState().addElement('aggregate', { x: 0, y: 0 });

    expect(useCanvasStore.getState().commitCanvas()).toBe(true);
    expect(useCanvasStore.getState().nodes).toHaveLength(1);

    useCanvasStore.getState().undo();

    expect(useCanvasStore.getState().nodes).toHaveLength(0);
    expect(useCanvasStore.getState().edges).toHaveLength(0);
    expect(useCanvasStore.getState().canvasDoc).toBeNull();
    expect(useCanvasStore.getState().canUndo()).toBe(false);
    expect(useCanvasStore.getState().canRedo()).toBe(true);
  });

  it('redo restores reversed mutations with the same node and edge ids', () => {
    useCanvasStore.getState().addElement('aggregate', { x: 0, y: 0 });
    useCanvasStore.getState().addElement('command', { x: 120, y: 0 });

    const [aggregateNode, commandNode] = useCanvasStore.getState().nodes;
    useCanvasStore.getState().addConnection(commandNode.id, aggregateNode.id);

    expect(useCanvasStore.getState().commitCanvas()).toBe(true);

    const nodeIds = useCanvasStore.getState().nodes.map((node) => node.id);
    const edgeIds = useCanvasStore.getState().edges.map((edge) => edge.id);

    useCanvasStore.getState().undo();
    useCanvasStore.getState().redo();

    expect(useCanvasStore.getState().nodes.map((node) => node.id)).toEqual(nodeIds);
    expect(useCanvasStore.getState().edges.map((edge) => edge.id)).toEqual(edgeIds);
  });

  it('failed commits are not pushed to history', () => {
    useCanvasStore.getState().addElement('command', { x: 0, y: 0 });

    expect(useCanvasStore.getState().commitCanvas()).toBe(false);
    expect(useCanvasStore.getState().history).toEqual([]);
    expect(useCanvasStore.getState().future).toEqual([]);
    expect(useCanvasStore.getState().canUndo()).toBe(false);
    expect(useCanvasStore.getState().canRedo()).toBe(false);
  });

  it('undo does not affect uncommitted drag state', () => {
    useCanvasStore.getState().addElement('aggregate', { x: 0, y: 0 });
    expect(useCanvasStore.getState().commitCanvas()).toBe(true);

    const nodeId = useCanvasStore.getState().nodes[0].id;
    useCanvasStore
      .getState()
      .applyNodeChanges([{ type: 'position', id: nodeId, position: { x: 50, y: 75 }, dragging: true }]);

    useCanvasStore.getState().undo();

    expect(useCanvasStore.getState().nodes[0].position).toEqual({ x: 50, y: 75 });
    expect(useCanvasStore.getState().history).toHaveLength(1);
    expect(useCanvasStore.getState().future).toEqual([]);
  });

  it('100 commits followed by 100 undos returns byte-for-byte to the initial canvas state', () => {
    const initialState = JSON.stringify({
      nodes: useCanvasStore.getState().nodes,
      edges: useCanvasStore.getState().edges,
    });

    for (let i = 0; i < 100; i += 1) {
      useCanvasStore.getState().addElement('aggregate', { x: i * 20, y: i * 10 });
      expect(useCanvasStore.getState().commitCanvas()).toBe(true);
    }

    expect(useCanvasStore.getState().history).toHaveLength(100);

    for (let i = 0; i < 100; i += 1) {
      useCanvasStore.getState().undo();
    }

    expect(
      JSON.stringify({
        nodes: useCanvasStore.getState().nodes,
        edges: useCanvasStore.getState().edges,
      }),
    ).toBe(initialState);
  });

  it('page reload starts with empty in-memory undo and redo stacks', async () => {
    useCanvasStore.getState().addElement('aggregate', { x: 0, y: 0 });
    expect(useCanvasStore.getState().commitCanvas()).toBe(true);
    useCanvasStore.getState().undo();

    expect(useCanvasStore.getState().future).toHaveLength(1);

    vi.resetModules();
    const reloadedStore = await loadStore();

    expect(reloadedStore.getState().history).toEqual([]);
    expect(reloadedStore.getState().future).toEqual([]);
    expect(reloadedStore.getState().nodes).toEqual([]);
    expect(reloadedStore.getState().edges).toEqual([]);
    expect(reloadedStore.getState().canUndo()).toBe(false);
    expect(reloadedStore.getState().canRedo()).toBe(false);
  });
});
