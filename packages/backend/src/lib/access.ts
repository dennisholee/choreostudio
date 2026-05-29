import type { FastifyRequest } from 'fastify';
import type { QueryResultRow } from 'pg';

import { query } from '../db/client.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../errors.js';

export interface WorkspaceHierarchy {
  orgId: string;
  teamId: string;
  workspaceId: string;
}

interface WorkspaceAccessRow extends QueryResultRow {
  orgId: string;
  teamId: string;
  workspaceId: string;
}

interface CanvasAccessRow extends WorkspaceAccessRow {
  canvasId: string;
}

export function requireUserId(request: FastifyRequest): string {
  const userId = request.headers['x-user-id'];

  if (typeof userId !== 'string' || userId.trim().length === 0) {
    throw new UnauthorizedError('x-user-id header is required');
  }

  return userId.trim();
}

export async function requireWorkspaceAccess(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceHierarchy> {
  const workspaceResult = await query<WorkspaceAccessRow>(
    `
      SELECT
        t.org_id AS "orgId",
        w.team_id AS "teamId",
        w.id AS "workspaceId"
      FROM workspaces w
      JOIN teams t ON t.id = w.team_id
      WHERE w.id = $1
        AND w.deleted_at IS NULL
    `,
    [workspaceId],
  );

  const workspace = workspaceResult.rows[0];
  if (!workspace) {
    throw new NotFoundError('Workspace not found');
  }

  const membershipResult = await query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId],
  );

  if (membershipResult.rowCount === 0) {
    throw new ForbiddenError('User does not have access to this workspace');
  }

  return workspace;
}

export async function requireCanvasAccess(
  userId: string,
  canvasId: string,
): Promise<CanvasAccessRow> {
  const canvasResult = await query<CanvasAccessRow>(
    `
      SELECT
        c.id AS "canvasId",
        t.org_id AS "orgId",
        w.team_id AS "teamId",
        w.id AS "workspaceId"
      FROM canvases c
      JOIN workspaces w ON w.id = c.workspace_id
      JOIN teams t ON t.id = w.team_id
      WHERE c.id = $1
        AND c.deleted_at IS NULL
        AND w.deleted_at IS NULL
    `,
    [canvasId],
  );

  const canvas = canvasResult.rows[0];
  if (!canvas) {
    throw new NotFoundError('Canvas not found');
  }

  const membershipResult = await query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [canvas.workspaceId, userId],
  );

  if (membershipResult.rowCount === 0) {
    throw new ForbiddenError('User does not have access to this canvas');
  }

  return canvas;
}
