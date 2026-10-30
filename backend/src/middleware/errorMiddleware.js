import { errorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * Centralized Express Error Handling Middleware.
 * Catches all errors from the route stack and formats them into standard JSON envelopes.
 * Ensures operational errors are handled predictably and internal server errors
 * do not leak stack traces or internal implementation details in production.
 */
// eslint-disable-next-line no-unused-vars
export const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errorCode = err.errorCode || 'SERVER_ERROR';
  let errors = err.errors || null;

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 404;
    message = `Resource not found with id of ${err.value}`;
    errorCode = 'NOT_FOUND';
  }

  // Handle Mongoose duplicate key error (11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${field}`;
    errorCode = 'DUPLICATE';
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errorCode = 'VALIDATION_ERROR';
    errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
    }));
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    errorCode = 'UNAUTHENTICATED';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired';
    errorCode = 'TOKEN_EXPIRED';
  }

  // Log unexpected internal errors
  if (statusCode >= 500) {
    logger.error({ err, req: { method: req.method, url: req.originalUrl } }, err.message);
  }

  return errorResponse(res, statusCode, message, errorCode, errors);
};

export default errorMiddleware;
