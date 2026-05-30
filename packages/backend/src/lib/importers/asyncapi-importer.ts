import { randomUUID } from 'crypto';
import type { ImportResult, ImportedElement } from './types.js';

export function parseAsyncApi(content: string): ImportResult {
  let doc: Record<string, unknown>;
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed !== 'object' || parsed === null || !('asyncapi' in parsed))
      throw new Error('missing asyncapi field');
    doc = parsed as Record<string, unknown>;
  } catch (e: unknown) {
    const err = new Error(`AsyncAPI parse error: ${e instanceof Error ? e.message : String(e)}`);
    (err as NodeJS.ErrnoException).code = '400';
    throw err;
  }

  const elements: ImportedElement[] = [];
  const unresolved: ImportResult['unresolved'] = [];
  let x = 0, y = 0;

  const channels = (doc['channels'] ?? {}) as Record<string, Record<string, unknown>>;
  for (const [channel, channelObj] of Object.entries(channels)) {
    const boundary = channel.split('.')[0] ?? 'default';
    if (channelObj['publish']) {
      const op = channelObj['publish'] as Record<string, unknown>;
      const name = typeof op['operationId'] === 'string' ? op['operationId'] : channel;
      elements.push({ id: randomUUID(), type: 'domainEvent', name, serviceBoundary: boundary, position: { x, y } });
    } else if (channelObj['subscribe']) {
      const op = channelObj['subscribe'] as Record<string, unknown>;
      const name = typeof op['operationId'] === 'string' ? op['operationId'] : channel;
      elements.push({ id: randomUUID(), type: 'command', name, transport: 'Async', serviceBoundary: boundary, position: { x, y } });
    } else {
      unresolved.push({ source: channel, reason: 'Channel has neither publish nor subscribe operation' });
    }
    x += 120;
    if (x > 1200) { x = 0; y += 240; }
  }
  return { elements, connections: [], unresolved };
}
