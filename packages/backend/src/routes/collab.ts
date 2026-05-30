import type { FastifyPluginAsync } from 'fastify';
import type { WebSocket } from 'ws';

import { query } from '../db/client.js';
import { validateCanvasDocument } from '../lib/canvas-validation.js';

// y-websocket server integration
// We lazy-load to avoid crashing if yjs isn't installed
async function getYWsServer() {
  try {
    const yws = await import('y-websocket/bin/utils.js' as string);
    return yws;
  } catch {
    return null;
  }
}

const collabRoutes: FastifyPluginAsync = async (fastify) => {
  const yws = await getYWsServer();

  fastify.get('/ws/canvas/:canvasId', { websocket: true }, async (socket: WebSocket, request) => {
    const { canvasId } = request.params as { canvasId: string };

    if (!yws) {
      socket.send(JSON.stringify({ type: 'error', message: 'CRDT collaboration requires y-websocket' }));
      socket.close();
      return;
    }

    // Use y-websocket's setupWSConnection for room-per-canvas multiplexing
    const roomName = `canvas:${canvasId}`;
    try {
      yws.setupWSConnection(socket, request.raw, { docName: roomName });
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'Failed to set up CRDT connection' }));
      socket.close();
      return;
    }

    // On disconnect, run structural validation and flag conflicts
    socket.on('close', async () => {
      try {
        const canvasResult = await query(
          'SELECT data FROM canvases WHERE id = $1 AND deleted_at IS NULL',
          [canvasId],
        );
        if (canvasResult.rowCount === 0) return;
        const { data } = canvasResult.rows[0] as { data: unknown };
        const canvasDoc = typeof data === 'string' ? JSON.parse(data) : data;
        const validation = validateCanvasDocument(canvasDoc);
        if (!validation.valid) {
          await query(
            "UPDATE canvases SET lifecycle_state = 'conflict', updated_at = now() WHERE id = $1",
            [canvasId],
          );
        }
      } catch {
        // Non-fatal
      }
    });
  });
};

export default collabRoutes;
