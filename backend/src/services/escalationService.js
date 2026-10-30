import Incident from '../models/Incident.js';
import User from '../models/User.js';
import { STATUSES } from '../constants/statuses.js';
import { ROLES } from '../constants/roles.js';
import { NOTIFICATION_TYPES } from '../constants/responder.js';
import { createBulkNotifications } from './notificationService.js';
import { findEligibleResponders } from './incidentService.js';
import { emitIncidentEscalated, emitIncidentNew } from '../sockets/realtimeEmitter.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

// Map of active escalation timers: incidentId -> NodeJS.Timeout
const activeEscalationTimers = new Map();

/**
 * Get timeout duration in milliseconds.
 * In test environment defaults to 200ms; in development/production defaults to CLAIM_TIMEOUT_SEC (60s).
 */
const getEscalationTimeoutMs = (customTimeoutSec) => {
  if (customTimeoutSec !== undefined && customTimeoutSec !== null) {
    return customTimeoutSec * 1000;
  }
  if (process.env.NODE_ENV === 'test') {
    return 200;
  }
  return (env.CLAIM_TIMEOUT_SEC || 60) * 1000;
};

/**
 * Starts an escalation timer for a newly reported emergency.
 * If the incident remains in PENDING status past the claim timeout:
 * 1. Alerts all active administrators via notifications and socket event.
 * 2. Widens the search radius (e.g. 2x ALERT_RADIUS_KM) and re-alerts eligible responders.
 *
 * @param {Object} incident - Mongoose Incident document or plain object
 * @param {number} [customTimeoutSec] - Optional timeout override
 */
export const startEscalationTimer = (incident, customTimeoutSec = null) => {
  if (!incident || !incident._id) return;
  const incidentId = incident._id.toString();

  // If already scheduled, avoid duplicate timers
  if (activeEscalationTimers.has(incidentId)) {
    return;
  }

  const timeoutMs = getEscalationTimeoutMs(customTimeoutSec);

  const timer = setTimeout(async () => {
    activeEscalationTimers.delete(incidentId);

    try {
      const currentIncident = await Incident.findById(incidentId).populate(
        'createdBy',
        'name email phone'
      );

      // Only escalate if the incident is still PENDING (not claimed, assigned, or cancelled)
      if (!currentIncident || currentIncident.status !== STATUSES.PENDING) {
        return;
      }

      const initialRadius = env.ALERT_RADIUS_KM || 5;
      const widenedRadius = initialRadius * 2;

      logger.warn(
        { incidentId, incidentNumber: currentIncident.incidentNumber, widenedRadius },
        'Incident unclaimed after timeout; escalating alert and widening responder search radius'
      );

      // 1. Alert Admins
      const admins = await User.find({ role: ROLES.ADMIN, isActive: true });
      const timeoutSec = Math.round(timeoutMs / 1000);

      const adminNotifications = admins.map((admin) => ({
        userId: admin._id,
        type: NOTIFICATION_TYPES.CRITICAL_UNASSIGNED,
        title: `Escalation: Unclaimed Emergency ${currentIncident.incidentNumber}`,
        message: `Emergency ${currentIncident.incidentNumber} (${currentIncident.category}) remains unclaimed after ${timeoutSec}s. Search radius widened to ${widenedRadius}km.`,
        relatedIncident: currentIncident._id,
      }));

      if (adminNotifications.length > 0) {
        await createBulkNotifications(adminNotifications);
      }

      // Emit incident:escalated real-time event to administrators
      emitIncidentEscalated(currentIncident, widenedRadius);

      // 2. Query eligible responders in widened radius and notify
      const locationCoords = currentIncident.locationAvailable
        ? currentIncident.location.coordinates
        : null;

      const expandedResponders = await findEligibleResponders(
        locationCoords,
        widenedRadius,
        currentIncident.declinedBy || []
      );

      const responderNotifications = expandedResponders.map((r) => ({
        userId: r._id,
        type: NOTIFICATION_TYPES.INCIDENT_NEW,
        title: `URGENT ESCALATION: ${currentIncident.incidentNumber}`,
        message: `Unclaimed emergency alert radius expanded to ${widenedRadius}km. First responder needed immediately.`,
        relatedIncident: currentIncident._id,
      }));

      if (responderNotifications.length > 0) {
        await createBulkNotifications(responderNotifications);
      }

      // Re-emit incident:new to online responders to re-alert any responders in the wider zone
      emitIncidentNew(currentIncident);
    } catch (err) {
      logger.error({ err, incidentId }, 'Error running alert escalation timer');
    }
  }, timeoutMs);

  activeEscalationTimers.set(incidentId, timer);
  logger.info({ incidentId, timeoutMs }, 'Escalation timer started for incident');
};

/**
 * Cancels a pending escalation timer when an incident is claimed, assigned, or cancelled.
 *
 * @param {string|mongoose.Types.ObjectId} incidentId
 */
export const cancelEscalationTimer = (incidentId) => {
  if (!incidentId) return;
  const idStr = incidentId.toString();

  if (activeEscalationTimers.has(idStr)) {
    clearTimeout(activeEscalationTimers.get(idStr));
    activeEscalationTimers.delete(idStr);
    logger.info({ incidentId: idStr }, 'Escalation timer cancelled');
  }
};

/**
 * Checks if an escalation timer is actively pending.
 *
 * @param {string|mongoose.Types.ObjectId} incidentId
 * @returns {boolean}
 */
export const isEscalationActive = (incidentId) => {
  if (!incidentId) return false;
  return activeEscalationTimers.has(incidentId.toString());
};

/**
 * Clears all pending escalation timers (used during test teardowns).
 */
export const clearAllEscalationTimers = () => {
  for (const timer of activeEscalationTimers.values()) {
    clearTimeout(timer);
  }
  activeEscalationTimers.clear();
};

export default {
  startEscalationTimer,
  cancelEscalationTimer,
  isEscalationActive,
  clearAllEscalationTimers,
};
