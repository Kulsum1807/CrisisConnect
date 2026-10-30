import * as adminService from '../services/adminService.js';
import * as responderService from '../services/responderService.js';
import { successResponse } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getResponders = asyncHandler(async (req, res) => {
  const data = await adminService.getResponders(req.query);
  return successResponse(res, 200, 'Responders retrieved successfully', data);
});

export const verifyResponder = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const responder = await responderService.verifyResponder(
    req.params.id,
    req.user,
    status,
    note
  );
  return successResponse(res, 200, 'Responder verification status updated', { responder });
});

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  return successResponse(res, 200, 'Admin dashboard metrics retrieved', stats);
});

export const getUsers = asyncHandler(async (req, res) => {
  const data = await adminService.getUsers(req.query);
  return successResponse(res, 200, 'Users retrieved successfully', data);
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const { isActive, reason } = req.body;
  const user = await adminService.updateUserStatus(
    req.params.id,
    req.user,
    isActive,
    reason
  );
  return successResponse(res, 200, 'User status updated successfully', { user });
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const data = await adminService.getAnalytics();
  return successResponse(res, 200, 'Analytics retrieved successfully', data);
});

export default {
  getResponders,
  verifyResponder,
  getDashboardStats,
  getUsers,
  updateUserStatus,
  getAnalytics,
};

