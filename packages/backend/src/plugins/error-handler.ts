import type { FastifyPluginAsync } from 'fastify';

import { AppError } from '../errors.js';

interface PgError extends Error {
  code?: string;
  detail?: string;
}

const PG_STATUS_CODES: Record<string, { statusCode: number; code: string; message: string }> = {
  '22P02': { statusCode: 400, code: 'invalid_input_syntax', message: 'Invalid request value' },
  '23503': { statusCode: 400, code: 'foreign_key_violation', message: 'Referenced resource does not exist' },
  '23505': { statusCode: 409, code: 'unique_violation', message: 'Resource already exists' },
};

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      });
    }

    const pgError = error as PgError;
    const mappedPgError = pgError.code ? PG_STATUS_CODES[pgError.code] : undefined;
    if (mappedPgError) {
      return reply.status(mappedPgError.statusCode).send({
        error: mappedPgError.code,
        message: pgError.detail ?? mappedPgError.message,
      });
    }

    fastify.log.error(error);
    return reply.status(500).send({
      error: 'internal_server_error',
      message: 'Internal server error',
    });
  });
};

export default errorHandlerPlugin;
