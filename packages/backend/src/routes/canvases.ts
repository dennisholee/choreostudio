import type { FastifyPluginAsync } from 'fastify';
import type { QueryResultRow } from 'pg';

import { query } from '../db/client.js';
import { NotFoundError } from '../errors.js';
import { requireCanvasAccess, requireUserId, requireWorkspaceAccess } from '../lib/access.js';
import { validateCanvasDocument } from '../lib/canvas-validation.js';
import { assertSlug, requireObject, requireString } from '../lib/request.js';

interface CanvasRow extends QueryResultRow {
  id: string;
  orgId: string;
  teamId: string;
  workspaceId: string;
  slug: string;
  name: string;
  lifecycleState: string;
  gitBranch: string;
  schemaVersion: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const canvasSelect = `
  SELECT
    c.id,
    t.org_id AS "orgId",
    w.team_id AS "teamId",
    c.workspace_id AS "workspaceId",
    c.slug,
    c.name,
    c.lifecycle_state AS "lifecycleState",
    c.git_branch AS "gitBranch",
    c.schema_version AS "schemaVersion",
    c.created_by AS "createdBy",
    c.created_at AS "createdAt",
    c.updated_at AS "updatedAt"
  FROM canvases c
  JOIN workspaces w ON w.id = c.workspace_id
  JOIN teams t ON t.id = w.team_id
`;

const canvasesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/workspaces/:workspaceId/canvases', async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const userId = requireUserId(request);
    const hierarchy = await requireWorkspaceAccess(userId, workspaceId);

    const body = requireObject(request.body);
    const name = requireString(body, 'name');
    const slug = requireString(body, 'slug');
    assertSlug(slug);

    const result = await query<CanvasRow>(
      `
        INSERT INTO canvases (workspace_id, slug, name, git_branch, created_by)
        SELECT w.id, $2, $3, $4, $5
        FROM workspaces w
        WHERE w.id = $1
          AND w.deleted_at IS NULL
        RETURNING id, workspace_id AS "workspaceId", slug, name, lifecycle_state AS "lifecycleState", git_branch AS "gitBranch", schema_version AS "schemaVersion", created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"
      `,
      [workspaceId, slug, name, `choreostudio/drafts/${slug}`, userId],
    );

    const created = result.rows[0];
    if (!created) {
      throw new NotFoundError('Canvas could not be created');
    }

    return reply.status(201).send({ ...created, ...hierarchy });
  });

  fastify.get('/workspaces/:workspaceId/canvases', async (request) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const userId = requireUserId(request);
    await requireWorkspaceAccess(userId, workspaceId);

    const result = await query<CanvasRow>(
      `${canvasSelect}
       WHERE c.workspace_id = $1
         AND c.deleted_at IS NULL
         AND w.deleted_at IS NULL
       ORDER BY c.created_at ASC`,
      [workspaceId],
    );

    return result.rows;
  });

  fastify.get('/canvases/:canvasId', async (request) => {
    const { canvasId } = request.params as { canvasId: string };
    const userId = requireUserId(request);
    await requireCanvasAccess(userId, canvasId);

    const result = await query<CanvasRow>(
      `${canvasSelect}
       WHERE c.id = $1
         AND c.deleted_at IS NULL
         AND w.deleted_at IS NULL`,
      [canvasId],
    );
    const canvas = result.rows[0];

    if (!canvas) {
      throw new NotFoundError('Canvas not found');
    }

    return canvas;
  });

  fastify.post('/canvases/:canvasId/validate', async (request, reply) => {
    const { canvasId } = request.params as { canvasId: string };
    const userId = requireUserId(request);
    await requireCanvasAccess(userId, canvasId);

    const result = validateCanvasDocument(request.body);
    if (!result.valid) {
      return reply.status(422).send(result);
    }

    return reply.status(200).send(result);
  });
};

export default canvasesRoutes;
