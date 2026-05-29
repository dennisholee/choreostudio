import { describe, expect, it } from 'vitest';

import type { CanvasDocument } from '@choreostudio/shared';

import { validateCanvasDocument } from '../lib/canvas-validation.js';

function createCanvas(overrides: Partial<CanvasDocument> = {}): CanvasDocument {
  return {
    schemaVersion: '0.1.0',
    id: 'canvas-1',
    slug: 'order-flow',
    name: 'Order Flow',
    workspaceId: 'workspace-1',
    teamId: 'team-1',
    orgId: 'org-1',
    lifecycleState: 'draft',
    elements: [
      {
        id: 'command-1',
        type: 'command',
        name: 'PlaceOrder',
        transport: 'REST',
        position: { x: 0, y: 0 },
      },
      {
        id: 'aggregate-1',
        type: 'aggregate',
        name: 'Order',
        position: { x: 100, y: 0 },
      },
    ],
    connections: [
      {
        id: 'connection-1',
        sourceId: 'command-1',
        targetId: 'aggregate-1',
        direction: 'sourceToTarget',
      },
    ],
    serviceBoundaries: [],
    annotations: [],
    ...overrides,
  };
}

describe('validateCanvasDocument', () => {
  it('returns success for a valid canvas', () => {
    expect(validateCanvasDocument(createCanvas())).toEqual({
      valid: true,
      warnings: [],
    });
  });

  it('returns a structural 422 result for a command without an aggregate connection', () => {
    const result = validateCanvasDocument(
      createCanvas({
        elements: [
          {
            id: 'command-1',
            type: 'command',
            name: 'PlaceOrder',
            transport: 'REST',
            position: { x: 0, y: 0 },
          },
        ],
        connections: [],
      }),
    );

    expect(result).toMatchObject({
      valid: false,
      tier: 'structural',
      code: 'structural_validation_failed',
      elementIds: ['command-1'],
    });
  });

  it('returns semantic warnings for a cycle hint', () => {
    const result = validateCanvasDocument(
      createCanvas({
        elements: [
          {
            id: 'event-1',
            type: 'domainEvent',
            name: 'OrderPlaced',
            position: { x: 0, y: 0 },
          },
          {
            id: 'policy-1',
            type: 'policy',
            name: 'ReserveInventory',
            position: { x: 100, y: 0 },
          },
        ],
        connections: [
          {
            id: 'connection-1',
            sourceId: 'event-1',
            targetId: 'policy-1',
            direction: 'sourceToTarget',
          },
          {
            id: 'connection-2',
            sourceId: 'policy-1',
            targetId: 'event-1',
            direction: 'sourceToTarget',
          },
        ],
      }),
    );

    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error('Expected semantic warning result');
    }

    expect(result.warnings).toEqual(['Cycle hint detected: event-1 -> policy-1 -> event-1']);
  });
});
