import { verifyAccessToken } from '../utils/token.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Protect middleware:
 * Extracts access token from either Authorization header (Bearer ...) or httpOnly cookie.
 * Validates token, loads active user into req.user, rejects inactive/suspended accounts.
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Check cookies first, then Authorization header
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Authentication required. Please log in.', 401, 'UNAUTHENTICATED'));
  }

  // 2. Verify token signature and expiry
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please refresh your token.', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid authentication token', 401, 'UNAUTHENTICATED'));
  }

  // 3. Find user and verify existence
  const user = await User.findById(decoded.userId);
  if (!user) {
    return next(new AppError('The user belonging to this token no longer exists.', 401, 'UNAUTHENTICATED'));
  }

  // 4. Verify account is not suspended
  if (!user.isActive) {
    return next(
      new AppError('Your account has been suspended. Please contact support.', 403, 'ACCOUNT_SUSPENDED')
    );
  }

  // 5. Grant access: attach user to req
  req.user = user;
  next();
});

/**
 * Authorize middleware factory:
 * Restricts access to specified roles.
 * Example: authorize('ADMIN') or authorize('RESPONDER', 'ADMIN')
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN')
      );
    }
    next();
  };
};

export default { protect, authorize };
