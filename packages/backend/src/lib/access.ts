import type { FastifyRequest } from 'fastify';
import type { QueryResultRow } from 'pg';

import { query } from '../db/client.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../errors.js';

export type RbacRole = 'owner' | 'editor' | 'reviewer' | 'viewer';
const ROLE_RANK: Record<RbacRole, number> = { owner: 4, editor: 3, reviewer: 2, viewer: 1 };
export function roleAtLeast(actual: RbacRole, minimum: RbacRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[minimum];
}

export interface WorkspaceHierarchy {
  orgId: string;
  teamId: string;
  workspaceId: string;
  role: RbacRole;
}

interface WorkspaceAccessRow extends QueryResultRow {
  orgId: string;
  teamId: string;
  workspaceId: string;
  role: RbacRole;
}

export interface CanvasAccessResult extends WorkspaceAccessRow {
  canvasId: string;
  lifecycleState: string;
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
  minimumRole: RbacRole = 'viewer',
): Promise<WorkspaceHierarchy> {
  const result = await query<WorkspaceAccessRow>(
    `SELECT t.org_id AS "orgId", w.team_id AS "teamId", w.id AS "workspaceId", wm.role
     FROM workspaces w
     JOIN teams t ON t.id = w.team_id
     LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = $2
     WHERE w.id = $1 AND w.deleted_at IS NULL`,
    [workspaceId, userId],
  );

  const row = result.rows[0];
  if (!row) throw new NotFoundError('Workspace not found');
  if (!row.role) throw new ForbiddenError('User does not have access to this workspace');
  if (!roleAtLeast(row.role, minimumRole))
    throw new ForbiddenError(`Role '${row.role}' insufficient — requires '${minimumRole}'`);
  return row;
}

export async function requireCanvasAccess(
  userId: string,
  canvasId: string,
  minimumRole: RbacRole = 'viewer',
): Promise<CanvasAccessResult> {
  const result = await query<CanvasAccessResult>(
    `SELECT c.id AS "canvasId", t.org_id AS "orgId", w.team_id AS "teamId",
            w.id AS "workspaceId", wm.role, c.lifecycle_state AS "lifecycleState"
     FROM canvases c
     JOIN workspaces w ON w.id = c.workspace_id
     JOIN teams t ON t.id = w.team_id
     LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = $2
     WHERE c.id = $1 AND c.deleted_at IS NULL AND w.deleted_at IS NULL`,
    [canvasId, userId],
  );

  const row = result.rows[0];
  if (!row) throw new NotFoundError('Canvas not found');
  if (!row.role) throw new ForbiddenError('User does not have access to this canvas');
  if (!roleAtLeast(row.role, minimumRole))
    throw new ForbiddenError(`Role '${row.role}' insufficient — requires '${minimumRole}'`);
  return row;
}
