import { validateCanvas, validateStructure, type CanvasDocument } from '@choreostudio/shared';

import { UnprocessableEntityError } from '../errors.js';

export interface CanvasValidationSuccess {
  valid: true;
  warnings: string[];
}

export interface CanvasValidationFailure {
  valid: false;
  tier: 'structural';
  code: string;
  elementIds: string[];
  message: string;
}

export type CanvasValidationResult = CanvasValidationSuccess | CanvasValidationFailure;

function getConnectionTargets(connection: CanvasDocument['connections'][number]): Array<[string, string]> {
  if (connection.direction === 'targetToSource') {
    return [[connection.targetId, connection.sourceId]];
  }

  if (connection.direction === 'bidirectional') {
    return [
      [connection.sourceId, connection.targetId],
      [connection.targetId, connection.sourceId],
    ];
  }

  return [[connection.sourceId, connection.targetId]];
}

function findSemanticWarnings(doc: CanvasDocument): string[] {
  const adjacency = new Map<string, string[]>();
  const path: string[] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const warnings = new Set<string>();

  for (const element of doc.elements) {
    adjacency.set(element.id, []);
  }

  for (const connection of doc.connections) {
    for (const [from, to] of getConnectionTargets(connection)) {
      adjacency.get(from)?.push(to);
    }
  }

  const visit = (nodeId: string): void => {
    visited.add(nodeId);
    inStack.add(nodeId);
    path.push(nodeId);

    for (const nextId of adjacency.get(nodeId) ?? []) {
      if (!visited.has(nextId)) {
        visit(nextId);
        continue;
      }

      if (inStack.has(nextId)) {
        const cycleStart = path.indexOf(nextId);
        const cycleIds = [...path.slice(cycleStart), nextId];
        warnings.add(`Cycle hint detected: ${cycleIds.join(' -> ')}`);
      }
    }

    path.pop();
    inStack.delete(nodeId);
  };

  for (const nodeId of adjacency.keys()) {
    if (!visited.has(nodeId)) {
      visit(nodeId);
    }
  }

  return [...warnings];
}

export function validateCanvasDocument(input: unknown): CanvasValidationResult {
  const canvasResult = validateCanvas(input);
  if (!canvasResult.valid) {
    return {
      valid: false,
      tier: 'structural',
      code: 'invalid_canvas_schema',
      elementIds: [],
      message: canvasResult.errors.join('; '),
    };
  }

  const document = input as CanvasDocument;
  const structuralViolations = validateStructure(document);
  if (structuralViolations.length > 0) {
    return {
      valid: false,
      tier: 'structural',
      code: 'structural_validation_failed',
      elementIds: [...new Set(structuralViolations.map((violation) => violation.elementId))],
      message: structuralViolations.map((violation) => violation.message).join('; '),
    };
  }

  return {
    valid: true,
    warnings: findSemanticWarnings(document),
  };
}

export function assertCanvasDocumentValid(input: unknown): CanvasValidationSuccess {
  const result = validateCanvasDocument(input);
  if (!result.valid) {
    throw new UnprocessableEntityError(result.message, result.code, {
      elementIds: result.elementIds,
      tier: result.tier,
    });
  }

  return result;
}
