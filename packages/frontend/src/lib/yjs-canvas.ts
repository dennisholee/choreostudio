import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { CanvasDocument, CanvasElement } from '@choreostudio/shared';

const WS_BASE = typeof window !== 'undefined'
  ? (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/api/v1'
  : 'ws://localhost:4000/api/v1';

export interface YjsCanvasHandle {
  doc: Y.Doc;
  provider: WebsocketProvider;
  elements: Y.Map<unknown>;
  connections: Y.Map<unknown>;
  destroy: () => void;
}

export function createYjsCanvas(canvasId: string): YjsCanvasHandle {
  const doc = new Y.Doc();
  const elements = doc.getMap<unknown>('elements');
  const connections = doc.getMap<unknown>('connections');

  const provider = new WebsocketProvider(WS_BASE, `canvas:${canvasId}`, doc, { connect: true });

  return {
    doc,
    provider,
    elements,
    connections,
    destroy() {
      provider.disconnect();
      doc.destroy();
    },
  };
}

/** Project Yjs state into a CanvasDocument snapshot */
export function yjsToCanvas(handle: YjsCanvasHandle, canvasId: string): Omit<CanvasDocument, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'> {
  const elements = Array.from(handle.elements.values()) as CanvasElement[];
  const connections = Array.from(handle.connections.values()) as CanvasDocument['connections'];
  return {
    name: '',
    elements,
    connections,
    serviceBoundaries: [],
    annotations: [],
    version: 1,
  };
}

/** Apply a CanvasDocument snapshot into Yjs state */
export function canvasToYjs(canvas: CanvasDocument, handle: YjsCanvasHandle): void {
  handle.doc.transact(() => {
    handle.elements.clear();
    handle.connections.clear();
    for (const el of canvas.elements) handle.elements.set(el.id, el);
    for (const conn of canvas.connections) handle.connections.set(conn.id, conn);
  });
}
