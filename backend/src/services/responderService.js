import User from '../models/User.js';
import Incident from '../models/Incident.js';
import AppError from '../utils/AppError.js';
import { ROLES } from '../constants/roles.js';
import { STATUSES } from '../constants/statuses.js';
import {
  AVAILABILITY,
  VERIFICATION_STATUSES,
} from '../constants/responder.js';
import { isValidCoordinate } from '../utils/geo.js';
import {
  joinRespondersOnline,
  leaveRespondersOnline,
} from '../sockets/realtimeEmitter.js';

/**
 * Responder Service
 * Manages responder-specific domain logic: availability toggling and GPS location streaming.
 */

export const updateAvailability = async (responderId, availability) => {
  if (![AVAILABILITY.ONLINE, AVAILABILITY.OFFLINE].includes(availability)) {
    throw new AppError(
      'Availability must be either ONLINE or OFFLINE. BUSY is managed automatically.',
      400,
      'VALIDATION_ERROR'
    );
  }

  const responder = await User.findById(responderId);
  if (!responder || responder.role !== ROLES.RESPONDER) {
    throw new AppError('Responder not found', 404, 'NOT_FOUND');
  }

  // Must be verified by admin before allowed to go ONLINE
  if (
    availability === AVAILABILITY.ONLINE &&
    responder.responderProfile?.verificationStatus !== VERIFICATION_STATUSES.VERIFIED
  ) {
    throw new AppError(
      'Your account is pending verification by an administrator. You cannot go online yet.',
      403,
      'FORBIDDEN'
    );
  }

  // If currently BUSY, check if there is an active incident
  if (
    availability === AVAILABILITY.OFFLINE &&
    responder.responderProfile?.availability === AVAILABILITY.BUSY
  ) {
    const activeIncident = await Incident.findOne({
      assignedResponder: responderId,
      status: { $in: [STATUSES.ASSIGNED, STATUSES.ACCEPTED, STATUSES.IN_PROGRESS] },
    });

    if (activeIncident) {
      throw new AppError(
        'Cannot go offline while managing an active incident. Please resolve or cancel it first.',
        409,
        'RESPONDER_UNAVAILABLE'
      );
    }
  }

  responder.responderProfile.availability = availability;
  await responder.save();

  if (availability === AVAILABILITY.ONLINE) {
    joinRespondersOnline(responder._id);
  } else {
    leaveRespondersOnline(responder._id);
  }

  return responder;
};

export const updateLocation = async (responderId, lat, lng) => {
  if (!isValidCoordinate(lat, lng)) {
    throw new AppError('Invalid coordinates provided', 400, 'VALIDATION_ERROR');
  }

  const responder = await User.findById(responderId);
  if (!responder || responder.role !== ROLES.RESPONDER) {
    throw new AppError('Responder not found', 404, 'NOT_FOUND');
  }

  // Update GeoJSON point [lng, lat]
  responder.responderProfile.currentLocation = {
    type: 'Point',
    coordinates: [Number(lng), Number(lat)],
  };
  responder.responderProfile.lastLocationAt = new Date();

  await responder.save();

  return {
    location: { lat, lng },
    updatedAt: responder.responderProfile.lastLocationAt,
  };
};

export const verifyResponder = async (responderId, adminUser, status, note = '') => {
  if (adminUser.role !== ROLES.ADMIN) {
    throw new AppError('Admin permission required', 403, 'FORBIDDEN');
  }

  const responder = await User.findById(responderId);
  if (!responder || responder.role !== ROLES.RESPONDER) {
    throw new AppError('Responder not found', 404, 'NOT_FOUND');
  }

  responder.responderProfile.verificationStatus = status;
  if (note) {
    responder.responderProfile.verificationNote = note;
  }

  if (status === VERIFICATION_STATUSES.VERIFIED) {
    responder.responderProfile.verifiedBy = adminUser._id;
    responder.responderProfile.verifiedAt = new Date();
  }

  await responder.save();
  return responder;
};

export default {
  updateAvailability,
  updateLocation,
  verifyResponder,
};

