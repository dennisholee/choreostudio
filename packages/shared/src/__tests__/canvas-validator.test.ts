import { describe, expect, it } from 'vitest';

import { validateCanvas } from '../validators/canvas-validator';

const minimalValid = {
  schemaVersion: '0.1.0',
  id: '550e8400-e29b-41d4-a716-446655440000',
  slug: 'test-canvas',
  name: 'Test Canvas',
  workspaceId: 'ws-1',
  teamId: 'team-1',
  orgId: 'org-1',
  lifecycleState: 'draft',
  elements: [],
  connections: [],
  serviceBoundaries: [],
  annotations: [],
};

describe('validateCanvas', () => {
  it('accepts a minimal valid canvas', () => {
    expect(validateCanvas(minimalValid).valid).toBe(true);
  });

  it('rejects missing required fields', () => {
    const { schemaVersion: _schemaVersion, ...noVersion } = minimalValid;
    const result = validateCanvas(noVersion);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid lifecycleState', () => {
    const result = validateCanvas({ ...minimalValid, lifecycleState: 'published' });

    expect(result.valid).toBe(false);
  });

  it('rejects invalid element type', () => {
    const result = validateCanvas({
      ...minimalValid,
      elements: [{ id: 'e1', type: 'unknownType', name: 'Bad', position: { x: 0, y: 0 } }],
    });

    expect(result.valid).toBe(false);
  });

  it('accepts a canvas with a full element', () => {
    const result = validateCanvas({
      ...minimalValid,
      elements: [
        {
          id: 'e1',
          type: 'command',
          name: 'PlaceOrder',
          transport: 'REST',
          serviceBoundaryId: 'sb1',
          position: { x: 100, y: 200 },
          size: { width: 150, height: 50 },
          style: { color: '#4A90D9', collapsed: false, zIndex: 1 },
        },
      ],
      serviceBoundaries: [{ id: 'sb1', name: 'Order Service' }],
    });

    expect(result.valid).toBe(true);
  });
});
