import mongoose from 'mongoose';
import Incident from '../models/Incident.js';
import User from '../models/User.js';
import Counter from '../models/Counter.js';
import AppError from '../utils/AppError.js';
import { ROLES } from '../constants/roles.js';
import { STATUSES, TERMINAL_STATUSES } from '../constants/statuses.js';
import { CATEGORIES } from '../constants/categories.js';
import { SEVERITIES, SEVERITY_VALUES } from '../constants/severities.js';
import { ALLOWED_TRANSITIONS } from '../constants/transitions.js';
import {
  VERIFICATION_STATUSES,
  AVAILABILITY,
  NOTIFICATION_TYPES,
  RESPONDER_TYPES,
} from '../constants/responder.js';

const RESPONDER_POPULATE_FIELDS =
  'name email phone responderProfile.specialization responderProfile.currentLocation responderProfile.responderType responderProfile.organisation responderProfile.verificationStatus responderProfile.verifiedAt';
import { calculateSeverity } from './severityService.js';
import { createNotification, createBulkNotifications } from './notificationService.js';
import {
  emitIncidentNew,
  emitIncidentUpdated,
  emitIncidentTaken,
  joinRespondersOnline,
  leaveRespondersOnline,
} from '../sockets/realtimeEmitter.js';
import { toGeoJSONPoint } from '../utils/geo.js';
import {
  startEscalationTimer,
  cancelEscalationTimer,
} from './escalationService.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Generate next sequential incident number atomically (e.g. CC-1001, CC-1002).
 */
export const getNextIncidentNumber = async () => {
  // Ensure counter is initialized
  await Counter.findOneAndUpdate(
    { _id: 'incident' },
    { $setOnInsert: { seq: 1000 } },
    { upsert: true }
  );

  const counter = await Counter.findOneAndUpdate(
    { _id: 'incident' },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );

  return `CC-${counter.seq}`;
};

/**
 * Find eligible responders near a given location.
 * Uses 2dsphere index on User.responderProfile.currentLocation.
 */
export const findEligibleResponders = async (
  coordinates,
  maxDistanceKm = env.ALERT_RADIUS_KM || 5,
  excludedIds = []
) => {
  const baseQuery = {
    role: ROLES.RESPONDER,
    'responderProfile.verificationStatus': VERIFICATION_STATUSES.VERIFIED,
    'responderProfile.availability': AVAILABILITY.ONLINE,
    _id: { $nin: excludedIds },
  };

  // If coordinates provided, run geospatial $near query
  if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
    try {
      const nearbyResponders = await User.find({
        ...baseQuery,
        'responderProfile.currentLocation': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates,
            },
            $maxDistance: maxDistanceKm * 1000, // convert km to meters
          },
        },
      });

      if (nearbyResponders.length > 0) {
        return nearbyResponders;
      }
    } catch (err) {
      logger.warn({ err }, 'Geospatial query failed; falling back to non-geospatial responder search');
    }
  }

  // Fallback: Return any available verified responders if none nearby or location missing
  return await User.find(baseQuery).limit(20);
};

/**
 * Create a new Incident (SOS or manual report).
 * Client-sent severity, status, createdBy, and incidentNumber are ignored.
 */
