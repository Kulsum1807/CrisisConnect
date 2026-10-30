import mongoose from 'mongoose';
import Incident from '../models/Incident.js';
import User from '../models/User.js';
import { ROLES } from '../constants/roles.js';
import { STATUSES } from '../constants/statuses.js';
import { AVAILABILITY } from '../constants/responder.js';
import { isValidCoordinate } from '../utils/geo.js';
import { autoJoinRooms, getIncidentRoom, getUserRoom } from './rooms.js';
import { emitErrorEvent, emitResponderLocation } from './realtimeEmitter.js';
import logger from '../utils/logger.js';

// Map of pending disconnect timers: userId -> timeoutId
const pendingDisconnects = new Map();

// Map of last location update timestamps: `${userId}:${incidentId}` -> timestamp
const lastLocationUpdates = new Map();

/**
 * Configure location update throttle interval (in milliseconds).
 * Default: 5000ms (5 seconds) in production, 100ms in test.
 */
const getLocationThrottleMs = () => {
  if (process.env.NODE_ENV === 'test') {
    return 100;
  }
  return 5000;
};

/**
 * Configure default disconnect grace period (in milliseconds).
 * Default: 30s in development/production, 500ms in test.
 */
const getGracePeriodMs = () => {
  if (process.env.NODE_ENV === 'test') {
    return 500;
  }
  const customSec = parseInt(process.env.DISCONNECT_GRACE_SEC, 10);
  return (isNaN(customSec) ? 30 : customSec) * 1000;
};

