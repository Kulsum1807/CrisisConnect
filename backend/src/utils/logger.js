import pino from 'pino';

/**
 * Structured, high-performance logger using Pino.
 */
export const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
});

export default logger;
