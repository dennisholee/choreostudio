import type {
  Annotation,
  CanvasElement,
  Connection,
  LifecycleState,
  ServiceBoundary,
} from './elements';

export interface CanvasDocument {
  schemaVersion: '0.1.0';
  id: string;
  slug: string;
  name: string;
  workspaceId: string;
  teamId: string;
  orgId: string;
  lifecycleState: LifecycleState;
  elements: CanvasElement[];
  connections: Connection[];
  serviceBoundaries: ServiceBoundary[];
  annotations: Annotation[];
  createdAt?: string;
  updatedAt?: string;
}