export const createIncident = async (user, data) => {
  const isSOS = Boolean(data.isSOS);
  const category = data.category || (isSOS ? CATEGORIES.MEDICAL : null);

  if (!isSOS && !category) {
    throw new AppError('Category is required for manual incident reports', 400, 'VALIDATION_ERROR');
  }

  if (!isSOS && (!data.description || data.description.trim().length === 0)) {
    throw new AppError('Description is required for manual incident reports', 400, 'VALIDATION_ERROR');
  }

  // Calculate severity via pure rules
  const severity = calculateSeverity({
    isSOS,
    category,
    checklist: data.checklist || {},
  });

  // Handle location: GeoJSON Point [lng, lat]
  let geoCoordinates = [0, 0];
  let locationAvailable = false;

  if (data.location) {
    const point = toGeoJSONPoint(data.location);
    if (point) {
      geoCoordinates = point;
      locationAvailable = true;
    }
  }

  // Generate atomic sequential human-readable incident number
  const incidentNumber = await getNextIncidentNumber();

  // Create incident document
  const incident = await Incident.create({
    incidentNumber,
    createdBy: user._id,
    category: category || CATEGORIES.OTHER,
    description: data.description?.trim() || (isSOS ? 'Emergency SOS Triggered' : ''),
    isSOS,
    severity,
    status: STATUSES.PENDING,
    location: {
      type: 'Point',
      coordinates: geoCoordinates,
    },
    locationAvailable,
    address: data.address?.trim() || '',
    checklist: data.checklist || {},
    statusHistory: [
      {
        status: STATUSES.PENDING,
        changedBy: user._id,
        at: new Date(),
        note: isSOS ? 'Emergency SOS initiated' : 'Incident reported',
      },
    ],
  });

  // Find eligible responders and notify them
  const eligibleResponders = await findEligibleResponders(
    locationAvailable ? geoCoordinates : null,
    env.ALERT_RADIUS_KM,
    []
  );

  const notifications = eligibleResponders.map((r) => ({
    userId: r._id,
    type: NOTIFICATION_TYPES.INCIDENT_NEW,
    title: `New Emergency Alert: ${severity}`,
    message: `A new ${category} emergency (${incidentNumber}) has been reported nearby.`,
    relatedIncident: incident._id,
  }));

  if (notifications.length > 0) {
    await createBulkNotifications(notifications);
  }

  // If CRITICAL, also alert system admins
  if (severity === SEVERITIES.CRITICAL) {
    const admins = await User.find({ role: ROLES.ADMIN, isActive: true });
    const adminNotifications = admins.map((a) => ({
      userId: a._id,
      type: NOTIFICATION_TYPES.CRITICAL_UNASSIGNED,
      title: `CRITICAL Incident Alert: ${incidentNumber}`,
      message: `Critical emergency reported: ${category}. Immediate attention required.`,
      relatedIncident: incident._id,
    }));
    if (adminNotifications.length > 0) {
      await createBulkNotifications(adminNotifications);
    }
  }

  const savedIncident = await Incident.findById(incident._id).populate('createdBy', 'name email phone');
  emitIncidentNew(savedIncident);
  startEscalationTimer(savedIncident);
  return savedIncident;
};

/**
 * Get incident by ID with ownership check (IDOR protection: return 404 for unauthorized callers).
 */
export const getIncidentById = async (incidentId, user) => {
  if (!mongoose.Types.ObjectId.isValid(incidentId)) {
    throw new AppError('Incident not found', 404, 'NOT_FOUND');
  }

  const incident = await Incident.findById(incidentId)
    .populate('createdBy', 'name email phone')
    .populate('assignedResponder', RESPONDER_POPULATE_FIELDS);

  if (!incident) {
    throw new AppError('Incident not found', 404, 'NOT_FOUND');
  }

  // Authorization / IDOR Protection
  if (user.role === ROLES.ADMIN) {
    return incident;
  }

  if (user.role === ROLES.USER) {
    if (incident.createdBy._id.toString() !== user._id.toString()) {
      // Must return 404 rather than 403 to prevent resource existence disclosure
      throw new AppError('Incident not found', 404, 'NOT_FOUND');
    }
    return incident;
  }

  if (user.role === ROLES.RESPONDER) {
    const isAssigned =
      incident.assignedResponder &&
      incident.assignedResponder._id.toString() === user._id.toString();

    // A responder can view if assigned, or if the incident is currently PENDING (available to claim)
    const isAvailableToClaim =
      incident.status === STATUSES.PENDING &&
      !incident.declinedBy.some((id) => id.toString() === user._id.toString());

    if (!isAssigned && !isAvailableToClaim) {
      throw new AppError('Incident not found', 404, 'NOT_FOUND');
    }
    return incident;
  }

  throw new AppError('Incident not found', 404, 'NOT_FOUND');
};

/**
 * List incidents scoped to user's role with filters and pagination.
 */
