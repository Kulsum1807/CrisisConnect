import Notification from '../models/Notification.js';
import { emitNotificationNew } from '../sockets/realtimeEmitter.js';
import logger from '../utils/logger.js';

/**
 * Notification Service
 * Creates and queries user notifications.
 * Emits real-time notification:new event to user room.
 */

export const createNotification = async ({
  userId,
  type,
  title,
  message,
  relatedIncident = null,
}) => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      relatedIncident,
    });
    emitNotificationNew(userId, notification);
    return notification;
  } catch (error) {
    logger.error({ error, userId, type }, 'Failed to create notification');
    // Notification failure should not crash the main emergency operation
    return null;
  }
};

export const createBulkNotifications = async (notificationsList) => {
  if (!notificationsList || notificationsList.length === 0) return [];
  try {
    const created = await Notification.insertMany(notificationsList);
    for (const item of created) {
      emitNotificationNew(item.userId, item);
    }
    return created;
  } catch (error) {
    logger.error({ error }, 'Failed to create bulk notifications');
    return [];
  }
};

export const getUserNotifications = async (userId, { page = 1, limit = 20, unreadOnly = false }) => {
  const query = { userId };
  if (unreadOnly) {
    query.isRead = false;
  }

  const skip = (page - 1) * limit;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('relatedIncident', 'incidentNumber category severity status'),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

  return {
    items,
    total,
    unreadCount,
    page: Number(page),
    limit: Number(limit),
  };
};

export const markAsRead = async (notificationId, userId) => {
  return await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
    { returnDocument: 'after' }
  );
};

export const markAllAsRead = async (userId) => {
  return await Notification.updateMany({ userId, isRead: false }, { isRead: true });
};

export default {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
};
