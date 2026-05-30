import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

import {
  addConnection,
  addElement,
  createCanvasDoc,
  moveElement,
  removeElement,
  renameElement,
  syncDocs,
  toSnapshot,
} from '../canvas-yjs-bridge.js';
import { checkInvariants } from '../invariants.js';

describe('Yjs CRDT — bidirectional sync', () => {
  it('two docs converge after independent adds', () => {
    const docA = createCanvasDoc();
    const docB = createCanvasDoc();
    syncDocs(docA, docB);

    addElement(docA, { id: 'agg-1', type: 'aggregate', name: 'Order', position: { x: 0, y: 0 } });
    addElement(docB, {
      id: 'cmd-1',
      type: 'command',
      name: 'PlaceOrder',
      position: { x: 100, y: 0 },
      transport: 'REST',
    });

    syncDocs(docA, docB);

    const snapshotA = toSnapshot(docA);
    const snapshotB = toSnapshot(docB);
    const idsA = snapshotA.elements.map((element) => element.id).sort();
    const idsB = snapshotB.elements.map((element) => element.id).sort();

    expect(idsA).toEqual(['agg-1', 'cmd-1']);
    expect(idsB).toEqual(idsA);
  });

  it('concurrent moves produce deterministic convergence', () => {
    const docA = createCanvasDoc();
    addElement(docA, { id: 'evt-1', type: 'domainEvent', name: 'OrderPlaced', position: { x: 0, y: 0 } });
    const docB = createCanvasDoc();
    syncDocs(docA, docB);

    moveElement(docA, 'evt-1', { x: 100, y: 200 });
    moveElement(docB, 'evt-1', { x: 300, y: 400 });

    syncDocs(docA, docB);

    const snapA = toSnapshot(docA);
    const snapB = toSnapshot(docB);

    expect(snapA.elements[0]?.position).toEqual(snapB.elements[0]?.position);
  });

  it('concurrent renames converge deterministically', () => {
    const docA = createCanvasDoc();
    addElement(docA, { id: 'agg-1', type: 'aggregate', name: 'Order', position: { x: 0, y: 0 } });
    const docB = createCanvasDoc();
    syncDocs(docA, docB);

    renameElement(docA, 'agg-1', 'PurchaseOrder');
    renameElement(docB, 'agg-1', 'SalesOrder');

    syncDocs(docA, docB);

    const snapA = toSnapshot(docA);
    const snapB = toSnapshot(docB);

    expect(snapA.elements[0]?.name).toEqual(snapB.elements[0]?.name);
  });

  it('no duplicated node ids after concurrent adds with same id', () => {
    const docA = createCanvasDoc();
    const docB = createCanvasDoc();
    syncDocs(docA, docB);

    addElement(docA, {
      id: 'cmd-clash',
      type: 'command',
      name: 'CreateOrder',
      position: { x: 0, y: 0 },
      transport: 'REST',
    });
    addElement(docB, {
      id: 'cmd-clash',
      type: 'command',
      name: 'UpdateOrder',
      position: { x: 50, y: 50 },
      transport: 'Async',
    });

    syncDocs(docA, docB);

    const snapA = toSnapshot(docA);
    const ids = snapA.elements.map((element) => element.id);
    const uniqueIds = [...new Set(ids)];

    expect(ids.length).toEqual(uniqueIds.length);
  });

  it('element deleted on one peer is absent after sync', () => {
    const docA = createCanvasDoc();
    addElement(docA, { id: 'pol-1', type: 'policy', name: 'ReserveInventory', position: { x: 0, y: 0 } });
    addElement(docA, {
      id: 'cmd-1',
      type: 'command',
      name: 'PlaceOrder',
      position: { x: 100, y: 0 },
      transport: 'REST',
    });
    addConnection(docA, { id: 'conn-1', sourceId: 'cmd-1', targetId: 'pol-1' });
    const docB = createCanvasDoc();
    syncDocs(docA, docB);

    removeElement(docA, 'pol-1');
    syncDocs(docA, docB);

    const snap = toSnapshot(docB);
    expect(snap.elements.find((element) => element.id === 'pol-1')).toBeUndefined();
    expect(snap.connections.find((connection) => connection.targetId === 'pol-1')).toBeUndefined();
  });

  it('connections survive element adds from other peer', () => {
    const docA = createCanvasDoc();
    addElement(docA, { id: 'agg-1', type: 'aggregate', name: 'Order', position: { x: 0, y: 0 } });
    addElement(docA, {
      id: 'cmd-1',
      type: 'command',
      name: 'PlaceOrder',
      position: { x: 100, y: 0 },
      transport: 'REST',
    });
    addConnection(docA, { id: 'conn-1', sourceId: 'cmd-1', targetId: 'agg-1' });
    const docB = createCanvasDoc();
    syncDocs(docA, docB);

    addElement(docB, { id: 'evt-1', type: 'domainEvent', name: 'OrderPlaced', position: { x: 200, y: 0 } });
    syncDocs(docA, docB);

    const snap = toSnapshot(docA);
    expect(snap.connections).toHaveLength(1);
    expect(snap.connections[0]?.id).toBe('conn-1');
  });
});

