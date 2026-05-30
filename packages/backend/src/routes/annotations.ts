import type { FastifyPluginAsync } from 'fastify';
import type { QueryResultRow } from 'pg';

import { query } from '../db/client.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors.js';
import { requireCanvasAccess, requireUserId, roleAtLeast } from '../lib/access.js';
import { requireObject, requireString } from '../lib/request.js';

interface AnnotationRow extends QueryResultRow {
  id: string;
  canvasId: string;
  elementId: string;
  parentId: string | null;
  authorId: string;
  message: string;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

const annotationsRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /canvases/:canvasId/annotations — create annotation
  fastify.post('/canvases/:canvasId/annotations', async (request, reply) => {
    const userId = requireUserId(request);
    const { canvasId } = request.params as { canvasId: string };
    await requireCanvasAccess(userId, canvasId, 'reviewer');

    const body = requireObject(request.body);
    const elementId = requireString(body, 'elementId');
    const message = requireString(body, 'message');
    const parentId = typeof body['parentId'] === 'string' ? body['parentId'] : null;

    if (parentId) {
      const parent = await query('SELECT id FROM annotations WHERE id = $1 AND canvas_id = $2', [parentId, canvasId]);
      if (parent.rowCount === 0) throw new NotFoundError('Parent annotation not found');
    }

    const result = await query<AnnotationRow>(
      `INSERT INTO annotations (canvas_id, element_id, parent_id, author_id, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, canvas_id AS "canvasId", element_id AS "elementId", parent_id AS "parentId",
                 author_id AS "authorId", message, resolved, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [canvasId, elementId, parentId, userId, message],
    );
    return reply.status(201).send(result.rows[0]);
  });

  // GET /canvases/:canvasId/annotations[?elementId=]
  fastify.get('/canvases/:canvasId/annotations', async (request) => {
    const userId = requireUserId(request);
    const { canvasId } = request.params as { canvasId: string };
    await requireCanvasAccess(userId, canvasId, 'viewer');

    const { elementId } = request.query as { elementId?: string };
    const result = await query<AnnotationRow>(
      `SELECT id, canvas_id AS "canvasId", element_id AS "elementId", parent_id AS "parentId",
              author_id AS "authorId", message, resolved, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM annotations
       WHERE canvas_id = $1 AND deleted_at IS NULL ${elementId ? 'AND element_id = $2' : ''}
       ORDER BY created_at ASC`,
      elementId ? [canvasId, elementId] : [canvasId],
    );
    return result.rows;
  });

  // PATCH /canvases/:canvasId/annotations/:annotationId — resolve/unresolve
  fastify.patch('/canvases/:canvasId/annotations/:annotationId', async (request) => {
    const userId = requireUserId(request);
    const { canvasId, annotationId } = request.params as { canvasId: string; annotationId: string };
    const access = await requireCanvasAccess(userId, canvasId, 'reviewer');

    const body = requireObject(request.body);
    if (typeof body['resolved'] !== 'boolean') throw new BadRequestError('resolved (boolean) required');

    const result = await query<AnnotationRow>(
      `UPDATE annotations SET resolved = $1, updated_at = now()
       WHERE id = $2 AND canvas_id = $3 AND deleted_at IS NULL
       RETURNING id, canvas_id AS "canvasId", element_id AS "elementId", parent_id AS "parentId",
                 author_id AS "authorId", message, resolved, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [body['resolved'], annotationId, canvasId],
    );
    if (result.rowCount === 0) throw new NotFoundError('Annotation not found');
    return result.rows[0];
  });

  // DELETE /canvases/:canvasId/annotations/:annotationId — soft-delete
  fastify.delete('/canvases/:canvasId/annotations/:annotationId', async (request, reply) => {
    const userId = requireUserId(request);
    const { canvasId, annotationId } = request.params as { canvasId: string; annotationId: string };
    const access = await requireCanvasAccess(userId, canvasId, 'reviewer');

    const ann = await query('SELECT author_id FROM annotations WHERE id = $1 AND canvas_id = $2 AND deleted_at IS NULL', [annotationId, canvasId]);
    if (ann.rowCount === 0) throw new NotFoundError('Annotation not found');
    // Only author or owner can delete
    const row = ann.rows[0] as { author_id: string };
    if (row.author_id !== userId && !roleAtLeast(access.role, 'owner')) {
      throw new ForbiddenError('Only the annotation author or workspace owner can delete annotations');
    }

    await query('UPDATE annotations SET deleted_at = now() WHERE id = $1', [annotationId]);
    return reply.status(204).send();
  });
};

export default annotationsRoutes;
