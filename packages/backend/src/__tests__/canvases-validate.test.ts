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
  it('returns 200-style success for a valid canvas with no warnings', () => {
    expect(validateCanvasDocument(createCanvas())).toEqual({
      valid: true,
      warnings: [],
    });
  });

  it('returns a structural failure payload for a command without an aggregate connection', () => {
    expect(
      validateCanvasDocument(
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
      ),
    ).toEqual({
      valid: false,
      tier: 'structural',
      code: 'structural_validation_failed',
      elementIds: ['command-1'],
      message: 'Command "PlaceOrder" must be connected to an Aggregate or Policy.',
    });
  });

  it('returns semantic warnings for a cycle hint while keeping the canvas valid', () => {
    expect(
      validateCanvasDocument(
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
      ),
    ).toEqual({
      valid: true,
      warnings: ['Cycle hint detected: event-1 -> policy-1 -> event-1'],
    });
  });

  it('returns the invalid schema structural failure payload for malformed canvas payloads', () => {
    expect(validateCanvasDocument({})).toMatchObject({
      valid: false,
      tier: 'structural',
      code: 'invalid_canvas_schema',
      elementIds: [],
      message: expect.stringContaining('/schemaVersion must be 0.1.0'),
    });
  });

  it('prioritizes structural failures over semantic warnings', () => {
    expect(
      validateCanvasDocument(
        createCanvas({
          elements: [
            {
              id: 'command-1',
              type: 'command',
              name: 'PlaceOrder',
              transport: 'REST',
              position: { x: 0, y: 0 },
            },
            {
              id: 'event-1',
              type: 'domainEvent',
              name: 'OrderPlaced',
              position: { x: 100, y: 0 },
            },
            {
              id: 'policy-1',
              type: 'policy',
              name: 'ReserveInventory',
              position: { x: 200, y: 0 },
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
      ),
    ).toEqual({
      valid: false,
      tier: 'structural',
      code: 'structural_validation_failed',
      elementIds: ['command-1'],
      message: 'Command "PlaceOrder" must be connected to an Aggregate or Policy.',
    });
  });
});