export const listIncidents = async (user, queryParams = {}) => {
  const {
    page = 1,
    limit = 20,
    status,
    severity,
    category,
    scope,
    from,
    to,
  } = queryParams;

  const filter = {};

  if (status) filter.status = status;
  if (severity) filter.severity = severity;
  if (category) filter.category = category;

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  // Role scoping
  if (user.role === ROLES.USER) {
    filter.createdBy = user._id;
  } else if (user.role === ROLES.RESPONDER) {
    if (scope === 'available') {
      filter.status = STATUSES.PENDING;
      filter.declinedBy = { $ne: user._id };
    } else if (scope === 'assigned') {
      filter.assignedResponder = user._id;
      filter.status = {
        $in: [STATUSES.ASSIGNED, STATUSES.ACCEPTED, STATUSES.IN_PROGRESS],
      };
    } else if (scope === 'completed') {
      filter.assignedResponder = user._id;
      filter.status = { $in: [STATUSES.RESOLVED, STATUSES.CANCELLED] };
    } else {
      // Default responder view: incidents they are assigned to, or pending incidents
      filter.$or = [
        { assignedResponder: user._id },
        { status: STATUSES.PENDING, declinedBy: { $ne: user._id } },
      ];
    }
  }
  // ADMIN sees all incidents matching the filter

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Incident.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('createdBy', 'name email phone')
      .populate('assignedResponder', RESPONDER_POPULATE_FIELDS),
    Incident.countDocuments(filter),
  ]);

  return {
    items,
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
};

/**
 * Transition incident status through the state machine.
 * This is the SINGLE authority for status changes in the system.
 */
