import mongoose from 'mongoose';

// The counters collection holds a single document for incident numbers.
// When an incident is created, the service calls:
//   Counter.findOneAndUpdate(
//     { _id: 'incident' },
//     { $inc: { seq: 1 } },
//     { upsert: true, new: true }
//   )
// The returned seq is formatted as "CC-1001" (prefix + seq).
//
// Why: avoids duplicate incident numbers even when two incidents
// are created at the exact same moment (atomic $inc).

const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  seq: {
    type: Number,
    default: 1000, // first incident will be CC-1001
    required: true,
  },
});

const Counter = mongoose.model('Counter', counterSchema);

export default Counter;
