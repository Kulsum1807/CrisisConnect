/**
 * Wraps async route handlers to forward unhandled rejections to Next(error).
 * Eliminates tedious try/catch boilerplate across controllers.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
