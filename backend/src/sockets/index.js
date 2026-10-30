import { Server } from 'socket.io';
import socketAuth from './socketAuth.js';
import registerSocketHandlers from './socketHandlers.js';
import { setIO, getIO } from './realtimeEmitter.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Initializes and attaches Socket.IO to the given HTTP server instance.
 *
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
export const initSocket = (httpServer) => {
  const allowedOrigins = [
    env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
  ];

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (
          !origin ||
          allowedOrigins.includes(origin) ||
          (env.NODE_ENV === 'development' &&
            /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
        ) {
          callback(null, true);
        } else {
          callback(new Error('Blocked by Socket CORS policy'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  // 1. Handshake authentication middleware
  io.use(socketAuth);

  // 2. Client connection & event registration
  io.on('connection', (socket) => {
    registerSocketHandlers(io, socket);
  });

  // 3. Register singleton instance for services
  setIO(io);

  logger.info('Socket.IO initialized and attached to HTTP server');
  return io;
};

export { getIO } from './realtimeEmitter.js';
export * from './rooms.js';
export * from './realtimeEmitter.js';
export default initSocket;
