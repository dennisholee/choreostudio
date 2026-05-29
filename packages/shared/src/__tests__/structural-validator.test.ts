import { describe, expect, it } from 'vitest';

import type { CanvasDocument } from '../types/canvas';
import { validateStructure } from '../validators/structural-validator';

function createCanvas(overrides: Partial<CanvasDocument> = {}): CanvasDocument {
  return {
    schemaVersion: '0.1.0',
    id: 'canvas-1',
    slug: 'order-canvas',
    name: 'Order Canvas',
    workspaceId: 'ws-1',
    teamId: 'team-1',
    orgId: 'org-1',
    lifecycleState: 'draft',
    elements: [],
    connections: [],
    serviceBoundaries: [],
    annotations: [],
    ...overrides,
  };
}

describe('validateStructure', () => {
  it('accepts a command connected to an aggregate', () => {
    const result = validateStructure(
      createCanvas({
        elements: [
          {
            id: 'cmd-1',
            type: 'command',
            name: 'PlaceOrder',
            transport: 'REST',
            position: { x: 0, y: 0 },
          },
          {
            id: 'agg-1',
            type: 'aggregate',
            name: 'Order',
            position: { x: 100, y: 0 },
          },
        ],
        connections: [
          {
            id: 'conn-1',
            sourceId: 'cmd-1',
            targetId: 'agg-1',
            direction: 'sourceToTarget',
          },
        ],
      }),
    );

    expect(result).toEqual([]);
  });

  it('flags a command without an aggregate or policy connection', () => {
    const result = validateStructure(
      createCanvas({
        elements: [
          {
            id: 'cmd-1',
            type: 'command',
            name: 'PlaceOrder',
            transport: 'REST',
            position: { x: 0, y: 0 },
          },
        ],
      }),
    );

    expect(result).toContainEqual({
      elementId: 'cmd-1',
      message: 'Command "PlaceOrder" must be connected to an Aggregate or Policy.',
    });
  });

  it('flags a command without a transport protocol', () => {
    const result = validateStructure(
      createCanvas({
        elements: [
          {
            id: 'cmd-1',
            type: 'command',
            name: 'PlaceOrder',
            position: { x: 0, y: 0 },
          },
          {
            id: 'agg-1',
            type: 'aggregate',
            name: 'Order',
            position: { x: 100, y: 0 },
          },
        ],
        connections: [
          {
            id: 'conn-1',
            sourceId: 'cmd-1',
            targetId: 'agg-1',
            direction: 'sourceToTarget',
          },
        ],
      }),
    );

    expect(result).toContainEqual({
      elementId: 'cmd-1',
      message: 'Command "PlaceOrder" must have a transport protocol (REST or Async).',
    });
  });

  it('flags orphaned connections', () => {
    const result = validateStructure(
      createCanvas({
        connections: [
          {
            id: 'conn-1',
            sourceId: 'missing-source',
            targetId: 'missing-target',
            direction: 'sourceToTarget',
          },
        ],
      }),
    );

    expect(result).toContainEqual({
      elementId: 'conn-1',
      message: 'Connection source "missing-source" does not exist.',
    });
    expect(result).toContainEqual({
      elementId: 'conn-1',
      message: 'Connection target "missing-target" does not exist.',
    });
  });
});
