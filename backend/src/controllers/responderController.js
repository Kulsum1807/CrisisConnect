import asyncHandler from '../utils/asyncHandler.js';
import { successResponse, paginatedResponse } from '../utils/apiResponse.js';
import * as responderService from '../services/responderService.js';
import * as incidentService from '../services/incidentService.js';
import { serializeIncident } from '../utils/incidentSerializer.js';

export const updateStatus = asyncHandler(async (req, res) => {
  const { availability } = req.body;
  const user = await responderService.updateAvailability(req.user._id, availability);
  return successResponse(res, 200, 'Responder status updated', {
    availability: user.responderProfile.availability,
  });
});

export const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  const result = await responderService.updateLocation(req.user._id, lat, lng);
  return successResponse(res, 200, 'Location updated successfully', result);
});

export const getIncidents = asyncHandler(async (req, res) => {
  const result = await incidentService.listIncidents(req.user, req.query);
  return paginatedResponse(res, 200, 'Responder incidents retrieved', {
    ...result,
    items: result.items.map((inc) => serializeIncident(inc, req.user)),
  });
});

export const acceptIncident = asyncHandler(async (req, res) => {
  const incident = await incidentService.claimIncident(req.params.id, req.user);
  return successResponse(res, 200, 'Incident accepted', {
    incident: serializeIncident(incident, req.user),
  });
});

export const declineIncident = asyncHandler(async (req, res) => {
  const { reason } = req.body || {};
  await incidentService.declineIncident(req.params.id, req.user, reason);
  return successResponse(res, 200, 'Incident declined');
});
