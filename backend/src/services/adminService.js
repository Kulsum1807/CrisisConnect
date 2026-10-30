import User from '../models/User.js';
import Incident from '../models/Incident.js';
import AppError from '../utils/AppError.js';
import { ROLES } from '../constants/roles.js';
import { STATUSES } from '../constants/statuses.js';
import { SEVERITIES } from '../constants/severities.js';
import { VERIFICATION_STATUSES } from '../constants/responder.js';

/**
 * Fetch responders with optional filtering by verificationStatus, responderType, or text search.
 */
export const getResponders = async (filters = {}) => {
  const query = { role: ROLES.RESPONDER };

  if (filters.verificationStatus) {
    query['responderProfile.verificationStatus'] = filters.verificationStatus;
  }

  if (filters.responderType) {
    query['responderProfile.responderType'] = filters.responderType;
  }

  if (filters.search) {
    const searchRegex = new RegExp(filters.search, 'i');
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
      { 'responderProfile.organisation': searchRegex },
    ];
  }

  const responders = await User.find(query)
    .select('-password -refreshTokenHash')
    .populate('responderProfile.verifiedBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  return {
    items: responders,
    total: responders.length,
  };
};

/**
 * Get aggregated dashboard statistics for system administrators.
 */
export const getDashboardStats = async () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    activeIncidents,
    criticalIncidents,
    availableResponders,
    resolvedToday,
    pendingVerificationResponders,
  ] = await Promise.all([
    Incident.countDocuments({
      status: { $in: [STATUSES.PENDING, STATUSES.ASSIGNED, STATUSES.ACCEPTED, STATUSES.IN_PROGRESS] },
    }),
    Incident.countDocuments({
      severity: SEVERITIES.CRITICAL,
      status: { $in: [STATUSES.PENDING, STATUSES.ASSIGNED, STATUSES.ACCEPTED, STATUSES.IN_PROGRESS] },
    }),
    User.countDocuments({
      role: ROLES.RESPONDER,
      'responderProfile.verificationStatus': VERIFICATION_STATUSES.VERIFIED,
      'responderProfile.availability': 'ONLINE',
    }),
    Incident.countDocuments({
      status: STATUSES.RESOLVED,
      updatedAt: { $gte: startOfToday },
    }),
    User.countDocuments({
      role: ROLES.RESPONDER,
      'responderProfile.verificationStatus': VERIFICATION_STATUSES.PENDING,
    }),
  ]);

  return {
    activeIncidents,
    criticalIncidents,
    availableResponders,
    resolvedToday,
    pendingVerificationResponders,
  };
};

/**
 * Fetch all users (Citizens, Responders, Admins) with pagination and search.
 */
export const getUsers = async (options = {}) => {
  const { role, search, page = 1, limit = 20 } = options;
  const query = {};

  if (role) {
    query.role = role;
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    query.$or = [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }];
  }

  const numPage = Math.max(1, Number(page));
  const numLimit = Math.max(1, Math.min(100, Number(limit)));
  const skip = (numPage - 1) * numLimit;

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password -refreshTokenHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numLimit)
      .lean(),
    User.countDocuments(query),
  ]);

  return {
    items: users,
    total,
    page: numPage,
    limit: numLimit,
    totalPages: Math.ceil(total / numLimit),
  };
};

/**
 * Toggle user active status (suspend/activate).
 */
export const updateUserStatus = async (userId, adminUser, isActive, reason = '') => {
  if (String(userId) === String(adminUser._id)) {
    throw new AppError('Administrators cannot suspend their own account', 400, 'BAD_REQUEST');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  user.isActive = Boolean(isActive);
  await user.save();

  return user;
};

/**
 * Return summary analytics metrics.
 */
export const getAnalytics = async () => {
  const [incidentsByCategory, incidentsBySeverity, incidentsByStatus] = await Promise.all([
    Incident.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    Incident.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
    Incident.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  return {
    incidentsByCategory,
    incidentsBySeverity,
    incidentsByStatus,
  };
};

export default {
  getResponders,
  getDashboardStats,
  getUsers,
  updateUserStatus,
  getAnalytics,
};

