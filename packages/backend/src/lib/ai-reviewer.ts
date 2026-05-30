import type { CanvasDocument, CanvasElement } from '@choreostudio/shared';

export type AntiPatternCode =
  | 'GOD_AGGREGATE'
  | 'CHATTY_COMMANDS'
  | 'MISSING_POLICY_FOR_EVENT_CHAIN'
  | 'DIRECT_EVENT_TO_COMMAND'
  | 'UNNAMED_ELEMENT'
  | 'ORPHANED_AGGREGATE'
  | 'DEEP_POLICY_CHAIN';

export interface AntiPatternFinding {
  code: AntiPatternCode;
  severity: 'warning' | 'info';
  elementIds: string[];
  message: string;
  suggestion: string;
}

export function reviewCanvas(canvas: CanvasDocument): AntiPatternFinding[] {
  const findings: AntiPatternFinding[] = [];
  const elements = canvas.elements;
  const connections = canvas.connections;

  const byId = new Map(elements.map(e => [e.id, e]));
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  elements.forEach(e => { inDegree.set(e.id, 0); outDegree.set(e.id, 0); });
  connections.forEach(c => {
    outDegree.set(c.sourceId, (outDegree.get(c.sourceId) ?? 0) + 1);
    inDegree.set(c.targetId, (inDegree.get(c.targetId) ?? 0) + 1);
  });

  // GOD_AGGREGATE: aggregate with >5 incoming command connections
  for (const el of elements.filter(e => e.type === 'aggregate')) {
    const incoming = connections.filter(c => c.targetId === el.id && byId.get(c.sourceId)?.type === 'command').length;
    if (incoming > 5) {
      findings.push({
        code: 'GOD_AGGREGATE',
        severity: 'warning',
        elementIds: [el.id],
        message: `Aggregate "${el.name}" has ${incoming} commands — may be a God Aggregate.`,
        suggestion: 'Consider splitting into smaller bounded contexts with their own aggregates.',
      });
    }
  }

  // CHATTY_COMMANDS: service boundary with >10 REST commands
  const restByBoundary = new Map<string, CanvasElement[]>();
  for (const el of elements.filter(e => e.type === 'command' && e.transport === 'REST' && e.serviceBoundaryId)) {
    const b = el.serviceBoundaryId!;
    if (!restByBoundary.has(b)) restByBoundary.set(b, []);
    restByBoundary.get(b)!.push(el);
  }
  for (const [boundary, cmds] of restByBoundary.entries()) {
    if (cmds.length > 10) {
      findings.push({
        code: 'CHATTY_COMMANDS',
        severity: 'warning',
        elementIds: cmds.map(c => c.id),
        message: `Service boundary "${boundary}" has ${cmds.length} REST commands — possible chatty interface.`,
        suggestion: 'Consider grouping related commands into coarser-grained operations.',
      });
    }
  }

  // DIRECT_EVENT_TO_COMMAND: DomainEvent → Command connection without a Policy in between
  const eventIds = new Set(elements.filter(e => e.type === 'domainEvent').map(e => e.id));
  const commandIds = new Set(elements.filter(e => e.type === 'command').map(e => e.id));
  for (const conn of connections) {
    if (eventIds.has(conn.sourceId) && commandIds.has(conn.targetId)) {
      findings.push({
        code: 'DIRECT_EVENT_TO_COMMAND',
        severity: 'warning',
        elementIds: [conn.sourceId, conn.targetId],
        message: `Domain Event "${byId.get(conn.sourceId)?.name}" connects directly to Command "${byId.get(conn.targetId)?.name}" without a Policy.`,
        suggestion: 'Add a Policy/Saga to mediate event→command reactions to make business rules explicit.',
      });
    }
  }

  // MISSING_POLICY: event with outgoing connections but no policy in any outgoing path
  for (const el of elements.filter(e => e.type === 'domainEvent')) {
    const outConns = connections.filter(c => c.sourceId === el.id);
    if (outConns.length === 0) continue; // terminal event, OK
    const hasPolicy = outConns.some(c => byId.get(c.targetId)?.type === 'policy');
    if (!hasPolicy && outConns.some(c => byId.get(c.targetId)?.type === 'command')) {
      // Already caught by DIRECT_EVENT_TO_COMMAND
    }
  }

  // ORPHANED_AGGREGATE: aggregate with no incoming command connections
  for (const el of elements.filter(e => e.type === 'aggregate')) {
    const hasCommand = connections.some(c => c.targetId === el.id && byId.get(c.sourceId)?.type === 'command');
    if (!hasCommand && elements.length > 1) {
      findings.push({
        code: 'ORPHANED_AGGREGATE',
        severity: 'info',
        elementIds: [el.id],
        message: `Aggregate "${el.name}" has no incoming Command connections.`,
        suggestion: 'Every aggregate should be reachable via at least one command.',
      });
    }
  }

  // UNNAMED_ELEMENT: elements with empty or placeholder names
  for (const el of elements) {
    if (!el.name || el.name.trim() === '' || /^(unnamed|untitled|new\s)/i.test(el.name)) {
      findings.push({
        code: 'UNNAMED_ELEMENT',
        severity: 'info',
        elementIds: [el.id],
        message: `Element (${el.type}) has a placeholder name "${el.name}".`,
        suggestion: 'Use ubiquitous language — names should reflect your domain vocabulary.',
      });
    }
  }

  // DEEP_POLICY_CHAIN: policy → policy → policy chains of depth > 3
  function policyChainDepth(id: string, visited = new Set<string>()): number {
    if (visited.has(id)) return 0;
    visited.add(id);
    const nextPolicies = connections
      .filter(c => c.sourceId === id)
      .map(c => c.targetId)
      .filter(tid => byId.get(tid)?.type === 'policy');
    if (nextPolicies.length === 0) return 1;
    return 1 + Math.max(...nextPolicies.map(pid => policyChainDepth(pid, new Set(visited))));
  }
  for (const el of elements.filter(e => e.type === 'policy')) {
    const depth = policyChainDepth(el.id);
    if (depth > 3) {
      findings.push({
        code: 'DEEP_POLICY_CHAIN',
        severity: 'warning',
        elementIds: [el.id],
        message: `Policy "${el.name}" is part of a chain ${depth} levels deep.`,
        suggestion: 'Deep saga chains are hard to debug. Consider extracting a higher-level orchestration policy.',
      });
    }
  }

  return findings;
}
