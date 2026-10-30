import { verifyAccessToken } from '../utils/token.js';
import User from '../models/User.js';

/**
 * Parses raw Cookie header string into key-value map.
 */
const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return {};
  const cookies = {};
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.trim().split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      cookies[key] = decodeURIComponent(value);
    }
  });
  return cookies;
};

/**
 * Socket.IO Handshake Authentication Middleware.
 * Validates the JWT access token from cookies or auth headers, loads active user,
 * and rejects unauthenticated or suspended accounts with connect_error.
 *
 * @param {import('socket.io').Socket} socket
 * @param {(err?: Error) => void} next
 */
export const socketAuth = async (socket, next) => {
  try {
    let token = null;

    // 1. Check cookies (standard browser behavior with credentials: true)
    const cookieHeader = socket.handshake.headers?.cookie;
    if (cookieHeader) {
      const cookies = parseCookies(cookieHeader);
      if (cookies.accessToken) {
        token = cookies.accessToken;
      }
    }

    // 2. Check auth payload (socket.io-client auth: { token })
    if (!token && socket.handshake.auth?.token) {
      token = socket.handshake.auth.token;
    }

    // 3. Check authorization header (Bearer <token>)
    if (!token && socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return next(new Error('Authentication required. Missing token.'));
    }

    // 4. Verify token signature and expiration
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new Error('Authentication failed. Token expired.'));
      }
      return next(new Error('Authentication failed. Invalid token.'));
    }

    // 5. Query user from database and verify existence
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new Error('Authentication failed. User no longer exists.'));
    }

    // 6. Check if account is suspended
    if (!user.isActive) {
      return next(new Error('Authentication failed. Account suspended.'));
    }

    // 7. Attach authenticated user to socket object
    socket.user = user;
    next();
  } catch (error) {
    return next(new Error('Authentication failed. Unexpected error.'));
  }
};

export default socketAuth;