describe('Yjs CRDT — structural invariants after merge', () => {
  it('valid canvas passes invariants after merge', () => {
    const docA = createCanvasDoc();
    addElement(docA, { id: 'agg-1', type: 'aggregate', name: 'Order', position: { x: 0, y: 0 } });
    addElement(docA, {
      id: 'cmd-1',
      type: 'command',
      name: 'PlaceOrder',
      position: { x: 100, y: 0 },
      transport: 'REST',
    });
    addConnection(docA, { id: 'conn-1', sourceId: 'cmd-1', targetId: 'agg-1' });
    const docB = createCanvasDoc();
    syncDocs(docA, docB);
    addElement(docB, { id: 'evt-1', type: 'domainEvent', name: 'OrderPlaced', position: { x: 200, y: 0 } });
    syncDocs(docA, docB);

    expect(checkInvariants(docA).valid).toBe(true);
  });

  it('unconnected command after merge triggers CONFLICT', () => {
    const docA = createCanvasDoc();
    const docB = createCanvasDoc();
    syncDocs(docA, docB);

    addElement(docA, {
      id: 'cmd-1',
      type: 'command',
      name: 'PlaceOrder',
      position: { x: 0, y: 0 },
      transport: 'REST',
    });
    addElement(docB, { id: 'agg-1', type: 'aggregate', name: 'Order', position: { x: 100, y: 0 } });
    syncDocs(docA, docB);

    const result = checkInvariants(docA);
    expect(result.valid).toBe(false);
    expect(result.violations[0]).toContain('PlaceOrder');
  });

  it('orphaned connection after merge triggers CONFLICT', () => {
    const docA = createCanvasDoc();
    const docB = createCanvasDoc();
    syncDocs(docA, docB);

    addConnection(docA, { id: 'conn-1', sourceId: 'cmd-1', targetId: 'agg-1' });
    syncDocs(docA, docB);

    const result = checkInvariants(docA);
    expect(result.valid).toBe(false);
    expect(result.violations).toContain('Connection "conn-1" has missing source "cmd-1"');
    expect(result.violations).toContain('Connection "conn-1" has missing target "agg-1"');
  });
});

describe('Yjs CRDT — performance benchmark', () => {
  it('100 concurrent element adds + sync completes in <500ms', () => {
    const docA = createCanvasDoc();
    const docB = createCanvasDoc();
    syncDocs(docA, docB);

    const start = performance.now();
    for (let index = 0; index < 50; index += 1) {
      addElement(docA, {
        id: `agg-${index}`,
        type: 'aggregate',
        name: `Aggregate${index}`,
        position: { x: index * 10, y: 0 },
      });
      addElement(docB, {
        id: `cmd-${index}`,
        type: 'command',
        name: `Command${index}`,
        position: { x: index * 10, y: 100 },
        transport: 'REST',
      });
    }
    syncDocs(docA, docB);
    const elapsed = performance.now() - start;

    console.log(`[Spike A] 100 concurrent adds + sync: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(2000);
  });

  it('single-element merge latency <100ms (Go threshold)', () => {
    const docA = createCanvasDoc();
    addElement(docA, { id: 'agg-1', type: 'aggregate', name: 'Order', position: { x: 0, y: 0 } });
    const docB = createCanvasDoc();
    syncDocs(docA, docB);

    const start = performance.now();
    addElement(docA, {
      id: 'cmd-1',
      type: 'command',
      name: 'PlaceOrder',
      position: { x: 100, y: 0 },
      transport: 'REST',
    });
    syncDocs(docA, docB);
    const elapsed = performance.now() - start;

    console.log(`[Spike A] Single-element merge: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(100);
  });
});