export const transitionIncident = async (
  incidentId,
  toStatus,
  actor,
  note = '',
  extraUpdates = {}
) => {
  if (!mongoose.Types.ObjectId.isValid(incidentId)) {
    throw new AppError('Incident not found', 404, 'NOT_FOUND');
  }

  const incident = await Incident.findById(incidentId);
  if (!incident) {
    throw new AppError('Incident not found', 404, 'NOT_FOUND');
  }

  const currentStatus = incident.status;

  // 1. Check structural transition validity against map
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(toStatus)) {
    throw new AppError(
      `Transition from ${currentStatus} to ${toStatus} is not allowed`,
      409,
      'INVALID_TRANSITION'
    );
  }

  // 2. Check Actor Guards and Prerequisites
  if (currentStatus === STATUSES.PENDING && toStatus === STATUSES.ASSIGNED) {
    if (actor.role !== ROLES.ADMIN) {
      throw new AppError('Only administrators can assign responders', 403, 'FORBIDDEN');
    }
  } else if (currentStatus === STATUSES.PENDING && toStatus === STATUSES.ACCEPTED) {
    if (actor.role !== ROLES.RESPONDER) {
      throw new AppError('Only responders can accept incidents', 403, 'FORBIDDEN');
    }
    if (actor.responderProfile?.verificationStatus !== VERIFICATION_STATUSES.VERIFIED) {
      throw new AppError('Responder must be verified to accept incidents', 403, 'FORBIDDEN');
    }
    if (actor.responderProfile?.responderType === RESPONDER_TYPES.VOLUNTEER) {
      throw new AppError('Volunteer responders cannot self-claim incidents. Volunteers must be assigned by an administrator.', 403, 'FORBIDDEN');
    }
  } else if (currentStatus === STATUSES.ASSIGNED && toStatus === STATUSES.ACCEPTED) {
    if (
      actor.role !== ROLES.RESPONDER ||
      incident.assignedResponder?.toString() !== actor._id.toString()
    ) {
      throw new AppError('Only the assigned responder can accept this incident', 403, 'FORBIDDEN');
    }
  } else if (currentStatus === STATUSES.ASSIGNED && toStatus === STATUSES.PENDING) {
    // Decline by responder, reassign by admin, or creator reporting unsafe
    const isAssignedResponder =
      actor.role === ROLES.RESPONDER &&
      incident.assignedResponder?.toString() === actor._id.toString();
    const isAdmin = actor.role === ROLES.ADMIN;
    const isCreator =
      actor.role === ROLES.USER &&
      incident.createdBy?.toString() === actor._id.toString();

    if (!isAssignedResponder && !isAdmin && !isCreator) {
      if (actor.role === ROLES.USER) {
        throw new AppError('Incident not found', 404, 'NOT_FOUND');
      }
      throw new AppError('Not authorized to return incident to pending', 403, 'FORBIDDEN');
    }
  } else if (
    (currentStatus === STATUSES.ACCEPTED || currentStatus === STATUSES.IN_PROGRESS) &&
    toStatus === STATUSES.PENDING
  ) {
    // "I feel unsafe": creator reporting assigned responder
    const isCreator =
      actor.role === ROLES.USER &&
      incident.createdBy?.toString() === actor._id.toString();
    const isAdmin = actor.role === ROLES.ADMIN;

    if (!isCreator && !isAdmin) {
      if (actor.role === ROLES.USER) {
        throw new AppError('Incident not found', 404, 'NOT_FOUND');
      }
      throw new AppError('Not authorized to report responder for this incident', 403, 'FORBIDDEN');
    }
  } else if (currentStatus === STATUSES.ACCEPTED && toStatus === STATUSES.IN_PROGRESS) {
    if (
      actor.role !== ROLES.RESPONDER ||
      incident.assignedResponder?.toString() !== actor._id.toString()
    ) {
      throw new AppError('Only the assigned responder can start this incident', 403, 'FORBIDDEN');
    }
  } else if (currentStatus === STATUSES.IN_PROGRESS && toStatus === STATUSES.RESOLVED) {
    const isAssignedResponder =
      actor.role === ROLES.RESPONDER &&
      incident.assignedResponder?.toString() === actor._id.toString();
    const isAdmin = actor.role === ROLES.ADMIN;

    if (!isAssignedResponder && !isAdmin) {
      throw new AppError('Only the assigned responder or an admin can resolve this incident', 403, 'FORBIDDEN');
    }
  } else if (toStatus === STATUSES.CANCELLED) {
    const isCreator =
      actor.role === ROLES.USER &&
      incident.createdBy.toString() === actor._id.toString();
    const isAdmin = actor.role === ROLES.ADMIN;

    if (!isCreator && !isAdmin) {
      throw new AppError('Not authorized to cancel this incident', 403, 'FORBIDDEN');
    }

    // User cannot cancel once incident is IN_PROGRESS
    if (isCreator && currentStatus === STATUSES.IN_PROGRESS) {
      throw new AppError(
        'Cannot cancel an incident that is already in progress. Please contact responder or admin.',
        403,
        'FORBIDDEN'
      );
    }
  } else if (toStatus === STATUSES.REJECTED) {
    if (actor.role !== ROLES.ADMIN) {
      throw new AppError('Only administrators can reject incidents', 403, 'FORBIDDEN');
    }
  }

  // 3. Conditional Atomic Update to prevent race conditions
  const updateQuery = {
    _id: incidentId,
    status: currentStatus,
  };

  const updateDoc = {
    $set: {
      status: toStatus,
    },
    $push: {
      statusHistory: {
        status: toStatus,
        changedBy: actor._id,
        at: new Date(),
        note: note || `Status changed from ${currentStatus} to ${toStatus}`,
      },
    },
  };

  for (const [key, val] of Object.entries(extraUpdates)) {
    if (key.startsWith('$')) {
      updateDoc[key] = { ...(updateDoc[key] || {}), ...val };
    } else if (key !== 'reportedResponderId' && key !== 'safetyReason') {
      updateDoc.$set[key] = val;
    }
  }

  const updatedIncident = await Incident.findOneAndUpdate(updateQuery, updateDoc, {
    returnDocument: 'after',
  })
    .populate('createdBy', 'name email phone')
    .populate('assignedResponder', RESPONDER_POPULATE_FIELDS);

  if (!updatedIncident) {
    throw new AppError(
      'Incident state was modified by another operation. Please refresh.',
      409,
      'INVALID_TRANSITION'
    );
  }

  // 4. Handle Side Effects
  // When an incident is accepted: set responder status to BUSY
  if (toStatus === STATUSES.ACCEPTED && updatedIncident.assignedResponder) {
    await User.findByIdAndUpdate(updatedIncident.assignedResponder._id, {
      'responderProfile.availability': AVAILABILITY.BUSY,
    });
    leaveRespondersOnline(updatedIncident.assignedResponder._id);
  }

  // When an incident reaches terminal state (RESOLVED, CANCELLED): free responder back to ONLINE
  if (
    (toStatus === STATUSES.RESOLVED || toStatus === STATUSES.CANCELLED) &&
    updatedIncident.assignedResponder
  ) {
    await User.findByIdAndUpdate(updatedIncident.assignedResponder._id, {
      'responderProfile.availability': AVAILABILITY.ONLINE,
    });
    joinRespondersOnline(updatedIncident.assignedResponder._id);
  }

  // Create notifications for participants
  if (toStatus === STATUSES.ACCEPTED) {
    await createNotification({
      userId: updatedIncident.createdBy._id,
      type: NOTIFICATION_TYPES.INCIDENT_ACCEPTED,
      title: 'Responder on the Way',
      message: `${actor.name || 'A responder'} has accepted your emergency request.`,
      relatedIncident: updatedIncident._id,
    });
  } else if (toStatus === STATUSES.IN_PROGRESS) {
    await createNotification({
      userId: updatedIncident.createdBy._id,
      type: NOTIFICATION_TYPES.STATUS_CHANGED,
      title: 'Response In Progress',
      message: 'Responder is actively managing your incident.',
      relatedIncident: updatedIncident._id,
    });
  } else if (toStatus === STATUSES.RESOLVED) {
    await createNotification({
      userId: updatedIncident.createdBy._id,
      type: NOTIFICATION_TYPES.STATUS_CHANGED,
      title: 'Incident Resolved',
      message: 'Your emergency incident has been marked as resolved.',
      relatedIncident: updatedIncident._id,
    });
  } else if (toStatus === STATUSES.CANCELLED) {
    const notifyUser = actor.role !== ROLES.USER;
    if (notifyUser) {
      await createNotification({
        userId: updatedIncident.createdBy._id,
        type: NOTIFICATION_TYPES.INCIDENT_CANCELLED,
        title: 'Incident Cancelled',
        message: `Your incident was cancelled: ${extraUpdates.cancelReason || 'Cancelled by admin'}`,
        relatedIncident: updatedIncident._id,
      });
    }
  }

  // When an incident is moved back to PENDING due to safety report or decline
  if (
    toStatus === STATUSES.PENDING &&
    (extraUpdates.reportedResponderId || (actor.role === ROLES.USER && incident.assignedResponder))
  ) {
    const reportedId =
      extraUpdates.reportedResponderId ||
      incident.assignedResponder?._id ||
      incident.assignedResponder;

    if (reportedId) {
      await User.findByIdAndUpdate(reportedId, {
        'responderProfile.verificationStatus': VERIFICATION_STATUSES.PENDING,
        'responderProfile.availability': AVAILABILITY.OFFLINE,
      });
      leaveRespondersOnline(reportedId);

      // Notify admins
      const admins = await User.find({ role: ROLES.ADMIN, isActive: true });
      const adminNotifications = admins.map((a) => ({
        userId: a._id,
        type: NOTIFICATION_TYPES.STATUS_CHANGED,
        title: `Safety Alert: Responder Reported (${updatedIncident.incidentNumber})`,
        message: `Citizen reported safety concern with responder for incident ${updatedIncident.incidentNumber}.${extraUpdates.safetyReason ? ` Reason: ${extraUpdates.safetyReason}` : ''}`,
        relatedIncident: updatedIncident._id,
      }));
      if (adminNotifications.length > 0) {
        await createBulkNotifications(adminNotifications);
      }

      // Re-notify nearby verified responders
      const eligibleResponders = await findEligibleResponders(
        updatedIncident.locationAvailable ? updatedIncident.location.coordinates : null,
        env.ALERT_RADIUS_KM,
        updatedIncident.declinedBy || [reportedId]
      );
      const responderNotifications = eligibleResponders.map((r) => ({
        userId: r._id,
        type: NOTIFICATION_TYPES.INCIDENT_NEW,
        title: `Emergency Re-Alert: ${updatedIncident.severity}`,
        message: `Emergency (${updatedIncident.incidentNumber}) is available again in your sector.`,
        relatedIncident: updatedIncident._id,
      }));
      if (responderNotifications.length > 0) {
        await createBulkNotifications(responderNotifications);
      }

      emitIncidentNew(updatedIncident);
    }
  }

  if (toStatus !== STATUSES.PENDING) {
    cancelEscalationTimer(updatedIncident._id);
  } else {
    startEscalationTimer(updatedIncident);
  }

  if (toStatus === STATUSES.ASSIGNED || toStatus === STATUSES.ACCEPTED) {
    emitIncidentTaken(updatedIncident._id);
  }
  emitIncidentUpdated(updatedIncident);

  return updatedIncident;
};

