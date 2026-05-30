import type { CanvasDocument } from '@choreostudio/shared';

export interface GeneratedContracts {
  /** One OpenAPI 3.1 doc per service boundary slug — only emitted for boundaries with REST commands */
  openapi: Record<string, Record<string, unknown>>;
  /** One AsyncAPI 2.6 doc per service boundary slug — only emitted for boundaries with Async commands or domain events */
  asyncapi: Record<string, Record<string, unknown>>;
  /** Elements that could not be compiled (no boundary assigned, missing transport, etc.) */
  errors: Array<{ elementId: string; reason: string }>;
}

export function generateContracts(canvas: CanvasDocument): GeneratedContracts {
  const openapi: Record<string, Record<string, unknown>> = {};
  const asyncapi: Record<string, Record<string, unknown>> = {};
  const errors: Array<{ elementId: string; reason: string }> = [];

  // Group contract-bearing elements by service boundary
  const restByBoundary = new Map<string, typeof canvas.elements>();
  const asyncByBoundary = new Map<string, typeof canvas.elements>();

  for (const el of canvas.elements) {
    if (el.type !== 'command' && el.type !== 'domainEvent') continue;

    const boundary = el.serviceBoundaryId ?? null;
    if (!boundary) {
      errors.push({ elementId: el.id, reason: 'Element has no service boundary assignment' });
      continue;
    }

    if (el.type === 'command' && !el.transport) {
      errors.push({ elementId: el.id, reason: 'Command has no transport protocol set' });
      continue;
    }

    if (el.type === 'command' && el.transport === 'REST') {
      if (!restByBoundary.has(boundary)) restByBoundary.set(boundary, []);
      restByBoundary.get(boundary)!.push(el);
    } else {
      // Async command or domain event → AsyncAPI
      if (!asyncByBoundary.has(boundary)) asyncByBoundary.set(boundary, []);
      asyncByBoundary.get(boundary)!.push(el);
    }
  }

  for (const [boundary, elements] of restByBoundary.entries()) {
    const paths: Record<string, unknown> = {};
    for (const el of elements) {
      const opId = el.name.replace(/\s+/g, '');
      paths[`/api/${boundary}/${opId.toLowerCase()}`] = {
        post: {
          operationId: opId,
          tags: [boundary],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: el.payloadSchema ?? { type: 'object' } } },
          },
          responses: {
            '202': { description: 'Accepted' },
            '422': { description: 'Validation error' },
          },
        },
      };
    }
    openapi[boundary] = { openapi: '3.1.0', info: { title: `${boundary} API`, version: '0.1.0' }, paths };
  }

  for (const [boundary, elements] of asyncByBoundary.entries()) {
    const channels: Record<string, unknown> = {};
    for (const el of elements) {
      const channelKey = `${boundary}.${el.name.replace(/\s+/g, '_').toLowerCase()}`;
      const opId = el.name.replace(/\s+/g, '');
      if (el.type === 'domainEvent') {
        channels[channelKey] = {
          publish: { operationId: opId, message: { payload: el.payloadSchema ?? { type: 'object' } } },
        };
      } else {
        channels[channelKey] = {
          subscribe: { operationId: opId, message: { payload: el.payloadSchema ?? { type: 'object' } } },
        };
      }
    }
    asyncapi[boundary] = { asyncapi: '2.6.0', info: { title: `${boundary} Events`, version: '0.1.0' }, channels };
  }

  return { openapi, asyncapi, errors };
}
