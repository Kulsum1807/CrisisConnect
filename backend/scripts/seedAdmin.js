import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../src/models/User.js';
import connectDB from '../src/config/db.js';
import env from '../src/config/env.js';
import { ROLES } from '../src/constants/roles.js';
import logger from '../src/utils/logger.js';

/**
 * Seed Script: Create default system administrator.
 * Idempotent: checks if admin already exists before creating.
 *
 * Run: npm run seed:admin
 */
const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@crisisconnect.org';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
    const adminName = process.env.ADMIN_NAME || 'CrisisConnect Super Admin';
    const adminPhone = process.env.ADMIN_PHONE || '9999999999';

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      logger.info(`Admin user already exists: ${adminEmail}`);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      phone: adminPhone,
      password: hashedPassword,
      role: ROLES.ADMIN,
    });

    logger.info(`✅ Admin user seeded successfully: ${admin.email} (ID: ${admin._id})`);
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Failed to seed admin user');
    process.exit(1);
  }
};

seedAdmin();
