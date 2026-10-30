import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * Generate Access Token (short-lived, e.g., 15m)
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  });
};

/**
 * Generate Refresh Token (long-lived, e.g., 7d)
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.REFRESH_TOKEN_TTL,
  });
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

/**
 * Standard httpOnly cookie options for auth tokens
 */
export const getCookieOptions = (isRefreshToken = false) => {
  // 15 minutes for access token, 7 days for refresh token
  const maxAge = isRefreshToken ? 7 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000;

  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    maxAge,
  };
};

/**
 * Attach auth cookies to response
 */
export const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, getCookieOptions(false));
  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, getCookieOptions(true));
  }
};

/**
 * Clear auth cookies from response
 */
export const clearAuthCookies = (res) => {
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
  });
};
