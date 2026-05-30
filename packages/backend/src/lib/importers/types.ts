import { randomUUID } from 'crypto';

export interface ImportedElement {
  id: string;
  type: string;
  name: string;
  transport?: string;
  serviceBoundary?: string;
  position: { x: number; y: number };
  importNote?: string;
}

export interface ImportedConnection { id: string; sourceId: string; targetId: string; }
export interface ImportResult {
  elements: ImportedElement[];
  connections: ImportedConnection[];
  unresolved: Array<{ source: string; reason: string }>;
}
