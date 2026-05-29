import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import Fastify, { type FastifyInstance } from 'fastify';
import { fileURLToPath } from 'node:url';

import errorHandlerPlugin from './plugins/error-handler.js';
import canvasesRoutes from './routes/canvases.js';
import orgsRoutes from './routes/orgs.js';
import teamsRoutes from './routes/teams.js';
import workspacesRoutes from './routes/workspaces.js';

export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({ logger: true });

  await server.register(cors, { origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000' });
  await server.register(websocket);
  await server.register(errorHandlerPlugin);

  server.get('/health', async () => ({ status: 'ok', version: '0.0.1' }));

  server.get('/ws', { websocket: true }, (socket) => {
    socket.on('message', (message) => {
      server.log.info({ msg: message.toString() }, 'ws message');
    });
  });

  await server.register(
    async (api) => {
      await api.register(orgsRoutes);
      await api.register(teamsRoutes);
      await api.register(workspacesRoutes);
      await api.register(canvasesRoutes);
    },
    { prefix: '/api/v1' },
  );

  return server;
}

async function start(): Promise<void> {
  const server = await buildServer();

  try {
    await server.listen({ port: Number(process.env['PORT'] ?? 4000), host: '0.0.0.0' });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await start();
}
