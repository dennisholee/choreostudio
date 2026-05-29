import type { FastifyPluginAsync } from 'fastify';
import type { QueryResultRow } from 'pg';

import { pool, query } from '../db/client.js';
import { NotFoundError } from '../errors.js';
import { requireWorkspaceAccess, requireUserId } from '../lib/access.js';
import { assertSlug, optionalString, requireObject, requireString } from '../lib/request.js';

interface WorkspaceRow extends QueryResultRow {
  id: string;
  workspaceId: string;
  orgId: string;
  teamId: string;
  name: string;
  slug: string;
  gitRepoUrl: string | null;
  createdAt: string;
}

const workspaceSelect = `
  SELECT
    w.id,
    w.id AS "workspaceId",
    t.org_id AS "orgId",
    w.team_id AS "teamId",
    w.name,
    w.slug,
    w.git_repo_url AS "gitRepoUrl",
    w.created_at AS "createdAt"
  FROM workspaces w
  JOIN teams t ON t.id = w.team_id
`;

const workspacesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/teams/:teamId/workspaces', async (request, reply) => {
    requireUserId(request);
    const { teamId } = request.params as { teamId: string };
    const body = requireObject(request.body);
    const name = requireString(body, 'name');
    const slug = requireString(body, 'slug');
    const gitRepoUrl = optionalString(body, 'gitRepoUrl');
    assertSlug(slug);

    const teamResult = await query<{ orgId: string }>('SELECT org_id AS "orgId" FROM teams WHERE id = $1', [teamId]);
    const team = teamResult.rows[0];
    if (!team) {
      throw new NotFoundError('Team not found');
    }

    const result = await query<WorkspaceRow>(
      `
        INSERT INTO workspaces (team_id, name, slug, git_repo_url)
        VALUES ($1, $2, $3, $4)
        RETURNING id, id AS "workspaceId", name, slug, git_repo_url AS "gitRepoUrl", created_at AS "createdAt", team_id AS "teamId"
      `,
      [teamId, name, slug, gitRepoUrl ?? null],
    );

    const created = result.rows[0];
    if (!created) {
      throw new NotFoundError('Workspace could not be created');
    }

    return reply.status(201).send({ ...created, orgId: team.orgId });
  });

  fastify.get('/teams/:teamId/workspaces', async (request) => {
    const { teamId } = request.params as { teamId: string };
    const userId = requireUserId(request);
    const result = await query<WorkspaceRow>(
      `${workspaceSelect}
       JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE w.team_id = $1
         AND w.deleted_at IS NULL
         AND wm.user_id = $2
       ORDER BY w.created_at ASC`,
      [teamId, userId],
    );

    return result.rows;
  });

  fastify.get('/workspaces/:workspaceId', async (request) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const userId = requireUserId(request);
    await requireWorkspaceAccess(userId, workspaceId);

    const result = await query<WorkspaceRow>(`${workspaceSelect} WHERE w.id = $1 AND w.deleted_at IS NULL`, [workspaceId]);
    const workspace = result.rows[0];
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    return workspace;
  });

  fastify.delete('/workspaces/:workspaceId', async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const userId = requireUserId(request);
    await requireWorkspaceAccess(userId, workspaceId);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const lockedWorkspace = await client.query<{ id: string }>(
        `
          SELECT id
          FROM workspaces
          WHERE id = $1
            AND deleted_at IS NULL
          FOR UPDATE
        `,
        [workspaceId],
      );

      if (lockedWorkspace.rowCount === 0) {
        throw new NotFoundError('Workspace not found');
      }

      await client.query(
        `
          UPDATE canvases
          SET deleted_at = now(), updated_at = now()
          WHERE workspace_id = $1
            AND deleted_at IS NULL
        `,
        [workspaceId],
      );

      await client.query(
        `
          UPDATE workspaces
          SET deleted_at = now()
          WHERE id = $1
            AND deleted_at IS NULL
        `,
        [workspaceId],
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return reply.status(204).send();
  });
};

export default workspacesRoutes;
