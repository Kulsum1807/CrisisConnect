/**
 * Standard Operational Application Error class.
 * Differentiates operational, expected HTTP errors (4xx/5xx) from programming bugs.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'SERVER_ERROR', errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
