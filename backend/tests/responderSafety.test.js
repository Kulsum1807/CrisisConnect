import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Incident from '../src/models/Incident.js';
import Counter from '../src/models/Counter.js';
import { ROLES } from '../src/constants/roles.js';
import { STATUSES } from '../src/constants/statuses.js';
import { SEVERITIES } from '../src/constants/severities.js';
import { CATEGORIES } from '../src/constants/categories.js';
import {
  VERIFICATION_STATUSES,
  AVAILABILITY,
  RESPONDER_TYPES,
} from '../src/constants/responder.js';
import { generateAccessToken } from '../src/utils/token.js';

let mongoServer;

const createAuthCookie = (user) => {
  const token = generateAccessToken({ userId: user._id.toString(), role: user.role });
  return `accessToken=${token}`;
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Incident.deleteMany({});
  await Counter.deleteMany({});
});

describe('Phase 7: Responder Safety Rules Tests', () => {
  let citizen1, citizen2, professionalResp, volunteerResp, admin;
  let citizen1Cookie, citizen2Cookie, profRespCookie, volRespCookie, adminCookie;

  beforeEach(async () => {
    // 1. Citizen Creator
    citizen1 = await User.create({
      name: 'Alice Citizen',
      email: 'alice@example.com',
      phone: '9876543210',
      password: 'HashedPassword123!',
      role: ROLES.USER,
    });
    citizen1Cookie = createAuthCookie(citizen1);

    // 2. Another Citizen (Attacker / Outsider)
    citizen2 = await User.create({
      name: 'Bob Citizen',
      email: 'bob@example.com',
      phone: '9876543211',
      password: 'HashedPassword123!',
      role: ROLES.USER,
    });
    citizen2Cookie = createAuthCookie(citizen2);

    // 3. Professional Responder (Verified, Online)
    professionalResp = await User.create({
      name: 'Dr. Emily Professional',
      email: 'emily@paramedics.org',
      phone: '9876543212',
      password: 'HashedPassword123!',
      role: ROLES.RESPONDER,
      responderProfile: {
        responderType: RESPONDER_TYPES.PROFESSIONAL,
        organisation: 'City General EMS',
        referenceContact: 'Chief Vance: 9876543299',
        verificationStatus: VERIFICATION_STATUSES.VERIFIED,
        availability: AVAILABILITY.ONLINE,
        currentLocation: {
          type: 'Point',
          coordinates: [77.21, 28.614], // [lng, lat]
        },
      },
    });
    profRespCookie = createAuthCookie(professionalResp);

    // 4. Volunteer Responder (Verified, Online)
    volunteerResp = await User.create({
      name: 'Charlie Volunteer',
      email: 'charlie@volunteers.org',
      phone: '9876543213',
      password: 'HashedPassword123!',
      role: ROLES.RESPONDER,
      responderProfile: {
        responderType: RESPONDER_TYPES.VOLUNTEER,
        organisation: 'Community Red Cross Volunteers',
        referenceContact: 'Coordinator Smith: 9876543288',
        verificationStatus: VERIFICATION_STATUSES.VERIFIED,
        availability: AVAILABILITY.ONLINE,
        currentLocation: {
          type: 'Point',
          coordinates: [77.212, 28.615],
        },
      },
    });
    volRespCookie = createAuthCookie(volunteerResp);

    // 5. Admin
    admin = await User.create({
      name: 'Super Admin',
      email: 'admin@crisisconnect.org',
      phone: '9876543214',
      password: 'HashedPassword123!',
      role: ROLES.ADMIN,
    });
    adminCookie = createAuthCookie(admin);
  });

  describe('1. Least Information Disclosure Before Accept', () => {
    it('responder cannot see exact data before accept; sees only allowed fields', async () => {
      // Citizen creates incident with exact coordinates and address
      const createRes = await request(app)
        .post('/api/incidents')
        .set('Cookie', [citizen1Cookie])
        .send({
          category: CATEGORIES.MEDICAL,
          description: 'Citizen having severe asthma attack in apartment 4B',
          location: { lat: 28.61394, lng: 77.20902 },
          address: 'Flat 4B, Lotus Apartments, MG Road, New Delhi',
        });

      expect(createRes.status).toBe(201);
      const incidentId = createRes.body.data.incident._id;

      // Professional responder views the incident before accept
      const getRes = await request(app)
        .get(`/api/incidents/${incidentId}`)
        .set('Cookie', [profRespCookie]);

      expect(getRes.status).toBe(200);
      const data = getRes.body.data.incident;

      // MUST NOT contain exact coordinates, address, citizen name, or citizen phone
      expect(data.name).toBeUndefined();
      expect(data.phone).toBeUndefined();
      expect(data.address).toBeUndefined();
      expect(data.location).toBeUndefined();
      expect(data.createdBy).toBeUndefined();

      // MUST contain allowed fields from step 1
      expect(data.id).toBe(incidentId);
      expect(data.incidentNumber).toMatch(/^CC-\d+$/);
      expect(data.category).toBe(CATEGORIES.MEDICAL);
      expect(data.severity).toBeDefined();
      expect(data.createdAt).toBeDefined();

      // approximateLocation must have coordinates rounded to 2 decimals
      expect(data.approximateLocation).toBeDefined();
      expect(data.approximateLocation.lat).toBe(28.61);
      expect(data.approximateLocation.lng).toBe(77.21);

      // distanceKm must be rounded to nearest 0.5
      expect(data.distanceKm).toBeDefined();
      expect(typeof data.distanceKm).toBe('number');
      expect(data.distanceKm % 0.5).toBe(0);
    });

    it('responder sees exact data (location, address, name, phone) after accept', async () => {
      // Citizen creates incident
      const createRes = await request(app)
        .post('/api/incidents')
        .set('Cookie', [citizen1Cookie])
        .send({
          category: CATEGORIES.MEDICAL,
          description: 'Emergency assistance required',
          location: { lat: 28.61394, lng: 77.20902 },
          address: 'Flat 4B, Lotus Apartments, MG Road, New Delhi',
        });
      const incidentId = createRes.body.data.incident._id;

      // Professional responder accepts incident
      const acceptRes = await request(app)
        .post(`/api/responders/incidents/${incidentId}/accept`)
        .set('Cookie', [profRespCookie]);

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.incident.status).toBe(STATUSES.ACCEPTED);

      // Query incident again after accept
      const getAfterAcceptRes = await request(app)
        .get(`/api/incidents/${incidentId}`)
        .set('Cookie', [profRespCookie]);

      expect(getAfterAcceptRes.status).toBe(200);
      const data = getAfterAcceptRes.body.data.incident;

      // MUST contain exact location, address, citizen name, and phone
      expect(data.location).toBeDefined();
      expect(data.location.coordinates).toEqual([77.20902, 28.61394]);
      expect(data.address).toBe('Flat 4B, Lotus Apartments, MG Road, New Delhi');
      expect(data.name || data.createdBy?.name).toBe('Alice Citizen');
      expect(data.phone || data.createdBy?.phone).toBe('9876543210');
    });
  });

  describe('2. Responder Types & Restrictions', () => {
    it('volunteer responder cannot use accept (claim) endpoint and gets 403', async () => {
      const createRes = await request(app)
        .post('/api/incidents')
        .set('Cookie', [citizen1Cookie])
        .send({ isSOS: true });
      const incidentId = createRes.body.data.incident._id;

      // Charlie (VOLUNTEER) attempts to accept/claim
      const acceptRes = await request(app)
        .post(`/api/responders/incidents/${incidentId}/accept`)
        .set('Cookie', [volRespCookie]);

      expect(acceptRes.status).toBe(403);
      expect(acceptRes.body.code).toBe('FORBIDDEN');
      expect(acceptRes.body.message).toMatch(/volunteer/i);
    });

    it('admin verification sets verifiedBy and verifiedAt on responderProfile', async () => {
      // Register a new unverified responder
      const pendingResponder = await User.create({
        name: 'New Trainee',
        email: 'trainee@paramedics.org',
        phone: '9876543219',
        password: 'HashedPassword123!',
        role: ROLES.RESPONDER,
        responderProfile: {
          responderType: RESPONDER_TYPES.PROFESSIONAL,
          organisation: 'Red Cross',
          referenceContact: 'Captain Miller: 9876543277',
          verificationStatus: VERIFICATION_STATUSES.PENDING,
          availability: AVAILABILITY.OFFLINE,
        },
      });

      // Admin approves verification
      const verifyRes = await request(app)
        .patch(`/api/admin/responders/${pendingResponder._id}/verify`)
        .set('Cookie', [adminCookie])
        .send({ status: VERIFICATION_STATUSES.VERIFIED, note: 'Credentials authenticated' });

      expect(verifyRes.status).toBe(200);

      // Verify in DB
      const updatedUser = await User.findById(pendingResponder._id);
      expect(updatedUser.responderProfile.verificationStatus).toBe(VERIFICATION_STATUSES.VERIFIED);
      expect(updatedUser.responderProfile.verifiedBy.toString()).toBe(admin._id.toString());
      expect(updatedUser.responderProfile.verifiedAt).toBeInstanceOf(Date);
    });

    it('admin cannot assign a volunteer to a CRITICAL incident', async () => {
      // Create a CRITICAL incident
      const createRes = await request(app)
        .post('/api/incidents')
        .set('Cookie', [citizen1Cookie])
        .send({
          isSOS: true,
          checklist: { breathing: false, conscious: false }, // calculates to CRITICAL
        });

      const incidentId = createRes.body.data.incident._id;
      const incident = await Incident.findById(incidentId);
      expect(incident.severity).toBe(SEVERITIES.CRITICAL);

      // Admin attempts to assign Charlie (VOLUNTEER) to CRITICAL incident
      const assignRes = await request(app)
        .post(`/api/incidents/${incidentId}/assign`)
        .set('Cookie', [adminCookie])
        .send({ responderId: volunteerResp._id.toString() });

      expect(assignRes.status).toBe(400);
      expect(assignRes.body.code).toBe('VALIDATION_ERROR');
      expect(assignRes.body.message).toMatch(/volunteer/i);

      // Incident should NOT be assigned to volunteer
      const checkIncident = await Incident.findById(incidentId);
      expect(checkIncident.status).toBe(STATUSES.PENDING);
      expect(checkIncident.assignedResponder).toBeNull();

      // Admin CAN assign a PROFESSIONAL responder to the CRITICAL incident
      const profAssignRes = await request(app)
        .post(`/api/incidents/${incidentId}/assign`)
        .set('Cookie', [adminCookie])
        .send({ responderId: professionalResp._id.toString() });

      expect(profAssignRes.status).toBe(200);
      expect(profAssignRes.body.data.incident.status).toBe(STATUSES.ASSIGNED);
    });
  });

  describe('3. "I Feel Unsafe" (POST /api/incidents/:id/report-responder)', () => {
    it('report-responder resets the incident and the responder', async () => {
      // 1. Create incident
      const createRes = await request(app)
        .post('/api/incidents')
        .set('Cookie', [citizen1Cookie])
        .send({
          isSOS: false,
          category: CATEGORIES.MEDICAL,
          description: 'Severe sprain and dizziness',
        });
      const incidentId = createRes.body.data.incident._id;

      // 2. Professional responder accepts the incident
      await request(app)
        .post(`/api/responders/incidents/${incidentId}/accept`)
        .set('Cookie', [profRespCookie]);

      // Verify responder is currently marked BUSY
      const busyResp = await User.findById(professionalResp._id);
      expect(busyResp.responderProfile.availability).toBe(AVAILABILITY.BUSY);
      expect(busyResp.responderProfile.verificationStatus).toBe(VERIFICATION_STATUSES.VERIFIED);

      // 3. Citizen triggers "I feel unsafe"
      const reportRes = await request(app)
        .post(`/api/incidents/${incidentId}/report-responder`)
        .set('Cookie', [citizen1Cookie])
        .send({ reason: 'Responder acting erratically and making citizen uncomfortable' });

      expect(reportRes.status).toBe(200);
      expect(reportRes.body.success).toBe(true);

      // 4. Verify incident in DB:
      // - status back to PENDING
      // - assignedResponder cleared (null)
      // - professionalResp added to declinedBy
      // - statusHistory updated with note
      const updatedIncident = await Incident.findById(incidentId);
      expect(updatedIncident.status).toBe(STATUSES.PENDING);
      expect(updatedIncident.assignedResponder).toBeNull();
      expect(
        updatedIncident.declinedBy.some(
          (id) => id.toString() === professionalResp._id.toString()
        )
      ).toBe(true);

      const latestHistory = updatedIncident.statusHistory[updatedIncident.statusHistory.length - 1];
      expect(latestHistory.status).toBe(STATUSES.PENDING);
      expect(latestHistory.note).toMatch(/erratically/i);

      // 5. Verify reported responder in DB:
      // - verificationStatus reset to PENDING
      // - availability reset to OFFLINE
      // - isActive is still true (NOT deactivated)
      const updatedResp = await User.findById(professionalResp._id);
      expect(updatedResp.isActive).toBe(true);
      expect(updatedResp.responderProfile.verificationStatus).toBe(VERIFICATION_STATUSES.PENDING);
      expect(updatedResp.responderProfile.availability).toBe(AVAILABILITY.OFFLINE);
    });

    it('other users get 404 on that route', async () => {
      // Citizen 1 creates incident and responder accepts
      const createRes = await request(app)
        .post('/api/incidents')
        .set('Cookie', [citizen1Cookie])
        .send({ isSOS: true });
      const incidentId = createRes.body.data.incident._id;

      await request(app)
        .post(`/api/responders/incidents/${incidentId}/accept`)
        .set('Cookie', [profRespCookie]);

      // Citizen 2 (non-creator) attempts to call report-responder
      const intruderRes = await request(app)
        .post(`/api/incidents/${incidentId}/report-responder`)
        .set('Cookie', [citizen2Cookie])
        .send({ reason: 'Unauthorized bystander report' });

      expect(intruderRes.status).toBe(404);
      expect(intruderRes.body.code).toBe('NOT_FOUND');
    });

    it('rejects report-responder if incident is in PENDING or terminal status', async () => {
      const createRes = await request(app)
        .post('/api/incidents')
        .set('Cookie', [citizen1Cookie])
        .send({ isSOS: true });
      const incidentId = createRes.body.data.incident._id;

      // Attempt report while still PENDING (no responder assigned)
      const pendingReportRes = await request(app)
        .post(`/api/incidents/${incidentId}/report-responder`)
        .set('Cookie', [citizen1Cookie])
        .send({ reason: 'No one is here yet' });

      expect(pendingReportRes.status).toBe(409);
      expect(pendingReportRes.body.code).toBe('INVALID_TRANSITION');
    });
  });
});