/**
 * Claim Incident (Atomic self-assignment by verified responder).
 * Uses findOneAndUpdate on { _id, status: 'PENDING' } so two concurrent responders cannot claim the same incident.
 */
export const claimIncident = async (incidentId, responder) => {
  if (responder.role !== ROLES.RESPONDER) {
    throw new AppError('Only responders can claim incidents', 403, 'FORBIDDEN');
  }

  if (responder.responderProfile?.verificationStatus !== VERIFICATION_STATUSES.VERIFIED) {
    throw new AppError('You must be verified by an administrator before claiming emergencies', 403, 'FORBIDDEN');
  }

  if (responder.responderProfile?.responderType === RESPONDER_TYPES.VOLUNTEER) {
    throw new AppError(
      'Volunteer responders cannot self-claim incidents. Volunteers can only be assigned by an administrator.',
      403,
      'FORBIDDEN'
    );
  }

  if (responder.responderProfile?.availability === AVAILABILITY.BUSY) {
    throw new AppError('You are currently busy with another incident', 409, 'RESPONDER_UNAVAILABLE');
  }

  // Atomic conditional update
  const updatedIncident = await Incident.findOneAndUpdate(
    {
      _id: incidentId,
      status: STATUSES.PENDING,
      declinedBy: { $ne: responder._id },
    },
    {
      $set: {
        status: STATUSES.ACCEPTED,
        assignedResponder: responder._id,
        acceptedAt: new Date(),
      },
      $push: {
        statusHistory: {
          status: STATUSES.ACCEPTED,
          changedBy: responder._id,
          at: new Date(),
          note: 'Claimed by responder',
        },
      },
    },
    { returnDocument: 'after' }
  )
    .populate('createdBy', 'name email phone')
    .populate('assignedResponder', RESPONDER_POPULATE_FIELDS);

  if (!updatedIncident) {
    const exists = await Incident.findById(incidentId);
    if (!exists) {
      throw new AppError('Incident not found', 404, 'NOT_FOUND');
    }
    // Incident exists but was already claimed or state changed
    throw new AppError('Another responder accepted this incident', 409, 'ALREADY_TAKEN');
  }

  // Side effect: Mark responder as BUSY
  await User.findByIdAndUpdate(responder._id, {
    'responderProfile.availability': AVAILABILITY.BUSY,
  });
  leaveRespondersOnline(responder._id);

  // Notify creator
  await createNotification({
    userId: updatedIncident.createdBy._id,
    type: NOTIFICATION_TYPES.INCIDENT_ACCEPTED,
    title: 'Emergency Claimed',
    message: `${responder.name} has accepted your emergency request and is responding.`,
    relatedIncident: updatedIncident._id,
  });

  // Cancel pending escalation timer since incident is claimed
  cancelEscalationTimer(updatedIncident._id);

  emitIncidentTaken(updatedIncident._id);
  emitIncidentUpdated(updatedIncident);

  return updatedIncident;
};

