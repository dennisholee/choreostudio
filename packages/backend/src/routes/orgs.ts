import type { FastifyPluginAsync } from 'fastify';
import type { QueryResultRow } from 'pg';

import { query } from '../db/client.js';
import { ConflictError, NotFoundError } from '../errors.js';
import { requireUserId } from '../lib/access.js';
import { assertSlug, requireObject, requireString } from '../lib/request.js';

interface OrgRow extends QueryResultRow {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

const orgsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/orgs', async (request, reply) => {
    requireUserId(request);
    const body = requireObject(request.body);
    const name = requireString(body, 'name');
    const slug = requireString(body, 'slug');
    assertSlug(slug);

    const result = await query<OrgRow>(
      `
        INSERT INTO orgs (name, slug)
        VALUES ($1, $2)
        RETURNING id, name, slug, created_at AS "createdAt", updated_at AS "updatedAt"
      `,
      [name, slug],
    );

    return reply.status(201).send(result.rows[0]);
  });

  fastify.get('/orgs', async (request) => {
    requireUserId(request);
    const result = await query<OrgRow>(
      'SELECT id, name, slug, created_at AS "createdAt", updated_at AS "updatedAt" FROM orgs ORDER BY created_at ASC',
    );

    return result.rows;
  });

  fastify.get('/orgs/:orgId', async (request) => {
    requireUserId(request);
    const { orgId } = request.params as { orgId: string };
    const result = await query<OrgRow>(
      'SELECT id, name, slug, created_at AS "createdAt", updated_at AS "updatedAt" FROM orgs WHERE id = $1',
      [orgId],
    );

    const org = result.rows[0];
    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    return org;
  });

  fastify.delete('/orgs/:orgId', async (request, reply) => {
    requireUserId(request);
    const { orgId } = request.params as { orgId: string };
    const teamCount = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM teams WHERE org_id = $1', [orgId]);

    if ((teamCount.rows[0]?.count ?? '0') !== '0') {
      throw new ConflictError('Organization cannot be deleted while it still has teams');
    }

    const deleted = await query<{ id: string }>('DELETE FROM orgs WHERE id = $1 RETURNING id', [orgId]);
    if (deleted.rowCount === 0) {
      throw new NotFoundError('Organization not found');
    }

    return reply.status(204).send();
  });
};

export default orgsRoutes;
