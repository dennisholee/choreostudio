import type { CanvasDocument } from '../types/canvas';

export interface StructuralViolation {
  elementId: string;
  message: string;
}

/**
 * Structural validation — hard-block tier (PRD §5.4).
 * Fires on committed canvas change (not mid-drag).
 * Returns violations; caller decides whether to block or surface as CONFLICT state.
 */
export function validateStructure(doc: CanvasDocument): StructuralViolation[] {
  const violations: StructuralViolation[] = [];
  const elementMap = new Map(doc.elements.map((element) => [element.id, element]));

  for (const element of doc.elements) {
    if (element.type !== 'command') {
      continue;
    }

    const hasConnection = doc.connections.some((connection) => {
      const isConnected = connection.sourceId === element.id || connection.targetId === element.id;
      if (!isConnected) {
        return false;
      }

      const otherElementId = connection.sourceId === element.id ? connection.targetId : connection.sourceId;
      const otherElement = elementMap.get(otherElementId);

      return otherElement?.type === 'aggregate' || otherElement?.type === 'policy';
    });

    if (!hasConnection) {
      violations.push({
        elementId: element.id,
        message: `Command "${element.name}" must be connected to an Aggregate or Policy.`,
      });
    }

    if (!element.transport) {
      violations.push({
        elementId: element.id,
        message: `Command "${element.name}" must have a transport protocol (REST or Async).`,
      });
    }
  }

  for (const connection of doc.connections) {
    if (!elementMap.has(connection.sourceId)) {
      violations.push({
        elementId: connection.id,
        message: `Connection source "${connection.sourceId}" does not exist.`,
      });
    }

    if (!elementMap.has(connection.targetId)) {
      violations.push({
        elementId: connection.id,
        message: `Connection target "${connection.targetId}" does not exist.`,
      });
    }
  }

  return violations;
}