/**
 * Register all socket event listeners and connection lifecycle handlers.
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
export const registerSocketHandlers = (io, socket) => {
  const user = socket.user;
  const userId = user._id.toString();

  // Cancel any pending disconnect timer if the user reconnected in time
  if (pendingDisconnects.has(userId)) {
    clearTimeout(pendingDisconnects.get(userId));
    pendingDisconnects.delete(userId);
    logger.info({ userId }, 'Responder reconnected within grace period; kept ONLINE');
  }

  // Auto-join personal user room, admin room, and online responder room
  autoJoinRooms(socket);
  logger.info({ userId, role: user.role, socketId: socket.id }, 'Socket connected and auto-joined rooms');

  // ---------- Client-to-Server Event: incident:join ----------
  socket.on('incident:join', async (payload) => {
    try {
      const incidentId = payload?.incidentId || payload;

      if (!incidentId || !mongoose.Types.ObjectId.isValid(incidentId)) {
        return emitErrorEvent(
          socket,
          'INVALID_ID',
          'Invalid incident ID format',
          'incident:join'
        );
      }

      const incident = await Incident.findById(incidentId);
      if (!incident) {
        return emitErrorEvent(
          socket,
          'NOT_FOUND',
          'Incident not found',
          'incident:join'
        );
      }

      // Authorization check: participant (creator, assigned responder) or ADMIN
      const isCreator = incident.createdBy?.toString() === userId;
      const isAssigned = incident.assignedResponder?.toString() === userId;
      const isAdmin = user.role === ROLES.ADMIN;

      if (!isCreator && !isAssigned && !isAdmin) {
        return emitErrorEvent(
          socket,
          'FORBIDDEN',
          'You are not authorized to join this incident room',
          'incident:join'
        );
      }

      const room = getIncidentRoom(incidentId);
      socket.join(room);
      logger.info({ userId, incidentId, socketId: socket.id }, 'Socket joined incident room');
    } catch (err) {
      logger.error({ err }, 'Error handling incident:join');
      emitErrorEvent(socket, 'SERVER_ERROR', 'Failed to join incident room', 'incident:join');
    }
  });

  // ---------- Client-to-Server Event: incident:leave ----------
  socket.on('incident:leave', (payload) => {
    try {
      const incidentId = payload?.incidentId || payload;
      if (incidentId) {
        socket.leave(getIncidentRoom(incidentId));
        logger.info({ userId, incidentId, socketId: socket.id }, 'Socket left incident room');
      }
    } catch (err) {
      logger.error({ err }, 'Error handling incident:leave');
    }
  });

  // ---------- Client-to-Server Event: responder:location ----------
  socket.on('responder:location', async (payload) => {
    try {
      // 1. Role validation: Only responders can broadcast location
      if (user.role !== ROLES.RESPONDER) {
        return emitErrorEvent(
          socket,
          'FORBIDDEN',
          'Only responders can share live location',
          'responder:location'
        );
      }

      const { incidentId, lat, lng } = payload || {};

      // 2. Validate incident ID format
      if (!incidentId || !mongoose.Types.ObjectId.isValid(incidentId)) {
        return emitErrorEvent(
          socket,
          'INVALID_ID',
          'Invalid incident ID format',
          'responder:location'
        );
      }

      // 3. Validate coordinates
      const numLat = Number(lat);
      const numLng = Number(lng);
      if (!isValidCoordinate(numLat, numLng)) {
        return emitErrorEvent(
          socket,
          'INVALID_COORDINATES',
          'Coordinates must be valid latitude [-90, 90] and longitude [-180, 180]',
          'responder:location'
        );
      }

      // 4. Incident authorization & state check
      const incident = await Incident.findById(incidentId);
      if (!incident) {
        return emitErrorEvent(
          socket,
          'NOT_FOUND',
          'Incident not found',
          'responder:location'
        );
      }

      // Only the assigned responder can emit location
      if (incident.assignedResponder?.toString() !== userId) {
        return emitErrorEvent(
          socket,
          'FORBIDDEN',
          'You are not the assigned responder for this incident',
          'responder:location'
        );
      }

      // Status check: ACCEPTED or IN_PROGRESS only
      if (
        incident.status !== STATUSES.ACCEPTED &&
        incident.status !== STATUSES.IN_PROGRESS
      ) {
        return emitErrorEvent(
          socket,
          'INVALID_INCIDENT_STATE',
          'Live location sharing is only permitted during ACCEPTED or IN_PROGRESS status',
          'responder:location'
        );
      }

      // 5. Rate limiting / throttling (max 1 per ~5s in prod, 100ms in test)
      const throttleKey = `${userId}:${incidentId}`;
      const now = Date.now();
      const lastUpdate = lastLocationUpdates.get(throttleKey) || 0;
      const throttleMs = getLocationThrottleMs();

      if (now - lastUpdate < throttleMs) {
        return emitErrorEvent(
          socket,
          'THROTTLED',
          'Location updates are throttled (max 1 per 5 seconds)',
          'responder:location'
        );
      }

      lastLocationUpdates.set(throttleKey, now);

      // 6. Update responder's profile in database (GeoJSON order [lng, lat])
      await User.findByIdAndUpdate(userId, {
        'responderProfile.currentLocation': {
          type: 'Point',
          coordinates: [numLng, numLat],
        },
        'responderProfile.lastLocationAt': new Date(),
      });

      // 7. Emit responder:location to the incident room participants and admins
      emitResponderLocation(incidentId, {
        lat: numLat,
        lng: numLng,
        at: new Date(),
      });
    } catch (err) {
      logger.error({ err, userId }, 'Error handling responder:location');
      emitErrorEvent(
        socket,
        'SERVER_ERROR',
        'Failed to process location update',
        'responder:location'
      );
    }
  });

  // ---------- Socket Disconnection & Responder Grace Period ----------
  socket.on('disconnect', async () => {
    logger.info({ userId, socketId: socket.id }, 'Socket disconnected');

    // Only apply disconnect grace period to ONLINE responders
    if (user.role === ROLES.RESPONDER) {
      // Check if user has other concurrent active connections (e.g. another tab or device)
      const userSockets = io.sockets.adapter.rooms.get(getUserRoom(userId));
      const hasOtherSockets = userSockets && userSockets.size > 0;

      if (!hasOtherSockets) {
        const graceMs = getGracePeriodMs();

        const timer = setTimeout(async () => {
          pendingDisconnects.delete(userId);
          try {
            // Check if user is still marked ONLINE before toggling
            const currentUser = await User.findById(userId);
            if (currentUser && currentUser.responderProfile?.availability === AVAILABILITY.ONLINE) {
              currentUser.responderProfile.availability = AVAILABILITY.OFFLINE;
              await currentUser.save();
              logger.info({ userId }, 'Responder disconnect grace period expired; switched to OFFLINE');
            }
          } catch (err) {
            logger.error({ err, userId }, 'Failed to set responder OFFLINE after grace period');
          }
        }, graceMs);

        pendingDisconnects.set(userId, timer);
      }
    }
  });
};

/**
 * Utility to clear all pending disconnect timers (used during test teardowns).
 */
export const clearPendingDisconnects = () => {
  for (const timer of pendingDisconnects.values()) {
    clearTimeout(timer);
  }
  pendingDisconnects.clear();
};

/**
 * Utility to clear all location throttle timestamps (used during test teardowns).
 */
export const clearLocationThrottles = () => {
  lastLocationUpdates.clear();
};

export default registerSocketHandlers;

