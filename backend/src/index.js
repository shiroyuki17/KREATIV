import http from 'node:http';
import { app } from './app.js';
import { config } from './config/env.js';
import prisma from './lib/prisma.js';
import { initSocket } from './lib/socket.js';

const httpServer = http.createServer(app);
const socketCorsOrigin = config.NODE_ENV === 'production'
  ? config.FRONTEND_URL
  : [config.FRONTEND_URL, /^http:\/\/localhost:\d+$/];
initSocket(httpServer, socketCorsOrigin);

const server = httpServer.listen(config.PORT, () => {
  console.log(`🚀 Kreativ backend: http://localhost:${config.PORT}`);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\nУнтрааж байна...');
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
