import type { FastifyPluginAsync } from 'fastify';

import { query } from '../db/client.js';
import { requireUserId } from '../lib/access.js';

const telemetryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/telemetry', async (request, reply) => {
    const userId = requireUserId(request);
    const body = request.body as Record<string, unknown>;
    const eventName = typeof body['event'] === 'string' ? body['event'] : 'unknown';
    const canvasId = typeof body['canvasId'] === 'string' ? body['canvasId'] : null;
    const workspaceId = typeof body['workspaceId'] === 'string' ? body['workspaceId'] : null;
    const properties = typeof body['properties'] === 'object' && body['properties'] !== null ? body['properties'] : {};

    // Fire-and-forget — never block the caller
    query(
      `INSERT INTO telemetry_events (event_name, user_id, canvas_id, workspace_id, properties)
       VALUES ($1, $2, $3, $4, $5)`,
      [eventName, userId, canvasId, workspaceId, JSON.stringify(properties)],
    ).catch(() => {});

    return reply.status(202).send({ received: true });
  });
};

export default telemetryRoutes;