/**
 * Admin assigns or reassigns an incident to a specific responder.
 */
export const adminAssignIncident = async (incidentId, admin, responderId) => {
  if (admin.role !== ROLES.ADMIN) {
    throw new AppError('Admin permission required', 403, 'FORBIDDEN');
  }

  const incident = await Incident.findById(incidentId);
  if (!incident) {
    throw new AppError('Incident not found', 404, 'NOT_FOUND');
  }

  const targetResponder = await User.findById(responderId);
  if (!targetResponder || targetResponder.role !== ROLES.RESPONDER) {
    throw new AppError('Target responder not found', 404, 'NOT_FOUND');
  }

  if (targetResponder.responderProfile?.verificationStatus !== VERIFICATION_STATUSES.VERIFIED) {
    throw new AppError('Target responder is not verified', 400, 'VALIDATION_ERROR');
  }

  if (
    targetResponder.responderProfile?.responderType === RESPONDER_TYPES.VOLUNTEER &&
    incident.severity === SEVERITIES.CRITICAL
  ) {
    throw new AppError(
      'Volunteer responders cannot be assigned to CRITICAL incidents',
      400,
      'VALIDATION_ERROR'
    );
  }

  return await transitionIncident(
    incidentId,
    STATUSES.ASSIGNED,
    admin,
    `Assigned to responder ${targetResponder.name}`,
    {
      assignedResponder: targetResponder._id,
      assignedAt: new Date(),
    }
  );
};

