import type * as Y from 'yjs';

import { toSnapshot } from './canvas-yjs-bridge.js';

export interface InvariantResult {
  valid: boolean;
  violations: string[];
}

/** Check structural invariants on a merged Yjs canvas doc */
export function checkInvariants(doc: Y.Doc): InvariantResult {
  const { elements, connections } = toSnapshot(doc);
  const violations: string[] = [];
  const elementMap = new Map(elements.map((element) => [element.id, element]));

  for (const element of elements) {
    if (element.type !== 'command') {
      continue;
    }

    const hasAggregateOrPolicy = connections.some((connection) => {
      const isConnected = connection.sourceId === element.id || connection.targetId === element.id;
      if (!isConnected) {
        return false;
      }

      const otherElementId = connection.sourceId === element.id ? connection.targetId : connection.sourceId;
      const otherElement = elementMap.get(otherElementId);

      return otherElement?.type === 'aggregate' || otherElement?.type === 'policy';
    });

    if (!hasAggregateOrPolicy) {
      violations.push(`Command "${element.name}" (${element.id}) not connected to Aggregate or Policy`);
    }

    if (!element.transport) {
      violations.push(`Command "${element.name}" (${element.id}) missing transport protocol`);
    }
  }

  for (const connection of connections) {
    if (!elementMap.has(connection.sourceId)) {
      violations.push(`Connection "${connection.id}" has missing source "${connection.sourceId}"`);
    }

    if (!elementMap.has(connection.targetId)) {
      violations.push(`Connection "${connection.id}" has missing target "${connection.targetId}"`);
    }
  }

  return { valid: violations.length === 0, violations };
}
