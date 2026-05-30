import * as Y from 'yjs';

export interface YCanvasElement {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  transport?: string;
}

export interface YCanvasConnection {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface CanvasSnapshot {
  elements: YCanvasElement[];
  connections: YCanvasConnection[];
}

/** Create a new shared Yjs document representing a canvas */
export function createCanvasDoc(): Y.Doc {
  return new Y.Doc();
}

/** Get the elements Y.Map from a canvas doc */
export function getElements(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap('elements');
}

/** Get the connections Y.Map from a canvas doc */
export function getConnections(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap('connections');
}

/** Add an element to the canvas doc */
export function addElement(doc: Y.Doc, el: YCanvasElement): void {
  const elements = getElements(doc);
  const yEl = new Y.Map<unknown>();

  doc.transact(() => {
    yEl.set('id', el.id);
    yEl.set('type', el.type);
    yEl.set('name', el.name);
    yEl.set('position', el.position);
    if (el.transport) {
      yEl.set('transport', el.transport);
    }
    elements.set(el.id, yEl);
  });
}

/** Update element position */
export function moveElement(doc: Y.Doc, id: string, position: { x: number; y: number }): void {
  const el = getElements(doc).get(id);
  if (el) {
    doc.transact(() => {
      el.set('position', position);
    });
  }
}

/** Update element name */
export function renameElement(doc: Y.Doc, id: string, name: string): void {
  const el = getElements(doc).get(id);
  if (el) {
    doc.transact(() => {
      el.set('name', name);
    });
  }
}

/** Add a connection */
export function addConnection(doc: Y.Doc, conn: YCanvasConnection): void {
  const connections = getConnections(doc);
  const yConn = new Y.Map<unknown>();

  doc.transact(() => {
    yConn.set('id', conn.id);
    yConn.set('sourceId', conn.sourceId);
    yConn.set('targetId', conn.targetId);
    connections.set(conn.id, yConn);
  });
}

/** Remove an element */
export function removeElement(doc: Y.Doc, id: string): void {
  doc.transact(() => {
    getElements(doc).delete(id);

    const connections = getConnections(doc);
    for (const [connectionId, connection] of connections.entries()) {
      if (connection.get('sourceId') === id || connection.get('targetId') === id) {
        connections.delete(connectionId);
      }
    }
  });
}

/** Project Yjs doc to a plain canvas snapshot */
export function toSnapshot(doc: Y.Doc): CanvasSnapshot {
  const elements: YCanvasElement[] = [];
  for (const [, yEl] of getElements(doc).entries()) {
    const transport = yEl.get('transport');
    elements.push({
      id: yEl.get('id') as string,
      type: yEl.get('type') as string,
      name: yEl.get('name') as string,
      position: yEl.get('position') as { x: number; y: number },
      ...(typeof transport === 'string' ? { transport } : {}),
    });
  }

  const connections: YCanvasConnection[] = [];
  for (const [, yConn] of getConnections(doc).entries()) {
    connections.push({
      id: yConn.get('id') as string,
      sourceId: yConn.get('sourceId') as string,
      targetId: yConn.get('targetId') as string,
    });
  }

  return { elements, connections };
}

/** Sync two docs (simulate network sync via Y.encodeStateAsUpdate) */
export function syncDocs(docA: Y.Doc, docB: Y.Doc): void {
  const updateA = Y.encodeStateAsUpdate(docA);
  const updateB = Y.encodeStateAsUpdate(docB);
  Y.applyUpdate(docA, updateB);
  Y.applyUpdate(docB, updateA);
}
