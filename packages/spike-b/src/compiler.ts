import type { CanvasElement, CanvasConnection, CompilationResult } from './types.js';
import { FragmentCache } from './fragment-cache.js';

const cache = new FragmentCache();

function generateOpenApiFragment(el: CanvasElement): Record<string, unknown> {
  const operationId = el.name.replace(/\s+/g, '');
  return {
    [`/api/${el.serviceBoundary ?? 'default'}/${operationId.toLowerCase()}`]: {
      post: {
        operationId,
        summary: `Execute ${el.name}`,
        tags: [el.serviceBoundary ?? 'default'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: el.payloadSchema ?? { type: 'object' },
            },
          },
        },
        responses: {
          '202': { description: 'Accepted' },
          '422': { description: 'Validation error' },
        },
      },
    },
  };
}

function generateAsyncApiFragment(el: CanvasElement): Record<string, unknown> {
  const channelName = `${el.serviceBoundary ?? 'default'}.${el.name.replace(/\s+/g, '_').toLowerCase()}`;
  const isEvent = el.type === 'domainEvent';
  return {
    [channelName]: {
      [isEvent ? 'publish' : 'subscribe']: {
        operationId: el.name.replace(/\s+/g, ''),
        message: {
          payload: el.payloadSchema ?? { type: 'object' },
        },
      },
    },
  };
}

export function compile(
  elements: CanvasElement[],
  connections: CanvasConnection[],
  dirtyIds?: Set<string>,
): CompilationResult {
  void connections;
  cache.resetHits();
  const start = performance.now();

  const openApiPaths: Record<string, unknown> = {};
  const asyncApiChannels: Record<string, unknown> = {};
  let dirtyCount = 0;

  for (const el of elements) {
    const isDirty = !dirtyIds || dirtyIds.has(el.id);
    const hash = cache.contentHash(el as Record<string, unknown>);

    if (el.type === 'command' && el.transport === 'REST') {
      const cached = cache.getWithTracking(el.id, hash);
      if (cached && !isDirty) {
        Object.assign(openApiPaths, cached);
      } else {
        dirtyCount++;
        const fragment = generateOpenApiFragment(el);
        cache.set(el.id, hash, fragment);
        Object.assign(openApiPaths, fragment);
      }
    } else if (el.type === 'command' && el.transport === 'Async') {
      const cached = cache.getWithTracking(el.id, hash);
      if (cached && !isDirty) {
        Object.assign(asyncApiChannels, cached);
      } else {
        dirtyCount++;
        const fragment = generateAsyncApiFragment(el);
        cache.set(el.id, hash, fragment);
        Object.assign(asyncApiChannels, fragment);
      }
    } else if (el.type === 'domainEvent') {
      const cached = cache.getWithTracking(el.id, hash);
      if (cached && !isDirty) {
        Object.assign(asyncApiChannels, cached);
      } else {
        dirtyCount++;
        const fragment = generateAsyncApiFragment(el);
        cache.set(el.id, hash, fragment);
        Object.assign(asyncApiChannels, fragment);
      }
    }
  }

  const openapi = {
    openapi: '3.1.0',
    info: { title: 'ChoreoStudio Generated API', version: '0.1.0' },
    paths: openApiPaths,
  };

  const asyncapi = {
    asyncapi: '2.6.0',
    info: { title: 'ChoreoStudio Generated Events', version: '0.1.0' },
    channels: asyncApiChannels,
  };

  return {
    openapi,
    asyncapi,
    durationMs: performance.now() - start,
    dirtyCount,
    cacheHits: cache.hitCount,
  };
}

export { cache };
