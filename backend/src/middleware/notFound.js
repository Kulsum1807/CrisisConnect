import AppError from '../utils/AppError.js';

/**
 * Catches any unhandled route patterns and forwards a 404 AppError.
 */
export const notFound = (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
};

export default notFound;
