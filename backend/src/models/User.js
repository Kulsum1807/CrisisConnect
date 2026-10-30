import mongoose from 'mongoose';
import { ROLE_VALUES, ROLES } from '../constants/roles.js';
import {
  VERIFICATION_STATUS_VALUES,
  VERIFICATION_STATUSES,
  AVAILABILITY_VALUES,
  AVAILABILITY,
  RESPONDER_TYPE_VALUES,
  RESPONDER_TYPES,
} from '../constants/responder.js';
import { RELATIONSHIP_VALUES } from '../constants/contacts.js';
import { BLOOD_GROUP_VALUES, BLOOD_GROUPS } from '../constants/medical.js';

const emergencyContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
      minlength: [2, 'Contact name must be at least 2 characters'],
      maxlength: [60, 'Contact name must be at most 60 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true,
      match: [/^\+?\d{10,15}$/, 'Please provide a valid phone number'],
    },
    relationship: {
      type: String,
      required: [true, 'Relationship is required'],
      enum: {
        values: RELATIONSHIP_VALUES,
        message: '{VALUE} is not a valid relationship',
      },
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (val) {
          if (!val) return true;
          return /^\S+@\S+\.\S+$/.test(val);
        },
        message: 'Please provide a valid email',
      },
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: true,
    timestamps: true,
  }
);

const medicalInfoSchema = new mongoose.Schema(
  {
    bloodGroup: {
      type: String,
      enum: {
        values: BLOOD_GROUP_VALUES,
        message: '{VALUE} is not a valid blood group',
      },
      default: BLOOD_GROUPS.UNKNOWN,
    },
    allergies: {
      type: [String],
      default: [],
      validate: [
        {
          validator: (arr) =>
            !arr || (arr.length <= 10 && arr.every((s) => typeof s === 'string' && s.length <= 60)),
          message: 'Allergies cannot exceed 10 items, each max 60 characters',
        },
      ],
    },
    conditions: {
      type: [String],
      default: [],
      validate: [
        {
          validator: (arr) =>
            !arr || (arr.length <= 10 && arr.every((s) => typeof s === 'string' && s.length <= 60)),
          message: 'Conditions cannot exceed 10 items, each max 60 characters',
        },
      ],
    },
    medications: {
      type: [String],
      default: [],
      validate: [
        {
          validator: (arr) =>
            !arr || (arr.length <= 10 && arr.every((s) => typeof s === 'string' && s.length <= 60)),
          message: 'Medications cannot exceed 10 items, each max 60 characters',
        },
      ],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [300, 'Notes cannot exceed 300 characters'],
      default: '',
    },
    shareWithResponders: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  }
);

const userSchema = new mongoose.Schema(

  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name must be at most 60 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^\+?\d{10,15}$/, 'Please provide a valid phone number'],
    },

    // bcrypt hash; select:false ensures it is never returned by default
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },

    // Set only by the server. Public register → USER; seed script → ADMIN.
    role: {
      type: String,
      enum: {
        values: ROLE_VALUES,
        message: '{VALUE} is not a valid role',
      },
      default: ROLES.USER,
      required: true,
    },

    // false = account suspended; checked on every auth request
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },

    // Hash of the current refresh token, used for logout + rotation.
    // select:false so it is never accidentally leaked.
    refreshTokenHash: {
      type: String,
      select: false,
    },

    // Embedded sub-document — exists only when role === RESPONDER.
    // Keeping it on the same document avoids a join for auth checks.
    responderProfile: {
      responderType: {
        type: String,
        enum: {
          values: RESPONDER_TYPE_VALUES,
          message: '{VALUE} is not a valid responder type',
        },
        default: RESPONDER_TYPES.PROFESSIONAL,
      },

      organisation: {
        type: String,
        trim: true,
      },

      referenceContact: {
        type: String,
        trim: true,
      },

      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },

      verifiedAt: {
        type: Date,
      },

      verificationStatus: {
        type: String,
        enum: {
          values: VERIFICATION_STATUS_VALUES,
          message: '{VALUE} is not a valid verification status',
        },
        default: VERIFICATION_STATUSES.PENDING,
      },

      verificationNote: {
        type: String,
        trim: true,
        maxlength: [500, 'Verification note too long'],
      },

      availability: {
        type: String,
        enum: {
          values: AVAILABILITY_VALUES,
          message: '{VALUE} is not a valid availability status',
        },
        default: AVAILABILITY.OFFLINE,
      },

      // e.g. ['MEDICAL', 'FIRE'] — for future specialization matching
      specialization: [
        {
          type: String,
          trim: true,
        },
      ],

      // GeoJSON Point for $near queries.
      // Coordinates order: [longitude, latitude] — this is GeoJSON standard.
      currentLocation: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: {
          type: [Number], // [lng, lat]
        },
      },

      lastLocationAt: {
        type: Date,
      },
    },

    // Emergency contacts (max 5 subdocuments).
    // select:false ensures these are never exposed by default via User queries or populate.
    emergencyContacts: {
      type: [emergencyContactSchema],
      default: [],
      select: false,
      validate: [
        {
          validator: (val) => !val || val.length <= 5,
          message: 'Cannot exceed 5 emergency contacts',
        },
      ],
    },

    // Medical information (private health data).
    // select:false ensures it is never returned by default.
    medicalInfo: {
      type: medicalInfoSchema,
      select: false,
      default: undefined,
    },
  },

  {
    timestamps: true, // createdAt, updatedAt added automatically
  }
);

// ---------- Indexes ----------

// Fast lookup by email (unique is already an index)
// Compound index for finding eligible responders:
//   "role=RESPONDER, verified, ONLINE" in one query
userSchema.index({
  role: 1,
  'responderProfile.availability': 1,
  'responderProfile.verificationStatus': 1,
});

// 2dsphere index for geospatial $near queries on responder location
userSchema.index({ 'responderProfile.currentLocation': '2dsphere' });

const User = mongoose.model('User', userSchema);

export default User;
