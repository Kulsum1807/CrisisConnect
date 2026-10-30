import asyncHandler from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import * as userService from '../services/userService.js';

export const getProfile = asyncHandler(async (req, res) => {
  const user = await userService.getUserProfile(req.user._id);
  return successResponse(res, 200, 'User profile retrieved', { user });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateUserProfile(req.user._id, req.body);
  return successResponse(res, 200, 'Profile updated successfully', { user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await userService.changeUserPassword(req.user._id, currentPassword, newPassword);
  return successResponse(res, 200, 'Password changed successfully');
});

export const getEmergencyContacts = asyncHandler(async (req, res) => {
  const contacts = await userService.getEmergencyContacts(req.user._id);
  return successResponse(res, 200, 'Emergency contacts retrieved', { contacts });
});

export const addEmergencyContact = asyncHandler(async (req, res) => {
  const contact = await userService.addEmergencyContact(req.user._id, req.body);
  return successResponse(res, 201, 'Emergency contact added successfully', { contact });
});

export const updateEmergencyContact = asyncHandler(async (req, res) => {
  const contact = await userService.updateEmergencyContact(
    req.user._id,
    req.params.contactId,
    req.body
  );
  return successResponse(res, 200, 'Emergency contact updated successfully', { contact });
});

export const deleteEmergencyContact = asyncHandler(async (req, res) => {
  await userService.deleteEmergencyContact(req.user._id, req.params.contactId);
  return successResponse(res, 200, 'Emergency contact deleted successfully');
});

export const getMedicalInfo = asyncHandler(async (req, res) => {
  const medicalInfo = await userService.getUserMedicalInfo(req.user._id);
  return successResponse(res, 200, 'Medical info retrieved', { medicalInfo });
});

export const updateMedicalInfo = asyncHandler(async (req, res) => {
  const medicalInfo = await userService.updateUserMedicalInfo(req.user._id, req.body);
  return successResponse(res, 200, 'Medical info updated successfully', { medicalInfo });
});

export const deleteMedicalInfo = asyncHandler(async (req, res) => {
  await userService.deleteUserMedicalInfo(req.user._id);
  return successResponse(res, 200, 'Medical info deleted successfully');
});


