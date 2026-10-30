import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import env from './config/env.js';
import logger from './utils/logger.js';
import { initSocket } from './sockets/index.js';

/**
 * Server startup file.
 * Initializes DB connection and binds the HTTP server to the designated port.
 */
const startServer = async () => {
  try {
    // 1. Connect Database
    await connectDB();

    // 2. Create HTTP Server
    const server = http.createServer(app);

    // 3. Attach Socket.IO
    initSocket(server);

    // 4. Listen on configured PORT
    server.listen(env.PORT, () => {

      logger.info(`🚀 CrisisConnect Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`Health check at: http://localhost:${env.PORT}/api/health`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.fatal({ err }, 'UNHANDLED REJECTION! Shutting down gracefully...');
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.fatal({ err }, 'UNCAUGHT EXCEPTION! Shutting down immediately...');
      process.exit(1);
    });
  } catch (error) {
    logger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  }
};

startServer();
