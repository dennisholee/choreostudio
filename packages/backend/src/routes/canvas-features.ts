import path from 'path';
import type { FastifyPluginAsync } from 'fastify';

import { query } from '../db/client.js';
import { BadRequestError, NotFoundError } from '../errors.js';
import { requireCanvasAccess, requireUserId } from '../lib/access.js';
import { gitCanvas } from '../lib/git-canvas.js';
import { requireObject, requireString } from '../lib/request.js';
import { generateContracts } from '../lib/contract-generator.js';
import { reviewCanvas } from '../lib/ai-reviewer.js';
import type { CanvasDocument } from '@choreostudio/shared';
import { validateCanvasDocument } from '../lib/canvas-validation.js';

const LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  draft:    ['inReview'],
  inReview: ['approved', 'draft'],
  approved: ['draft'],
  conflict: ['draft'],
};

export const lifecycleRoutes: FastifyPluginAsync = async (fastify) => {
  // PATCH /canvases/:canvasId/lifecycle — transition lifecycle state
  fastify.patch('/canvases/:canvasId/lifecycle', async (request, reply) => {
    const userId = requireUserId(request);
    const { canvasId } = request.params as { canvasId: string };
    const body = requireObject(request.body);
    const targetState = requireString(body, 'state');
    const validStates = ['draft', 'inReview', 'approved', 'conflict'];
    if (!validStates.includes(targetState)) throw new BadRequestError(`Invalid state. Must be one of: ${validStates.join(', ')}`);

    // reviewer+ can move to inReview, owner/editor can approve/revert
    const minimumRole = targetState === 'approved' ? 'editor' : 'reviewer';
    const access = await requireCanvasAccess(userId, canvasId, minimumRole);

    const current = await query('SELECT lifecycle_state, data FROM canvases WHERE id = $1 AND deleted_at IS NULL', [canvasId]);
    if (current.rowCount === 0) throw new NotFoundError('Canvas not found');
    const { lifecycle_state: currentState, data } = current.rows[0] as { lifecycle_state: string; data: unknown };
    const allowed = LIFECYCLE_TRANSITIONS[currentState] ?? [];
    if (!allowed.includes(targetState)) {
      throw new BadRequestError(`Invalid transition: ${currentState} → ${targetState}. Allowed: ${allowed.join(', ')}`);
    }

    // If transitioning to approved, run validation
    if (targetState === 'approved') {
      const canvasDoc = typeof data === 'string' ? JSON.parse(data) : data;
      const validationResult = validateCanvasDocument(canvasDoc);
      if (!validationResult.valid) {
        throw new BadRequestError(`Canvas cannot be approved with validation errors: ${validationResult.errors.map((e: { message: string }) => e.message).join('; ')}`);
      }
    }

    await query('UPDATE canvases SET lifecycle_state = $1, updated_at = now() WHERE id = $2', [targetState, canvasId]);
    if (targetState === 'approved') {
      await gitCanvas.promoteToRelease(canvasId).catch(() => {}); // non-blocking
    }
    return { canvasId, lifecycleState: targetState };
  });

  // POST /canvases/:canvasId/generate — generate OpenAPI + AsyncAPI contracts
  fastify.post('/canvases/:canvasId/generate', async (request, reply) => {
    const userId = requireUserId(request);
    const { canvasId } = request.params as { canvasId: string };
    await requireCanvasAccess(userId, canvasId, 'reviewer');

    const result = await query('SELECT data FROM canvases WHERE id = $1 AND deleted_at IS NULL', [canvasId]);
    if (result.rowCount === 0) throw new NotFoundError('Canvas not found');
    const { data } = result.rows[0] as { data: unknown };
    const canvasDoc: CanvasDocument = typeof data === 'string' ? JSON.parse(data) : data;
    const contracts = generateContracts(canvasDoc);
    return reply.status(200).send(contracts);
  });

  // PATCH /canvases/:canvasId/deprecate — mark canvas as deprecated (owner only)
  fastify.patch('/canvases/:canvasId/deprecate', async (request, reply) => {
    const userId = requireUserId(request);
    const { canvasId } = request.params as { canvasId: string };
    await requireCanvasAccess(userId, canvasId, 'owner');

    const body = requireObject(request.body);
    const deprecated = body['deprecated'] !== false;
    const deprecationReason = typeof body['reason'] === 'string' ? body['reason'] : '';

    // Propagate deprecated flag to all elements
    const res = await query('SELECT data FROM canvases WHERE id = $1 AND deleted_at IS NULL', [canvasId]);
    if (res.rowCount === 0) throw new NotFoundError('Canvas not found');
    const { data } = res.rows[0] as { data: unknown };
    const canvasDoc: CanvasDocument = typeof data === 'string' ? JSON.parse(data) : data;
    if (deprecated) {
      canvasDoc.elements = canvasDoc.elements.map(el => ({ ...el, deprecated: true }));
    }
    await query(
      'UPDATE canvases SET data = $1, updated_at = now() WHERE id = $2',
      [JSON.stringify(canvasDoc), canvasId],
    );
    return { canvasId, deprecated, reason: deprecationReason };
  });

  // POST /canvases/:canvasId/review — run AI rule-based reviewer
  fastify.post('/canvases/:canvasId/review', async (request, reply) => {
    const userId = requireUserId(request);
    const { canvasId } = request.params as { canvasId: string };
    await requireCanvasAccess(userId, canvasId, 'reviewer');

    const result = await query('SELECT data FROM canvases WHERE id = $1 AND deleted_at IS NULL', [canvasId]);
    if (result.rowCount === 0) throw new NotFoundError('Canvas not found');
    const { data } = result.rows[0] as { data: unknown };
    const canvasDoc: CanvasDocument = typeof data === 'string' ? JSON.parse(data) : data;
    const findings = reviewCanvas(canvasDoc);
    return reply.status(200).send({ canvasId, findings });
  });
};
