import { randomUUID } from 'crypto';
import type { ImportResult, ImportedElement } from './types.js';

function extractTagAttrs(xml: string, tagName: string): Array<{ id: string; name: string }> {
  const results: Array<{ id: string; name: string }> = [];
  const re = new RegExp(`<(?:bpmn2?:|semantic:)?${tagName}[^>]+>`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const tag = m[0];
    const id = /\bid=["']([^"']+)["']/.exec(tag)?.[1] ?? randomUUID();
    const name = /\bname=["']([^"']*)["']/.exec(tag)?.[1] ?? '';
    results.push({ id, name });
  }
  const seen = new Set<string>();
  return results.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
}

export function parseBpmn(content: string): ImportResult {
  if (!content.includes('process') && !content.includes('bpmn')) {
    const err = new Error('BPMN parse error: does not appear to be a BPMN 2.0 file');
    (err as NodeJS.ErrnoException).code = '400';
    throw err;
  }

  const elements: ImportedElement[] = [];
  const unresolved: ImportResult['unresolved'] = [];
  let x = 0, y = 0;
  const bump = () => { x += 120; if (x > 1200) { x = 0; y += 240; } };

  for (const task of [
    ...extractTagAttrs(content, 'task'),
    ...extractTagAttrs(content, 'serviceTask'),
    ...extractTagAttrs(content, 'userTask'),
    ...extractTagAttrs(content, 'manualTask'),
  ]) {
    elements.push({ id: randomUUID(), type: 'command', name: task.name || 'UnnamedTask',
      transport: 'REST', serviceBoundary: 'default', position: { x, y },
      importNote: `Imported from BPMN task ${task.id}` });
    bump();
  }
  for (const ev of [
    ...extractTagAttrs(content, 'startEvent'),
    ...extractTagAttrs(content, 'endEvent'),
    ...extractTagAttrs(content, 'intermediateThrowEvent'),
    ...extractTagAttrs(content, 'intermediateCatchEvent'),
  ]) {
    elements.push({ id: randomUUID(), type: 'domainEvent', name: ev.name || 'UnnamedEvent',
      serviceBoundary: 'default', position: { x, y },
      importNote: `Imported from BPMN event ${ev.id}` });
    bump();
  }
  for (const gw of [
    ...extractTagAttrs(content, 'exclusiveGateway'),
    ...extractTagAttrs(content, 'inclusiveGateway'),
    ...extractTagAttrs(content, 'parallelGateway'),
    ...extractTagAttrs(content, 'eventBasedGateway'),
  ]) {
    elements.push({ id: randomUUID(), type: 'policy', name: gw.name || 'Gateway',
      serviceBoundary: 'default', position: { x, y },
      importNote: `Imported from BPMN gateway ${gw.id} — mapping may be ambiguous` });
    unresolved.push({ source: gw.id, reason: 'BPMN gateway mapped to Policy — verify business intent' });
    bump();
  }
  return { elements, connections: [], unresolved };
}
