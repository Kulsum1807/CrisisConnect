import mongoose from 'mongoose';
import { STATUS_VALUES, STATUSES } from '../constants/statuses.js';
import { CATEGORY_VALUES } from '../constants/categories.js';
import { SEVERITY_VALUES } from '../constants/severities.js';

const incidentSchema = new mongoose.Schema(
  {
    // Human-friendly ID like CC-1001, generated from the counters collection.
    // MongoDB ObjectId (_id) remains the true primary key.
    incidentNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // The USER who reported this incident.
    // Set from req.user._id on the server — never from the request body.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Incident must have a creator'],
      index: true,
    },

    // The RESPONDER handling the incident. Null until assigned or claimed.
    assignedResponder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    category: {
      type: String,
      enum: {
        values: CATEGORY_VALUES,
        message: '{VALUE} is not a valid category',
      },
      required: [true, 'Category is required'],
    },

    // Optional for SOS; required for manual reports (validated in Zod, not here)
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description must be at most 1000 characters'],
    },

    // true if this was an SOS trigger (one-button emergency)
    isSOS: {
      type: Boolean,
      default: false,
      required: true,
    },

    // Computed by the backend using severityRules.js — never set by the client
    severity: {
      type: String,
      enum: {
        values: SEVERITY_VALUES,
        message: '{VALUE} is not a valid severity',
      },
      required: [true, 'Severity is required'],
    },

    // Current lifecycle status — changed only through transitionIncident()
    status: {
      type: String,
      enum: {
        values: STATUS_VALUES,
        message: '{VALUE} is not a valid status',
      },
      default: STATUSES.PENDING,
      required: true,
    },

    // GeoJSON Point — coordinates order: [longitude, latitude]
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },

    // false when the user denied GPS — address is then used instead
    locationAvailable: {
      type: Boolean,
      default: true,
      required: true,
    },

    // Manual address or reverse-geocoded text (fallback when GPS denied)
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address must be at most 500 characters'],
    },

    // Medical / safety checklist answers — used for severity computation
    checklist: {
      conscious: { type: Boolean },
      breathing: { type: Boolean },
      severeBleeding: { type: Boolean },
      inDangerNow: { type: Boolean },
      injuries: { type: Boolean },
    },

    // Image URLs for evidence (Stretch feature)
    evidence: [
      {
        type: String,
        trim: true,
      },
    ],

    // Append-only audit trail — every status change is recorded here.
    // Embedded because it's small, bounded, and always read with the incident.
    statusHistory: [
      {
        status: {
          type: String,
          enum: STATUS_VALUES,
          required: true,
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        at: {
          type: Date,
          default: Date.now,
          required: true,
        },
        note: {
          type: String,
          trim: true,
          maxlength: [500, 'Note must be at most 500 characters'],
        },
      },
    ],

    // Responders who declined this incident — they won't be offered it again
    declinedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Reason stored when incident is CANCELLED or REJECTED
    cancelReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Cancel reason must be at most 500 characters'],
    },

    // Timestamps for analytics (response and resolution time calculations)
    assignedAt: { type: Date },
    acceptedAt: { type: Date },
    resolvedAt: { type: Date },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ---------- Indexes ----------

// Dashboard and pool queries: "show me PENDING+HIGH incidents, newest first"
incidentSchema.index({ status: 1, severity: 1, createdAt: -1 });

// User history: "show me my incidents, newest first"
incidentSchema.index({ createdBy: 1, createdAt: -1 });

// Responder queries: "show me my active incidents"
incidentSchema.index({ assignedResponder: 1, status: 1 });

// 2dsphere for geospatial $near queries on incident location
incidentSchema.index({ location: '2dsphere' });

const Incident = mongoose.model('Incident', incidentSchema);

export default Incident;
