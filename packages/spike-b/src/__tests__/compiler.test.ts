import { beforeEach, describe, expect, it } from 'vitest';
import { cache, compile } from '../compiler.js';
import type { CanvasConnection, CanvasElement } from '../types.js';

function makeCanvas(n: number): { elements: CanvasElement[]; connections: CanvasConnection[] } {
  const elements: CanvasElement[] = [];
  const connections: CanvasConnection[] = [];

  for (let i = 0; i < n; i++) {
    const aggId = `agg-${i}`;
    const cmdId = `cmd-${i}`;
    const evtId = `evt-${i}`;

    elements.push({ id: aggId, type: 'aggregate', name: `Aggregate${i}`, serviceBoundary: `svc${i % 5}` });
    elements.push({
      id: cmdId,
      type: 'command',
      name: `Command${i}`,
      transport: i % 2 === 0 ? 'REST' : 'Async',
      serviceBoundary: `svc${i % 5}`,
    });
    elements.push({ id: evtId, type: 'domainEvent', name: `Event${i}Occurred`, serviceBoundary: `svc${i % 5}` });
    connections.push({ id: `conn-${i}`, sourceId: cmdId, targetId: aggId });
  }

  return { elements, connections };
}

beforeEach(() => {
  (cache as unknown as { cache: Map<string, unknown> }).cache.clear();
});

describe('Incremental compiler', () => {
  it('full compile of 200-element canvas in <500ms', () => {
    const { elements, connections } = makeCanvas(67);
    const result = compile(elements, connections);

    console.log(`[Spike B] Full compile 200+ elements: ${result.durationMs.toFixed(2)}ms`);
    expect(result.durationMs).toBeLessThan(500);
  });

  it('incremental compile of 1 dirty element in <100ms', () => {
    const { elements, connections } = makeCanvas(67);
    compile(elements, connections);

    const dirty = new Set(['cmd-0']);
    elements[1]!.name = 'UpdatedCommand0';
    const result = compile(elements, connections, dirty);

    console.log(
      `[Spike B] Incremental 1 dirty element: ${result.durationMs.toFixed(2)}ms, cache hits: ${result.cacheHits}`,
    );
    expect(result.durationMs).toBeLessThan(100);
    expect(result.dirtyCount).toBe(1);
    expect(result.cacheHits).toBeGreaterThan(0);
  });

  it('cache hits increase on second full compile with no changes', () => {
    const { elements, connections } = makeCanvas(10);
    compile(elements, connections);

    const result2 = compile(elements, connections, new Set());
    expect(result2.cacheHits).toBeGreaterThan(0);
    expect(result2.dirtyCount).toBe(0);
  });

  it('REST commands appear in OpenAPI only', () => {
    const elements: CanvasElement[] = [
      { id: 'agg-1', type: 'aggregate', name: 'Order', serviceBoundary: 'orders' },
      { id: 'cmd-1', type: 'command', name: 'PlaceOrder', transport: 'REST', serviceBoundary: 'orders' },
    ];

    const result = compile(elements, []);
    const paths = result.openapi.paths as Record<string, unknown>;
    const channels = result.asyncapi.channels as Record<string, unknown>;

    expect(Object.keys(paths)).toHaveLength(1);
    expect(Object.keys(channels)).toHaveLength(0);
  });

  it('Async commands appear in AsyncAPI only', () => {
    const elements: CanvasElement[] = [
      { id: 'agg-1', type: 'aggregate', name: 'Order', serviceBoundary: 'orders' },
      { id: 'cmd-1', type: 'command', name: 'ShipOrder', transport: 'Async', serviceBoundary: 'orders' },
    ];

    const result = compile(elements, []);
    const paths = result.openapi.paths as Record<string, unknown>;
    const channels = result.asyncapi.channels as Record<string, unknown>;

    expect(Object.keys(paths)).toHaveLength(0);
    expect(Object.keys(channels)).toHaveLength(1);
  });

  it('DomainEvents produce AsyncAPI publish channels', () => {
    const elements: CanvasElement[] = [
      { id: 'evt-1', type: 'domainEvent', name: 'OrderPlaced', serviceBoundary: 'orders' },
    ];

    const result = compile(elements, []);
    const channels = result.asyncapi.channels as Record<string, unknown>;

    expect(Object.keys(channels)).toHaveLength(1);
    const channel = Object.values(channels)[0] as Record<string, unknown>;
    expect(channel).toHaveProperty('publish');
  });
});
