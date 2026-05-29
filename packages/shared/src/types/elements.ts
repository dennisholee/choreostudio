export type ElementType = 'domainEvent' | 'command' | 'policy' | 'aggregate' | 'readModel';
export type TransportProtocol = 'REST' | 'Async';
export type LifecycleState = 'draft' | 'inReview' | 'approved' | 'conflict';
export type MergeClass = 'semantic' | 'cosmetic';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Style {
  color?: string;
  collapsed?: boolean;
  zIndex?: number;
}

export interface ValidationState {
  structural: 'valid' | 'invalid';
  semantic: 'valid' | 'warning';
  messages: string[];
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  name: string;
  deprecated?: boolean;
  transport?: TransportProtocol;
  payloadSchema?: Record<string, unknown>;
  serviceBoundaryId?: string;
  validationState?: ValidationState;
  position: Position;
  size?: Size;
  style?: Style;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  direction: 'sourceToTarget' | 'targetToSource' | 'bidirectional';
  label?: string;
  waypoints?: Position[];
}

export interface ServiceBoundary {
  id: string;
  name: string;
  description?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface AnnotationEntry {
  id: string;
  parentId?: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface Annotation {
  id: string;
  elementId: string;
  resolved?: boolean;
  thread: AnnotationEntry[];
}