/**
 * Responder declines an incident.
 */
export const declineIncident = async (incidentId, responder, reason = '') => {
  if (responder.role !== ROLES.RESPONDER) {
    throw new AppError('Only responders can decline incidents', 403, 'FORBIDDEN');
  }

  const incident = await Incident.findById(incidentId);
  if (!incident) {
    throw new AppError('Incident not found', 404, 'NOT_FOUND');
  }

  // If incident is currently assigned to this responder, transition back to PENDING
  if (
    incident.status === STATUSES.ASSIGNED &&
    incident.assignedResponder?.toString() === responder._id.toString()
  ) {
    return await transitionIncident(
      incidentId,
      STATUSES.PENDING,
      responder,
      reason || 'Declined by assigned responder',
      {
        assignedResponder: null,
        $push: { declinedBy: responder._id },
      }
    );
  }

  // If it's a pending incident from the feed, record decline so it is never offered again
  return await Incident.findByIdAndUpdate(
    incidentId,
    { $addToSet: { declinedBy: responder._id } },
    { returnDocument: 'after' }
  );
};

/**
 * Cancel an incident.
 */
export const cancelIncident = async (incidentId, actor, reason) => {
  if (!reason || reason.trim().length === 0) {
    throw new AppError('Cancellation reason is required', 400, 'VALIDATION_ERROR');
  }

  return await transitionIncident(
    incidentId,
    STATUSES.CANCELLED,
    actor,
    reason.trim(),
    { cancelReason: reason.trim() }
  );
};

/**
 * Reject an incident (ADMIN only).
 */
export const rejectIncident = async (incidentId, admin, reason) => {
  if (!reason || reason.trim().length === 0) {
    throw new AppError('Rejection reason is required', 400, 'VALIDATION_ERROR');
  }

  return await transitionIncident(
    incidentId,
    STATUSES.REJECTED,
    admin,
    reason.trim(),
    { cancelReason: reason.trim() }
  );
};

/**
 * Admin override of incident severity.
 */
export const overrideSeverity = async (incidentId, admin, newSeverity, reason) => {
  if (admin.role !== ROLES.ADMIN) {
    throw new AppError('Admin permission required', 403, 'FORBIDDEN');
  }

  if (!SEVERITY_VALUES.includes(newSeverity)) {
    throw new AppError(`Invalid severity: ${newSeverity}`, 400, 'VALIDATION_ERROR');
  }

  if (!reason || reason.trim().length === 0) {
    throw new AppError('Reason required for severity override', 400, 'VALIDATION_ERROR');
  }

  const incident = await Incident.findById(incidentId);
  if (!incident) {
    throw new AppError('Incident not found', 404, 'NOT_FOUND');
  }

  const oldSeverity = incident.severity;
  incident.severity = newSeverity;
  incident.statusHistory.push({
    status: incident.status,
    changedBy: admin._id,
    at: new Date(),
    note: `Severity changed from ${oldSeverity} to ${newSeverity}: ${reason}`,
  });

  await incident.save();
  emitIncidentUpdated(incident);
  return incident;
};

