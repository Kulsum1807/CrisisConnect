import { ROOMS, getIncidentRoom, getUserRoom } from './rooms.js';
import { serializeIncident } from '../utils/incidentSerializer.js';
import { ROLES } from '../constants/roles.js';
import logger from '../utils/logger.js';

let ioInstance = null;

export const setIO = (io) => {
  ioInstance = io;
};

export const getIO = () => {
  return ioInstance;
};

/**
 * Broadcast newly created incident to eligible online responders (least information) and administrators (full details).
 */
export const emitIncidentNew = (incident) => {
  if (!ioInstance) return;

  const responderPayload = serializeIncident(incident, { role: ROLES.RESPONDER });
  ioInstance.to(ROOMS.RESPONDERS_ONLINE).emit('incident:new', responderPayload);

  const adminPayload = serializeIncident(incident, { role: ROLES.ADMIN });
  ioInstance.to(ROOMS.ADMINS).emit('incident:new', adminPayload);

  logger.info({ incidentId: responderPayload.incidentId }, 'Emitted incident:new to online responders & admins');
};

/**
 * Broadcast incident lifecycle/status update to incident room participants and admins.
 */
export const emitIncidentUpdated = (incident, at = new Date()) => {
  if (!ioInstance) return;

  const incidentId = incident._id.toString();
  const assignedResponder = incident.assignedResponder
    ? {
        _id: (incident.assignedResponder._id || incident.assignedResponder).toString(),
        name: incident.assignedResponder.name || undefined,
      }
    : null;

  const payload = {
    incidentId,
    status: incident.status,
    assignedResponder,
    severity: incident.severity,
    at: at instanceof Date ? at.toISOString() : at,
  };

  const incidentRoom = getIncidentRoom(incidentId);
  const creatorId = incident.createdBy?._id || incident.createdBy;
  const creatorRoom = creatorId ? getUserRoom(creatorId.toString()) : null;

  // Deliver to incident room, admins, and creator user room
  let target = ioInstance.to(incidentRoom).to(ROOMS.ADMINS);
  if (creatorRoom) {
    target = target.to(creatorRoom);
  }

  target.emit('incident:updated', payload);
  logger.info({ incidentId, status: incident.status }, 'Emitted incident:updated');
};

/**
 * Broadcast that an incident has been accepted by a responder, removing it from other responders' feeds.
 */
export const emitIncidentTaken = (incidentId) => {
  if (!ioInstance) return;

  const payload = {
    incidentId: incidentId.toString(),
  };

  ioInstance.to(ROOMS.RESPONDERS_ONLINE).emit('incident:taken', payload);
  logger.info({ incidentId: payload.incidentId }, 'Emitted incident:taken to online responders');
};

/**
 * Deliver in-app notification directly to the specific user's private socket room.
 */
export const emitNotificationNew = (userId, notification) => {
  if (!ioInstance) return;

  const userRoom = getUserRoom(userId.toString());
  const payload = {
    _id: notification._id.toString(),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    relatedIncident: notification.relatedIncident
      ? notification.relatedIncident.toString()
      : null,
    createdAt: notification.createdAt || new Date(),
  };

  ioInstance.to(userRoom).emit('notification:new', payload);
  logger.info({ userId: userId.toString(), notificationId: payload._id }, 'Emitted notification:new');
};

/**
 * Emit structured error event to a single requesting socket on rejected action.
 */
export const emitErrorEvent = (socket, code, message, event) => {
  socket.emit('error:event', {
    code,
    message,
    event,
  });
};

/**
 * Dynamically join all sockets of a user into responders:online room (e.g. after going ONLINE via REST).
 */
export const joinRespondersOnline = (userId) => {
  if (!ioInstance) return;
  const userRoom = getUserRoom(userId.toString());
  ioInstance.in(userRoom).socketsJoin(ROOMS.RESPONDERS_ONLINE);
};

/**
 * Dynamically remove all sockets of a user from responders:online room (e.g. after going OFFLINE/BUSY via REST).
 */
export const leaveRespondersOnline = (userId) => {
  if (!ioInstance) return;
  const userRoom = getUserRoom(userId.toString());
  ioInstance.in(userRoom).socketsLeave(ROOMS.RESPONDERS_ONLINE);
};

/**
 * Broadcast live responder coordinates to the incident room participants and admins.
 */
export const emitResponderLocation = (incidentId, { lat, lng, at = new Date() }) => {
  if (!ioInstance) return;

  const payload = {
    incidentId: incidentId.toString(),
    lat: Number(lat),
    lng: Number(lng),
    at: at instanceof Date ? at.toISOString() : at,
  };

  const incidentRoom = getIncidentRoom(incidentId);
  ioInstance.to(incidentRoom).to(ROOMS.ADMINS).emit('responder:location', payload);
  logger.info({ incidentId: payload.incidentId, lat: payload.lat, lng: payload.lng }, 'Emitted responder:location');
};

/**
 * Broadcast alert escalation to admins and online responders.
 */
export const emitIncidentEscalated = (incident, widenedRadius) => {
  if (!ioInstance) return;

  const incidentId = (incident._id || incident.incidentId).toString();
  const payload = {
    incidentId,
    incidentNumber: incident.incidentNumber,
    widenedRadius,
    severity: incident.severity,
    category: incident.category,
    at: new Date().toISOString(),
  };

  ioInstance.to(ROOMS.ADMINS).emit('incident:escalated', payload);
  logger.warn({ incidentId, widenedRadius }, 'Emitted incident:escalated to admins');
};

export default {
  setIO,
  getIO,
  emitIncidentNew,
  emitIncidentUpdated,
  emitIncidentTaken,
  emitNotificationNew,
  emitErrorEvent,
  joinRespondersOnline,
  leaveRespondersOnline,
  emitResponderLocation,
  emitIncidentEscalated,
};

