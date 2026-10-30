import { ROLES } from '../constants/roles.js';
import { AVAILABILITY, VERIFICATION_STATUSES } from '../constants/responder.js';

export const ROOMS = {
  RESPONDERS_ONLINE: 'responders:online',
  ADMINS: 'admins',
};

export const getUserRoom = (userId) => `user:${userId}`;
export const getIncidentRoom = (incidentId) => `incident:${incidentId}`;

/**
 * Automatically places an authenticated socket into its personal user room
 * and relevant role rooms (admins, responders:online).
 *
 * @param {import('socket.io').Socket} socket
 */
export const autoJoinRooms = (socket) => {
  const user = socket.user;
  if (!user) return;

  // 1. Personal private user room for targeted notifications
  socket.join(getUserRoom(user._id));

  // 2. Admins room for system-wide alerts
  if (user.role === ROLES.ADMIN) {
    socket.join(ROOMS.ADMINS);
  }

  // 3. Responders room: only if VERIFIED and currently ONLINE
  if (
    user.role === ROLES.RESPONDER &&
    user.responderProfile?.verificationStatus === VERIFICATION_STATUSES.VERIFIED &&
    user.responderProfile?.availability === AVAILABILITY.ONLINE
  ) {
    socket.join(ROOMS.RESPONDERS_ONLINE);
  }
};
