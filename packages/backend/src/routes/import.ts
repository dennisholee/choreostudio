import type { FastifyPluginAsync } from 'fastify';

import { BadRequestError } from '../errors.js';
import { requireUserId } from '../lib/access.js';
import { parseOpenApi } from '../lib/importers/openapi-importer.js';
import { parseAsyncApi } from '../lib/importers/asyncapi-importer.js';
import { parseBpmn } from '../lib/importers/bpmn-importer.js';
import { requireObject, requireString } from '../lib/request.js';

const importRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/import', async (request, reply) => {
    requireUserId(request);
    const body = requireObject(request.body);
    const format = requireString(body, 'format');
    const content = requireString(body, 'content');

    try {
      let result;
      switch (format) {
        case 'openapi':  result = parseOpenApi(content);  break;
        case 'asyncapi': result = parseAsyncApi(content); break;
        case 'bpmn':     result = parseBpmn(content);     break;
        default:
          throw new BadRequestError(`Unsupported format '${format}'. Must be: openapi, asyncapi, or bpmn`);
      }
      return reply.status(200).send(result);
    } catch (e: unknown) {
      const err = e as NodeJS.ErrnoException & { statusCode?: number };
      if (err.code === '400' || err.statusCode === 400) {
        throw new BadRequestError(err.message);
      }
      throw e;
    }
  });
};

export default importRoutes;
