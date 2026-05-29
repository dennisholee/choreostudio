import type { FastifyPluginAsync } from 'fastify';
import type { QueryResultRow } from 'pg';

import { query } from '../db/client.js';
import { ConflictError, NotFoundError } from '../errors.js';
import { requireUserId } from '../lib/access.js';
import { assertSlug, optionalString, requireObject, requireString } from '../lib/request.js';

interface TeamRow extends QueryResultRow {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  createdAt: string;
}

interface TeamDependencyRow extends QueryResultRow {
  hasWorkspaces: boolean;
  hasCanvases: boolean;
}

const selectTeam = `
  SELECT
    id,
    org_id AS "orgId",
    name,
    slug,
    created_at AS "createdAt"
  FROM teams
`;

const teamsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/orgs/:orgId/teams', async (request, reply) => {
    requireUserId(request);
    const { orgId } = request.params as { orgId: string };
    const body = requireObject(request.body);
    const name = requireString(body, 'name');
    const slug = requireString(body, 'slug');
    assertSlug(slug);

    const orgResult = await query<{ id: string }>('SELECT id FROM orgs WHERE id = $1', [orgId]);
    if (orgResult.rowCount === 0) {
      throw new NotFoundError('Organization not found');
    }

    const result = await query<TeamRow>(
      `
        INSERT INTO teams (org_id, name, slug)
        VALUES ($1, $2, $3)
        RETURNING id, org_id AS "orgId", name, slug, created_at AS "createdAt"
      `,
      [orgId, name, slug],
    );

    return reply.status(201).send(result.rows[0]);
  });

  fastify.get('/orgs/:orgId/teams', async (request) => {
    requireUserId(request);
    const { orgId } = request.params as { orgId: string };
    const result = await query<TeamRow>(`${selectTeam} WHERE org_id = $1 ORDER BY created_at ASC`, [orgId]);
    return result.rows;
  });

  fastify.get('/teams/:teamId', async (request) => {
    requireUserId(request);
    const { teamId } = request.params as { teamId: string };
    const result = await query<TeamRow>(`${selectTeam} WHERE id = $1`, [teamId]);
    const team = result.rows[0];

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    return team;
  });

  fastify.patch('/teams/:teamId', async (request) => {
    requireUserId(request);
    const { teamId } = request.params as { teamId: string };
    const body = requireObject(request.body);
    const name = optionalString(body, 'name');
    const nextOrgId = optionalString(body, 'orgId');

    const existingResult = await query<TeamRow>(`${selectTeam} WHERE id = $1`, [teamId]);
    const existing = existingResult.rows[0];
    if (!existing) {
      throw new NotFoundError('Team not found');
    }

    if (nextOrgId && nextOrgId !== existing.orgId) {
      const orgResult = await query<{ id: string }>('SELECT id FROM orgs WHERE id = $1', [nextOrgId]);
      if (orgResult.rowCount === 0) {
        throw new NotFoundError('Organization not found');
      }

      const dependencyResult = await query<TeamDependencyRow>(
        `
          SELECT
            EXISTS(
              SELECT 1
              FROM workspaces w
              WHERE w.team_id = $1
                AND w.deleted_at IS NULL
            ) AS "hasWorkspaces",
            EXISTS(
              SELECT 1
              FROM canvases c
              JOIN workspaces w ON w.id = c.workspace_id
              WHERE w.team_id = $1
                AND w.deleted_at IS NULL
                AND c.deleted_at IS NULL
            ) AS "hasCanvases"
        `,
        [teamId],
      );

      const dependencies = dependencyResult.rows[0];
      if (dependencies?.hasWorkspaces || dependencies?.hasCanvases) {
        throw new ConflictError('Team cannot move to a different organization while it still owns workspaces or canvases');
      }
    }

    const updatedResult = await query<TeamRow>(
      `
        UPDATE teams
        SET
          name = COALESCE($2, name),
          org_id = COALESCE($3, org_id)
        WHERE id = $1
        RETURNING id, org_id AS "orgId", name, slug, created_at AS "createdAt"
      `,
      [teamId, name ?? null, nextOrgId ?? null],
    );

    return updatedResult.rows[0];
  });

  fastify.delete('/teams/:teamId', async (request, reply) => {
    requireUserId(request);
    const { teamId } = request.params as { teamId: string };
    const dependencyResult = await query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM workspaces WHERE team_id = $1 AND deleted_at IS NULL',
      [teamId],
    );

    if ((dependencyResult.rows[0]?.count ?? '0') !== '0') {
      throw new ConflictError('Team cannot be deleted while it still has workspaces');
    }

    const deleted = await query<{ id: string }>('DELETE FROM teams WHERE id = $1 RETURNING id', [teamId]);
    if (deleted.rowCount === 0) {
      throw new NotFoundError('Team not found');
    }

    return reply.status(204).send();
  });
};

export default teamsRoutes;
