import asyncHandler from '../utils/asyncHandler.js';
import { successResponse, paginatedResponse } from '../utils/apiResponse.js';
import * as incidentService from '../services/incidentService.js';
import { serializeIncident } from '../utils/incidentSerializer.js';

export const createIncident = asyncHandler(async (req, res) => {
  const incident = await incidentService.createIncident(req.user, req.body);
  const message = incident.isSOS ? 'Emergency SOS initiated' : 'Incident reported successfully';
  return successResponse(res, 201, message, {
    incident: serializeIncident(incident, req.user),
  });
});

export const getIncident = asyncHandler(async (req, res) => {
  const incident = await incidentService.getIncidentById(req.params.id, req.user);
  return successResponse(res, 200, 'Incident retrieved successfully', {
    incident: serializeIncident(incident, req.user),
  });
});

export const listIncidents = asyncHandler(async (req, res) => {
  const result = await incidentService.listIncidents(req.user, req.query);
  return paginatedResponse(res, 200, 'Incidents retrieved successfully', {
    ...result,
    items: result.items.map((inc) => serializeIncident(inc, req.user)),
  });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const incident = await incidentService.transitionIncident(
    req.params.id,
    status,
    req.user,
    note
  );
  return successResponse(res, 200, 'Incident status updated', {
    incident: serializeIncident(incident, req.user),
  });
});

export const assignResponder = asyncHandler(async (req, res) => {
  const { responderId } = req.body;
  const incident = await incidentService.adminAssignIncident(
    req.params.id,
    req.user,
    responderId
  );
  return successResponse(res, 200, 'Responder assigned successfully', {
    incident: serializeIncident(incident, req.user),
  });
});

export const cancelIncident = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const incident = await incidentService.cancelIncident(req.params.id, req.user, reason);
  return successResponse(res, 200, 'Incident cancelled', {
    incident: serializeIncident(incident, req.user),
  });
});

export const rejectIncident = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const incident = await incidentService.rejectIncident(req.params.id, req.user, reason);
  return successResponse(res, 200, 'Incident rejected', {
    incident: serializeIncident(incident, req.user),
  });
});

export const overrideSeverity = asyncHandler(async (req, res) => {
  const { severity, reason } = req.body;
  const incident = await incidentService.overrideSeverity(
    req.params.id,
    req.user,
    severity,
    reason
  );
  return successResponse(res, 200, 'Incident severity overridden', {
    incident: serializeIncident(incident, req.user),
  });
});

export const reportResponder = asyncHandler(async (req, res) => {
  const { reason } = req.body || {};
  const incident = await incidentService.reportResponder(req.params.id, req.user, reason);
  return successResponse(res, 200, 'Responder reported and incident reset to pending', {
    incident: serializeIncident(incident, req.user),
  });
});

export const getIncidentMedicalInfo = asyncHandler(async (req, res) => {
  const medicalInfo = await incidentService.getIncidentMedicalInfo(req.params.id, req.user);
  return successResponse(res, 200, 'Medical info retrieved', { medicalInfo });
});


