import { ROLES } from '../constants/roles.js';
import { STATUSES } from '../constants/statuses.js';
import { calculateDistanceKm } from './geo.js';

/**
 * Single authority serializer for incident objects in API responses and socket emits.
 * Enforces least information disclosure rules for first responders before accepting an incident.
 *
 * Rules:
 * - If viewer is a RESPONDER and the incident is NOT assigned to them or NOT yet accepted:
 *   Remove name, phone, exact coordinates, and address.
 *   Return only: id, incidentNumber, category, severity, createdAt, approximateLocation (rounded to 2 decimals), distanceKm (rounded to 0.5).
 * - After accept (ACCEPTED or IN_PROGRESS or RESOLVED), return exact location, name, and phone.
 * - If viewer is ADMIN or the incident creator (USER), return full incident details.
 *
 * @param {Object} incident - Mongoose doc or plain JS incident object
 * @param {Object} [viewer] - User document or object with { _id, role, responderProfile }
 * @param {Object} [options] - Additional options (e.g. viewerCoords)
 * @returns {Object|null}
 */
export const serializeIncident = (incident, viewer = null, options = {}) => {
  if (!incident) return null;

  const inc = typeof incident.toObject === 'function' ? incident.toObject() : { ...incident };
  const incidentId = (inc._id || inc.id || inc.incidentId)?.toString();

  const viewerRole = viewer?.role;
  const viewerId = viewer?._id ? viewer._id.toString() : (typeof viewer === 'string' ? viewer : null);

  // 1. ADMIN sees full incident
  if (viewerRole === ROLES.ADMIN) {
    return {
      ...inc,
      id: incidentId,
      _id: incidentId,
      incidentId,
    };
  }

  // 2. Incident creator (citizen USER) sees full incident
  const creatorId = (inc.createdBy?._id || inc.createdBy)?.toString();
  if (viewerRole === ROLES.USER && viewerId && creatorId && viewerId === creatorId) {
    return {
      ...inc,
      id: incidentId,
      _id: incidentId,
      incidentId,
    };
  }

  // 3. RESPONDER rules:
  if (viewerRole === ROLES.RESPONDER) {
    const assignedResponderId = (inc.assignedResponder?._id || inc.assignedResponder)?.toString();
    const isAssignedToThisResponder = Boolean(
      viewerId && assignedResponderId && viewerId === assignedResponderId
    );
    const isAcceptedOrBeyond = [
      STATUSES.ACCEPTED,
      STATUSES.IN_PROGRESS,
      STATUSES.RESOLVED,
    ].includes(inc.status);

    // After accept: return full details, including exact location, name, and phone
    if (isAssignedToThisResponder && isAcceptedOrBeyond) {
      const citizenName = inc.createdBy?.name || inc.name;
      const citizenPhone = inc.createdBy?.phone || inc.phone;

      return {
        ...inc,
        id: incidentId,
        _id: incidentId,
        incidentId,
        name: citizenName,
        phone: citizenPhone,
      };
    }

    // Before accept / not yet assigned to this responder:
    // Mask name, phone, exact coordinates, and address
    let lat = null;
    let lng = null;

    if (inc.location?.coordinates && Array.isArray(inc.location.coordinates)) {
      lng = inc.location.coordinates[0];
      lat = inc.location.coordinates[1];
    } else if (inc.location?.lat !== undefined && inc.location?.lng !== undefined) {
      lat = inc.location.lat;
      lng = inc.location.lng;
    }

    let approximateLocation = null;
    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      const approxLat = Math.round(Number(lat) * 100) / 100;
      const approxLng = Math.round(Number(lng) * 100) / 100;
      approximateLocation = {
        lat: approxLat,
        lng: approxLng,
        coordinates: [approxLng, approxLat],
      };
    }

    let distanceKm = null;
    const viewerCoords =
      viewer?.responderProfile?.currentLocation?.coordinates ||
      options.viewerCoords ||
      null;

    if (viewerCoords && lat !== null && lng !== null) {
      const rawDist = calculateDistanceKm(viewerCoords, [lng, lat]);
      if (rawDist !== null && !isNaN(rawDist)) {
        distanceKm = Math.round(rawDist * 2) / 2;
      }
    }

    return {
      id: incidentId,
      _id: incidentId,
      incidentId,
      incidentNumber: inc.incidentNumber,
      category: inc.category,
      severity: inc.severity,
      createdAt: inc.createdAt,
      approximateLocation,
      distanceKm,
      status: inc.status,
    };
  }

  // 4. Default / Unauthenticated / Public fallbacks
  let lat = null;
  let lng = null;
  if (inc.location?.coordinates && Array.isArray(inc.location.coordinates)) {
    lng = inc.location.coordinates[0];
    lat = inc.location.coordinates[1];
  } else if (inc.location?.lat !== undefined && inc.location?.lng !== undefined) {
    lat = inc.location.lat;
    lng = inc.location.lng;
  }

  let approximateLocation = null;
  if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
    const approxLat = Math.round(Number(lat) * 100) / 100;
    const approxLng = Math.round(Number(lng) * 100) / 100;
    approximateLocation = {
      lat: approxLat,
      lng: approxLng,
      coordinates: [approxLng, approxLat],
    };
  }

  return {
    id: incidentId,
    _id: incidentId,
    incidentId,
    incidentNumber: inc.incidentNumber,
    category: inc.category,
    severity: inc.severity,
    createdAt: inc.createdAt,
    approximateLocation,
    distanceKm: null,
    status: inc.status,
  };
};

export default serializeIncident;
