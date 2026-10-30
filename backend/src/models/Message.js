import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    // Which incident's chat this message belongs to
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      required: [true, 'Message must belong to an incident'],
    },

    // Who sent this message — always set from the authenticated socket,
    // never from the client payload (prevents spoofing)
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Message must have a sender'],
    },

    text: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
      minlength: [1, 'Message cannot be empty'],
      maxlength: [500, 'Message must be at most 500 characters'],
    },

    // Set when the other participant reads the message (Stretch feature)
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // only createdAt needed
  }
);

// ---------- Indexes ----------

// Load a chat in chronological order efficiently
// (cursor pagination uses: incidentId + createdAt)
messageSchema.index({ incidentId: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
