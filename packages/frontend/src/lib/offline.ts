import { IndexeddbPersistence } from 'y-indexeddb';
import type { Y } from 'yjs';
import type { YjsCanvasHandle } from './yjs-canvas.js';

const OFFLINE_OP_THRESHOLD = 50; // from shared constants

export interface OfflineState {
  isOffline: boolean;
  pendingOps: number;
  needsBranchMerge: boolean;
}

export function createOfflinePersistence(
  canvasId: string,
  handle: YjsCanvasHandle,
  onStateChange: (state: OfflineState) => void,
): { destroy: () => void } {
  const dbName = `choreostudio-canvas-${canvasId}`;
  const persistence = new IndexeddbPersistence(dbName, handle.doc);

  let isOffline = false;
  let opsWhileOffline = 0;

  handle.provider.on('status', ({ status }: { status: string }) => {
    if (status === 'disconnected') {
      isOffline = true;
    } else if (status === 'connected') {
      isOffline = false;
      opsWhileOffline = 0;
      onStateChange({ isOffline: false, pendingOps: 0, needsBranchMerge: false });
    }
  });

  handle.doc.on('update', () => {
    if (isOffline) {
      opsWhileOffline++;
      const needsBranchMerge = opsWhileOffline > OFFLINE_OP_THRESHOLD;
      onStateChange({ isOffline: true, pendingOps: opsWhileOffline, needsBranchMerge });
    }
  });

  return {
    destroy() {
      persistence.destroy();
    },
  };
}
