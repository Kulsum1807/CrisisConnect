import rateLimit from 'express-rate-limit';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * Stricter rate limiter for sensitive authentication endpoints (login, register).
 * Limit: 10 requests per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // relaxed in dev/test, can be tightened via env if needed
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    errorResponse(
      res,
      429,
      'Too many login attempts from this IP. Please try again after 15 minutes.',
      'RATE_LIMITED'
    );
  },
});

export const reportResponderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    errorResponse(
      res,
      429,
      'Too many responder reports submitted. Please wait before trying again.',
      'RATE_LIMITED'
    );
  },
});

export default authLimiter;

