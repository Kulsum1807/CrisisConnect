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
import { VERIFICATION_STATUSES, AVAILABILITY } from '../src/constants/responder.js';
import { generateAccessToken, getCookieOptions } from '../src/utils/token.js';

let mongoServer;

const createAuthCookie = (user) => {
  const token = generateAccessToken({ userId: user._id.toString(), role: user.role });
  return `accessToken=${token}`;
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
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

describe('Phase 6: Incident Management Tests', () => {
  let citizen1, citizen2, responder1, responder2, admin;
  let citizen1Cookie, citizen2Cookie, responder1Cookie, responder2Cookie, adminCookie;

  beforeEach(async () => {
    // 1. Citizen 1
    citizen1 = await User.create({
      name: 'Alice Citizen',
      email: 'alice@example.com',
      phone: '9876543210',
      password: 'HashedPassword123!',
      role: ROLES.USER,
    });
    citizen1Cookie = createAuthCookie(citizen1);

    // 2. Citizen 2
    citizen2 = await User.create({
      name: 'Bob Citizen',
      email: 'bob@example.com',
      phone: '9876543211',
      password: 'HashedPassword123!',
      role: ROLES.USER,
    });
    citizen2Cookie = createAuthCookie(citizen2);

    // 3. Responder 1 (Verified, Online)
    responder1 = await User.create({
      name: 'Doc Emily',
      email: 'emily@responder.org',
      phone: '9876543212',
      password: 'HashedPassword123!',
      role: ROLES.RESPONDER,
      responderProfile: {
        verificationStatus: VERIFICATION_STATUSES.VERIFIED,
        availability: AVAILABILITY.ONLINE,
        currentLocation: {
          type: 'Point',
          coordinates: [77.209, 28.6139],
        },
      },
    });
    responder1Cookie = createAuthCookie(responder1);

    // 4. Responder 2 (Verified, Online)
    responder2 = await User.create({
      name: 'Officer Jack',
      email: 'jack@responder.org',
      phone: '9876543213',
      password: 'HashedPassword123!',
      role: ROLES.RESPONDER,
      responderProfile: {
        verificationStatus: VERIFICATION_STATUSES.VERIFIED,
        availability: AVAILABILITY.ONLINE,
        currentLocation: {
          type: 'Point',
          coordinates: [77.21, 28.614],
        },
      },
    });
    responder2Cookie = createAuthCookie(responder2);

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

  describe('Incident Creation & Server Authority', () => {
    it('should create SOS with computed HIGH severity and valid incidentNumber', async () => {
      const res = await request(app)
        .post('/api/incidents')
        .set('Cookie', [citizen1Cookie])
        .send({
          isSOS: true,
          location: { lat: 28.6139, lng: 77.209 },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const inc = res.body.data.incident;
      expect(inc.isSOS).toBe(true);
      expect(inc.status).toBe(STATUSES.PENDING);
      expect(inc.severity).toBe(SEVERITIES.HIGH);
      expect(inc.incidentNumber).toMatch(/^CC-\d+$/);
      expect(inc.location.coordinates).toEqual([77.209, 28.6139]);
      expect(inc.statusHistory.length).toBe(1);
    });

    it('should ignore client-sent severity, status, and fake createdBy (backend is authority)', async () => {
      const res = await request(app)
        .post('/api/incidents')
        .set('Cookie', [citizen1Cookie])
        .send({
          isSOS: false,
          category: CATEGORIES.ACCIDENT,
          description: 'Minor bumper bump, no one hurt',
          checklist: { injuries: false },
          // Malicious client inputs:
          severity: SEVERITIES.CRITICAL,
          status: STATUSES.RESOLVED,
          createdBy: citizen2._id,
          incidentNumber: 'CC-999999',
        });

      expect(res.status).toBe(201);
      const inc = res.body.data.incident;
      // Severity must be MEDIUM according to accident without injuries rule
      expect(inc.severity).toBe(SEVERITIES.MEDIUM);
      // Status must be PENDING
      expect(inc.status).toBe(STATUSES.PENDING);
      // Owner must be authenticated citizen1
      expect(inc.createdBy._id.toString()).toBe(citizen1._id.toString());
      // Incident number generated sequentially
      expect(inc.incidentNumber).not.toBe('CC-999999');
    });

    it('should handle location fallback when user location is missing or denied', async () => {
      const res = await request(app)
        .post('/api/incidents')
        .set('Cookie', [citizen1Cookie])
        .send({
          isSOS: true,
          address: 'Near Central Station, Gate 2',
        });

      expect(res.status).toBe(201);
      const inc = res.body.data.incident;
      expect(inc.locationAvailable).toBe(false);
      expect(inc.address).toBe('Near Central Station, Gate 2');
    });
  });

  describe('IDOR Protection on Incident Retrieval', () => {
    it('should return 404 (not 403) when a user tries to access another user incident', async () => {
      const createRes = await request(app)
        .post('/api/incidents')
        .set('Cookie', [citizen1Cookie])
        .send({
          isSOS: true,
        });
      const incidentId = createRes.body.data.incident._id;

      // Citizen 1 can access own incident
      const ownRes = await request(app)
        .get(`/api/incidents/${incidentId}`)
        .set('Cookie', [citizen1Cookie]);
      expect(ownRes.status).toBe(200);

      // Citizen 2 must get 404 NOT_FOUND (preventing ID enumeration)
      const otherRes = await request(app)
        .get(`/api/incidents/${incidentId}`)
        .set('Cookie', [citizen2Cookie]);
      expect(otherRes.status).toBe(404);
      expect(otherRes.body.code).toBe('NOT_FOUND');

      // Admin can access any incident
      const adminRes = await request(app)
        .get(`/api/incidents/${incidentId}`)
        .set('Cookie', [adminCookie]);
      expect(adminRes.status).toBe(200);
    });
  });

  describe('Lifecycle State Machine Transitions', () => {
    it('should guide an incident through PENDING -> ACCEPTED -> IN_PROGRESS -> RESOLVED', async () => {
      // 1. Create incident
      const createRes = await request(app)
        .post('/api/incidents')
        .set('Cookie', [citizen1Cookie])
        .send({ isSOS: true });
      const incidentId = createRes.body.data.incident._id;

      // 2. Responder 1 accepts/claims (PENDING -> ACCEPTED)
      const acceptRes = await request(app)
        .post(`/api/responders/incidents/${incidentId}/accept`)
        .set('Cookie', [responder1Cookie]);
      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.incident.status).toBe(STATUSES.ACCEPTED);
      expect(acceptRes.body.data.incident.assignedResponder._id.toString()).toBe(
        responder1._id.toString()
      );

      // Verify responder availability changed to BUSY
      const updatedResp = await User.findById(responder1._id);
      expect(updatedResp.responderProfile.availability).toBe(AVAILABILITY.BUSY);

      // 3. Responder starts work (ACCEPTED -> IN_PROGRESS)
      const startRes = await request(app)
        .patch(`/api/incidents/${incidentId}/status`)
        .set('Cookie', [responder1Cookie])
        .send({ status: STATUSES.IN_PROGRESS, note: 'Arrived at scene' });
      expect(startRes.status).toBe(200);
      expect(startRes.body.data.incident.status).toBe(STATUSES.IN_PROGRESS);

      // 4. Responder resolves incident (IN_PROGRESS -> RESOLVED)
      const resolveRes = await request(app)
        .patch(`/api/incidents/${incidentId}/status`)
        .set('Cookie', [responder1Cookie])
        .send({ status: STATUSES.RESOLVED, note: 'Patient stabilized and transported' });
      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.data.incident.status).toBe(STATUSES.RESOLVED);

      // Verify statusHistory records all transitions
      const history = resolveRes.body.data.incident.statusHistory;
      expect(history.length).toBe(4);
      expect(history.map((h) => h.status)).toEqual([
        STATUSES.PENDING,
        STATUSES.ACCEPTED,
        STATUSES.IN_PROGRESS,
        STATUSES.RESOLVED,
      ]);

      // Verify responder availability is restored to ONLINE
      const freedResp = await User.findById(responder1._id);
      expect(freedResp.responderProfile.availability).toBe(AVAILABILITY.ONLINE);
    });

    it('should reject illegal transitions with 409 INVALID_TRANSITION', async () => {
      const createRes = await request(app)
        .post('/api/incidents')
        .set('Cookie', [citizen1Cookie])
        .send({ isSOS: true });
      const incidentId = createRes.body.data.incident._id;

      // Trying PENDING -> RESOLVED directly
      const illegalRes = await request(app)
        .patch(`/api/incidents/${incidentId}/status`)
        .set('Cookie', [adminCookie])
        .send({ status: STATUSES.RESOLVED });

      expect(illegalRes.status).toBe(409);
      expect(illegalRes.body.code).toBe('INVALID_TRANSITION');
    });
  });

  describe('Parallel Exclusive Claim (Atomic Concurrency Test)', () => {
    it('should ensure exactly one responder claims an incident when competing simultaneously', async () => {
      const createRes = await request(app)
        .post('/api/incidents')
        .set('Cookie', [citizen1Cookie])
        .send({ isSOS: true });
      const incidentId = createRes.body.data.incident._id;

      // Fire parallel accept requests at the exact same moment
      const [res1, res2] = await Promise.all([
        request(app)
          .post(`/api/responders/incidents/${incidentId}/accept`)
          .set('Cookie', [responder1Cookie]),
        request(app)
          .post(`/api/responders/incidents/${incidentId}/accept`)
          .set('Cookie', [responder2Cookie]),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly ONE 200 (Success) and ONE 409 (Conflict ALREADY_TAKEN)
      expect(statuses).toEqual([200, 409]);

      const winner = res1.status === 200 ? res1 : res2;
      const loser = res1.status === 409 ? res1 : res2;

      expect(winner.body.success).toBe(true);
      expect(winner.body.data.incident.status).toBe(STATUSES.ACCEPTED);
      expect(loser.body.success).toBe(false);
      expect(loser.body.code).toBe('ALREADY_TAKEN');
    });
  });

  describe('Cancellation Rules', () => {
    it('should allow creator user to cancel PENDING incident', async () => {
      const createRes = await request(app)
        .post('/api/incidents')
        .set('Cookie', [citizen1Cookie])
        .send({ isSOS: true });
      const incidentId = createRes.body.data.incident._id;

      const cancelRes = await request(app)
        .post(`/api/incidents/${incidentId}/cancel`)
        .set('Cookie', [citizen1Cookie])
        .send({ reason: 'Accidental SOS button press' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.incident.status).toBe(STATUSES.CANCELLED);
    });

    it('should prevent creator user from cancelling an incident that is IN_PROGRESS', async () => {
      const createRes = await request(app)
        .post('/api/incidents')
        .set('Cookie', [citizen1Cookie])
        .send({ isSOS: true });
      const incidentId = createRes.body.data.incident._id;

      // Claim and move to IN_PROGRESS
      await request(app)
        .post(`/api/responders/incidents/${incidentId}/accept`)
        .set('Cookie', [responder1Cookie]);
      await request(app)
        .patch(`/api/incidents/${incidentId}/status`)
        .set('Cookie', [responder1Cookie])
        .send({ status: STATUSES.IN_PROGRESS });

      // User tries to cancel
      const userCancelRes = await request(app)
        .post(`/api/incidents/${incidentId}/cancel`)
        .set('Cookie', [citizen1Cookie])
        .send({ reason: 'Changed my mind' });

      expect(userCancelRes.status).toBe(403);
      expect(userCancelRes.body.code).toBe('FORBIDDEN');

      // Admin CAN cancel in progress
      const adminCancelRes = await request(app)
        .post(`/api/incidents/${incidentId}/cancel`)
        .set('Cookie', [adminCookie])
        .send({ reason: 'Police arrived and took over incident' });

      expect(adminCancelRes.status).toBe(200);
      expect(adminCancelRes.body.data.incident.status).toBe(STATUSES.CANCELLED);
    });
  });

  describe('Responder Decline Flow', () => {
    it('should add responder to declinedBy list when declined from feed', async () => {
      const createRes = await request(app)
        .post('/api/incidents')
        .set('Cookie', [citizen1Cookie])
        .send({ isSOS: true });
      const incidentId = createRes.body.data.incident._id;

      // Responder declines incident
      const declineRes = await request(app)
        .post(`/api/responders/incidents/${incidentId}/decline`)
        .set('Cookie', [responder1Cookie])
        .send({ reason: 'Vehicle tire puncture' });

      expect(declineRes.status).toBe(200);

      // Verify responder1 is in declinedBy
      const incident = await Incident.findById(incidentId);
      expect(
        incident.declinedBy.some((id) => id.toString() === responder1._id.toString())
      ).toBe(true);

      // Declined responder cannot claim it
      const claimRes = await request(app)
        .post(`/api/responders/incidents/${incidentId}/accept`)
        .set('Cookie', [responder1Cookie]);

      expect(claimRes.status).toBe(409);
    });
  });
});
