import asyncHandler from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import { setAuthCookies, clearAuthCookies } from '../utils/token.js';
import * as authService from '../services/authService.js';

export const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.registerUser(req.body);
  setAuthCookies(res, accessToken, refreshToken);
  return successResponse(res, 201, 'User registered successfully', { user, token: accessToken });
});

export const registerResponder = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.registerResponder(req.body);
  setAuthCookies(res, accessToken, refreshToken);
  return successResponse(
    res,
    201,
    'Responder registered successfully. Verification pending approval.',
    { user, token: accessToken }
  );
});

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.loginUser(req.body);
  setAuthCookies(res, accessToken, refreshToken);
  return successResponse(res, 200, 'Login successful', { user, token: accessToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  const { accessToken, refreshToken } = await authService.refreshTokens(token);
  setAuthCookies(res, accessToken, refreshToken);
  return successResponse(res, 200, 'Token refreshed successfully', { token: accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.user?._id);
  clearAuthCookies(res);
  return successResponse(res, 200, 'Logged out successfully');
});

export const getMe = asyncHandler(async (req, res) => {
  return successResponse(res, 200, 'Current user retrieved', { user: req.user });
});
