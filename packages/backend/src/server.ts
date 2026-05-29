import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import Fastify from 'fastify';

const server = Fastify({ logger: true });

await server.register(cors, { origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000' });
await server.register(websocket);

server.get('/health', async () => ({ status: 'ok', version: '0.0.1' }));

server.get('/ws', { websocket: true }, (socket) => {
  socket.on('message', (message) => {
    server.log.info({ msg: message.toString() }, 'ws message');
  });
});

try {
  await server.listen({ port: Number(process.env['PORT'] ?? 4000), host: '0.0.0.0' });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
