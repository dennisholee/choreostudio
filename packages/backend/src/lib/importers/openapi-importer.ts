import { randomUUID } from 'crypto';
import yaml from 'js-yaml';
import type { ImportResult, ImportedElement, ImportedConnection } from './types.js';

function parseContent(content: string): unknown {
  try { return JSON.parse(content); } catch { /* fall through to YAML */ }
  return yaml.load(content);
}

export function parseOpenApi(content: string): ImportResult {
  let doc: Record<string, unknown>;
  try {
    const parsed = parseContent(content);
    if (typeof parsed !== 'object' || parsed === null) throw new Error('not an object');
    doc = parsed as Record<string, unknown>;
    if (!('openapi' in doc) && !('swagger' in doc)) throw new Error('missing openapi/swagger field');
  } catch (e: unknown) {
    const err = new Error(`OpenAPI parse error: ${e instanceof Error ? e.message : String(e)}`);
    (err as NodeJS.ErrnoException).code = '400';
    throw err;
  }

  const elements: ImportedElement[] = [];
  const connections: ImportedConnection[] = [];
  const unresolved: ImportResult['unresolved'] = [];
  let x = 0, y = 0;
  const boundaryAggs = new Map<string, string>();

  const paths = (doc['paths'] ?? {}) as Record<string, Record<string, unknown>>;
  for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const op = pathItem[method] as Record<string, unknown> | undefined;
      if (!op) continue;
      const opTags = op['tags'] as string[] | undefined;
      const boundary = opTags?.[0] ?? 'default';
      const name = typeof op['operationId'] === 'string' ? op['operationId'] : `${method.toUpperCase()} ${path}`;
      const cmdId = randomUUID();
      elements.push({ id: cmdId, type: 'command', name, transport: 'REST', serviceBoundary: boundary, position: { x, y } });
      x += 120;
      if (!boundaryAggs.has(boundary)) {
        const aggId = randomUUID();
        boundaryAggs.set(boundary, aggId);
        const aggName = `${boundary.charAt(0).toUpperCase()}${boundary.slice(1)}Service`;
        elements.push({ id: aggId, type: 'aggregate', name: aggName, serviceBoundary: boundary, position: { x, y: y + 150 } });
        x += 120;
      }
      connections.push({ id: randomUUID(), sourceId: cmdId, targetId: boundaryAggs.get(boundary)! });
      if (x > 1200) { x = 0; y += 300; }
    }
  }
  return { elements, connections, unresolved };
}
