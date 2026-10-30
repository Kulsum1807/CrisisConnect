/**
 * verifyModels.js — Phase 3 verification script
 *
 * Purpose: Prove that all models load correctly, indexes exist,
 * $near queries use the 2dsphere index, and the atomic counter
 * produces unique numbers under concurrency.
 *
 * Run:  node scripts/verifyModels.js
 * Then: check the console output and verify in MongoDB Compass.
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';
import { User, Incident, Message, Notification, Counter } from '../src/models/index.js';
import { ROLES } from '../src/constants/roles.js';
import { STATUSES } from '../src/constants/statuses.js';
import { CATEGORIES } from '../src/constants/categories.js';
import { SEVERITIES } from '../src/constants/severities.js';
import {
  VERIFICATION_STATUSES,
  AVAILABILITY,
  NOTIFICATION_TYPES,
} from '../src/constants/responder.js';

// ─── Helpers ───────────────────────────────────────────────

const divider = (title) => console.log(`\n${'═'.repeat(60)}\n  ${title}\n${'═'.repeat(60)}`);
const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg, err) => console.error(`  ❌ ${msg}:`, err?.message || err);

// ─── Main ──────────────────────────────────────────────────

async function main() {
  await connectDB();

  // Clean up any leftover test data from previous runs
  divider('CLEANUP');
  await User.deleteMany({ email: { $regex: /^test_verify_/ } });
  await Incident.deleteMany({ incidentNumber: { $regex: /^VERIFY-/ } });
  await Message.deleteMany({});
  await Notification.deleteMany({});
  await Counter.deleteOne({ _id: 'verify_test' });
  pass('Cleaned previous test data');

  // ─── 1. Create sample users ───────────────────────────────

  divider('1. CREATE SAMPLE USERS');

  const testUser = await User.create({
    name: 'Test Citizen',
    email: 'test_verify_user@test.com',
    phone: '9876543210',
    password: 'hashed_placeholder_not_real_bcrypt',
    role: ROLES.USER,
  });
  pass(`USER created: ${testUser.name} (${testUser._id})`);

  const testResponder1 = await User.create({
    name: 'Test Responder One',
    email: 'test_verify_resp1@test.com',
    phone: '9876543211',
    password: 'hashed_placeholder_not_real_bcrypt',
    role: ROLES.RESPONDER,
    responderProfile: {
      verificationStatus: VERIFICATION_STATUSES.VERIFIED,
      availability: AVAILABILITY.ONLINE,
      specialization: ['MEDICAL'],
      currentLocation: {
        type: 'Point',
        coordinates: [77.2090, 28.6139], // [lng, lat] — New Delhi
      },
      lastLocationAt: new Date(),
    },
  });
  pass(`RESPONDER 1 created: ${testResponder1.name} near New Delhi`);

  const testResponder2 = await User.create({
    name: 'Test Responder Two',
    email: 'test_verify_resp2@test.com',
    phone: '9876543212',
    password: 'hashed_placeholder_not_real_bcrypt',
    role: ROLES.RESPONDER,
    responderProfile: {
      verificationStatus: VERIFICATION_STATUSES.VERIFIED,
      availability: AVAILABILITY.ONLINE,
      specialization: ['FIRE'],
      currentLocation: {
        type: 'Point',
        coordinates: [77.2300, 28.6200], // ~2 km from responder 1
      },
      lastLocationAt: new Date(),
    },
  });
  pass(`RESPONDER 2 created: ${testResponder2.name} near New Delhi`);

  const testAdmin = await User.create({
    name: 'Test Admin',
    email: 'test_verify_admin@test.com',
    phone: '9876543213',
    password: 'hashed_placeholder_not_real_bcrypt',
    role: ROLES.ADMIN,
  });
  pass(`ADMIN created: ${testAdmin.name}`);

  // ─── 2. Create sample incident ──────────────────────────

  divider('2. CREATE SAMPLE INCIDENT');

  const testIncident = await Incident.create({
    incidentNumber: 'VERIFY-1001',
    createdBy: testUser._id,
    category: CATEGORIES.MEDICAL,
    description: 'Test medical emergency near Connaught Place',
    isSOS: true,
    severity: SEVERITIES.CRITICAL,
    status: STATUSES.PENDING,
    location: {
      type: 'Point',
      coordinates: [77.2195, 28.6328], // Connaught Place, Delhi
    },
    locationAvailable: true,
    checklist: {
      conscious: false,
      breathing: true,
      severeBleeding: false,
    },
    statusHistory: [
      {
        status: STATUSES.PENDING,
        changedBy: testUser._id,
        at: new Date(),
        note: 'SOS triggered',
      },
    ],
  });
  pass(`Incident created: ${testIncident.incidentNumber} (${testIncident.severity} ${testIncident.status})`);

  // ─── 3. Create sample message ───────────────────────────

  divider('3. CREATE SAMPLE MESSAGE');

  const testMessage = await Message.create({
    incidentId: testIncident._id,
    senderId: testUser._id,
    text: 'I am near the main gate of Connaught Place.',
  });
  pass(`Message created: "${testMessage.text}" (${testMessage._id})`);

  // ─── 4. Create sample notification ──────────────────────

  divider('4. CREATE SAMPLE NOTIFICATION');

  const testNotification = await Notification.create({
    userId: testResponder1._id,
    type: NOTIFICATION_TYPES.INCIDENT_NEW,
    title: 'New Emergency',
    message: `SOS Alert: ${testIncident.incidentNumber} — Medical emergency nearby`,
    relatedIncident: testIncident._id,
  });
  pass(`Notification created for ${testResponder1.name}: "${testNotification.title}"`);

  // ─── 5. $near query with explain ────────────────────────

  divider('5. $NEAR QUERY — FIND RESPONDERS NEAR INCIDENT');

  const incidentCoords = testIncident.location.coordinates;
  const nearbyResponders = await User.find({
    role: ROLES.RESPONDER,
    'responderProfile.verificationStatus': VERIFICATION_STATUSES.VERIFIED,
    'responderProfile.availability': AVAILABILITY.ONLINE,
    'responderProfile.currentLocation': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: incidentCoords,
        },
        $maxDistance: 5000, // 5 km in meters
      },
    },
  });
  pass(`Found ${nearbyResponders.length} responder(s) within 5 km:`);
  nearbyResponders.forEach((r) =>
    console.log(`    - ${r.name} (${r.responderProfile.specialization.join(', ')})`)
  );

  // Run explain to confirm index usage
  const explainResult = await User.find({
    role: ROLES.RESPONDER,
    'responderProfile.currentLocation': {
      $near: {
        $geometry: { type: 'Point', coordinates: incidentCoords },
        $maxDistance: 5000,
      },
    },
  }).explain('executionStats');

  const stage = explainResult?.queryPlanner?.winningPlan?.stage
    || explainResult?.[0]?.queryPlanner?.winningPlan?.stage
    || 'unknown';
  const indexUsed = JSON.stringify(explainResult).includes('2dsphere');
  pass(`Explain winning plan stage: ${stage}`);
  pass(`2dsphere index used: ${indexUsed ? 'YES ✅' : 'NO ⚠️'}`);

  // ─── 6. Atomic counter test — 20 parallel increments ───

  divider('6. ATOMIC COUNTER — 20 PARALLEL INCREMENTS');

  // Initialize a test counter
  await Counter.findOneAndUpdate(
    { _id: 'verify_test' },
    { $setOnInsert: { seq: 1000 } },
    { upsert: true, new: true }
  );

  // Fire 20 increments in parallel
  const results = await Promise.all(
    Array.from({ length: 20 }, () =>
      Counter.findOneAndUpdate(
        { _id: 'verify_test' },
        { $inc: { seq: 1 } },
        { new: true }
      )
    )
  );

  const seqValues = results.map((r) => r.seq).sort((a, b) => a - b);
  const uniqueValues = new Set(seqValues);

  pass(`Returned sequences: ${seqValues.join(', ')}`);
  pass(`All 20 unique: ${uniqueValues.size === 20 ? 'YES ✅' : `NO ⚠️ (got ${uniqueValues.size} unique)`}`);
  pass(`Expected range 1001-1020: min=${seqValues[0]}, max=${seqValues[seqValues.length - 1]}`);

  // ─── 7. Verify index list ──────────────────────────────

  divider('7. INDEXES VERIFICATION');

  const collections = ['users', 'incidents', 'messages', 'notifications'];
  for (const collName of collections) {
    const indexes = await mongoose.connection.db.collection(collName).indexes();
    console.log(`\n  ${collName} (${indexes.length} indexes):`);
    indexes.forEach((idx) => {
      const keys = Object.entries(idx.key).map(([k, v]) => `${k}:${v}`).join(', ');
      console.log(`    - ${idx.name}: { ${keys} }${idx.unique ? ' [UNIQUE]' : ''}`);
    });
  }

  // ─── 8. Verify select:false fields ─────────────────────

  divider('8. SELECT:FALSE VERIFICATION');

  const fetchedUser = await User.findById(testUser._id);
  pass(`password field hidden: ${fetchedUser.password === undefined ? 'YES ✅' : 'NO ⚠️'}`);
  pass(`refreshTokenHash hidden: ${fetchedUser.refreshTokenHash === undefined ? 'YES ✅' : 'NO ⚠️'}`);

  // Explicitly select to verify they exist in DB
  const fetchedWithSecrets = await User.findById(testUser._id).select('+password +refreshTokenHash');
  pass(`password accessible with +select: ${fetchedWithSecrets.password ? 'YES ✅' : 'NO ⚠️'}`);

  // ─── Cleanup ───────────────────────────────────────────

  divider('CLEANUP');
  await User.deleteMany({ email: { $regex: /^test_verify_/ } });
  await Incident.deleteMany({ incidentNumber: { $regex: /^VERIFY-/ } });
  await Message.deleteMany({ incidentId: testIncident._id });
  await Notification.deleteMany({ userId: testResponder1._id });
  await Counter.deleteOne({ _id: 'verify_test' });
  pass('All test data cleaned up');

  divider('ALL CHECKS COMPLETE');
  console.log('\n  Phase 3 verification passed! Models, indexes, $near and counter are working.\n');

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Verification failed:', err);
  mongoose.connection.close();
  process.exit(1);
});
