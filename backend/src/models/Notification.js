import mongoose from 'mongoose';
import { NOTIFICATION_TYPE_VALUES } from '../constants/responder.js';

const notificationSchema = new mongoose.Schema(
  {
    // Recipient user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification must have a recipient'],
    },

    type: {
      type: String,
      enum: {
        values: NOTIFICATION_TYPE_VALUES,
        message: '{VALUE} is not a valid notification type',
      },
      required: [true, 'Notification type is required'],
    },

    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [200, 'Title must be at most 200 characters'],
    },

    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [500, 'Message must be at most 500 characters'],
    },

    // Optional deep link to the related incident
    relatedIncident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// ---------- Indexes ----------

// Unread counter and notification list: "my unread notifications, newest first"
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
