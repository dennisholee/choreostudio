export type ElementType = 'domainEvent' | 'command' | 'policy' | 'aggregate' | 'readModel';
export type Transport = 'REST' | 'Async';

export interface CanvasElement {
  id: string;
  type: ElementType;
  name: string;
  transport?: Transport;
  serviceBoundary?: string;
  payloadSchema?: Record<string, unknown>;
}

export interface CanvasConnection {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface CompilationResult {
  openapi: Record<string, unknown>;
  asyncapi: Record<string, unknown>;
  durationMs: number;
  dirtyCount: number;
  cacheHits: number;
}
