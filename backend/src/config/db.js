import mongoose from 'mongoose';
import env from './env.js';

/**
 * Connect to MongoDB Atlas.
 * Fails fast if the connection string is missing or the connection fails.
 */
const connectDB = async () => {
  const uri = env.MONGO_URI || process.env.MONGO_URI;


  if (!uri) {
    console.error('FATAL: MONGO_URI is not defined in .env');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