/**
 * Report responder for safety concern ("I feel unsafe").
 * Creator only, allowed when status is ACCEPTED, IN_PROGRESS, or ASSIGNED.
 * Resets incident to PENDING and responder to PENDING verification and OFFLINE availability.
 */
export const reportResponder = async (incidentId, user, reason = '') => {
  if (!mongoose.Types.ObjectId.isValid(incidentId)) {
    throw new AppError('Incident not found', 404, 'NOT_FOUND');
  }

  const incident = await Incident.findById(incidentId);
  if (!incident) {
    throw new AppError('Incident not found', 404, 'NOT_FOUND');
  }

  // Creator only: other users get 404
  if (incident.createdBy.toString() !== user._id.toString()) {
    throw new AppError('Incident not found', 404, 'NOT_FOUND');
  }

  const allowedStatuses = [STATUSES.ASSIGNED, STATUSES.ACCEPTED, STATUSES.IN_PROGRESS];
  if (!allowedStatuses.includes(incident.status)) {
    throw new AppError(
      `Cannot report responder for incident with status ${incident.status}`,
      409,
      'INVALID_TRANSITION'
    );
  }

  const responderId = incident.assignedResponder?._id || incident.assignedResponder;
  const note = reason?.trim()
    ? `Citizen reported safety concern: ${reason.trim()}`
    : 'Citizen reported safety concern with responder; incident reset to pending';

  return await transitionIncident(
    incidentId,
    STATUSES.PENDING,
    user,
    note,
    {
      assignedResponder: null,
      $addToSet: { declinedBy: responderId },
      reportedResponderId: responderId,
      safetyReason: reason?.trim() || '',
    }
  );
};

/**
 * Retrieve medical info for an incident.
 *
 * Privacy access control:
 * Returns medicalInfo ONLY when ALL are true:
 * 1. Requester is the assigned responder (req.user._id === incident.assignedResponder)
 * 2. Incident status is ACCEPTED or IN_PROGRESS
 * 3. The incident creator has shareWithResponders === true
 *
 * Live value is queried on every call (no caching).
 * Otherwise returns null, without revealing whether data exists.
 */
export const getIncidentMedicalInfo = async (incidentId, requesterUser) => {
  const incident = await Incident.findById(incidentId);
  if (!incident) {
    throw new AppError('Incident not found', 404, 'NOT_FOUND');
  }

  // 1. Check if requester is the assigned responder
  const requesterId = (requesterUser?._id || requesterUser)?.toString();
  const assignedId = (incident.assignedResponder?._id || incident.assignedResponder)?.toString();

  if (!requesterId || !assignedId || requesterId !== assignedId) {
    return null;
  }

  // 2. Incident status must be ACCEPTED or IN_PROGRESS
  if (![STATUSES.ACCEPTED, STATUSES.IN_PROGRESS].includes(incident.status)) {
    return null;
  }

  // 3. Incident creator must have shareWithResponders = true
  const creatorId = (incident.createdBy?._id || incident.createdBy)?.toString();
  if (!creatorId) {
    return null;
  }

  // Live lookup of creator with medicalInfo (no caching)
  const creator = await User.findById(creatorId).select('+medicalInfo');
  if (!creator || !creator.medicalInfo || creator.medicalInfo.shareWithResponders !== true) {
    return null;
  }

  return {
    bloodGroup: creator.medicalInfo.bloodGroup || 'UNKNOWN',
    allergies: creator.medicalInfo.allergies || [],
    conditions: creator.medicalInfo.conditions || [],
    medications: creator.medicalInfo.medications || [],
    notes: creator.medicalInfo.notes || '',
    shareWithResponders: creator.medicalInfo.shareWithResponders,
  };
};

export default {
  getNextIncidentNumber,
  findEligibleResponders,
  createIncident,
  getIncidentById,
  listIncidents,
  transitionIncident,
  claimIncident,
  adminAssignIncident,
  declineIncident,
  cancelIncident,
  rejectIncident,
  overrideSeverity,
  reportResponder,
  getIncidentMedicalInfo,
};

