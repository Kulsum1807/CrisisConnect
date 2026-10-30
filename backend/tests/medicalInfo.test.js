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

describe('Medical Info Card Feature Tests', () => {
  let citizenOwner, citizenOther, responderAssigned, responderOther, adminUser;
  let ownerCookie, otherCitizenCookie, assignedRespCookie, otherRespCookie, adminCookie;

  beforeEach(async () => {
    // 1. Citizen Owner
    citizenOwner = await User.create({
      name: 'Alice Patient',
      email: 'alice@example.com',
      phone: '9876543210',
      password: 'HashedPassword123!',
      role: ROLES.USER,
    });
    ownerCookie = createAuthCookie(citizenOwner);

    // 2. Another Citizen
    citizenOther = await User.create({
      name: 'Bob Outsider',
      email: 'bob@example.com',
      phone: '9876543211',
      password: 'HashedPassword123!',
      role: ROLES.USER,
    });
    otherCitizenCookie = createAuthCookie(citizenOther);

    // 3. Assigned Responder
    responderAssigned = await User.create({
      name: 'Medic John',
      email: 'john@ems.org',
      phone: '9876543222',
      password: 'HashedPassword123!',
      role: ROLES.RESPONDER,
      responderProfile: {
        responderType: RESPONDER_TYPES.PROFESSIONAL,
        organisation: 'EMS Metro',
        referenceContact: 'chief@ems.org',
        verificationStatus: VERIFICATION_STATUSES.VERIFIED,
        availability: AVAILABILITY.ONLINE,
        currentLocation: {
          type: 'Point',
          coordinates: [77.5946, 12.9716],
        },
      },
    });
    assignedRespCookie = createAuthCookie(responderAssigned);

    // 4. Other Unassigned Responder
    responderOther = await User.create({
      name: 'Medic Jane',
      email: 'jane@ems.org',
      phone: '9876543233',
      password: 'HashedPassword123!',
      role: ROLES.RESPONDER,
      responderProfile: {
        responderType: RESPONDER_TYPES.PROFESSIONAL,
        organisation: 'EMS Metro',
        referenceContact: 'chief@ems.org',
        verificationStatus: VERIFICATION_STATUSES.VERIFIED,
        availability: AVAILABILITY.ONLINE,
        currentLocation: {
          type: 'Point',
          coordinates: [77.595, 12.972],
        },
      },
    });
    otherRespCookie = createAuthCookie(responderOther);

    // 5. Admin
    adminUser = await User.create({
      name: 'Admin Boss',
      email: 'admin@crisisconnect.test',
      phone: '9876543299',
      password: 'HashedPassword123!',
      role: ROLES.ADMIN,
    });
    adminCookie = createAuthCookie(adminUser);
  });

  describe('User Medical Info Profile CRUD (/api/users/me/medical-info)', () => {
    it('returns null/empty if owner has not configured medical info yet', async () => {
      const res = await request(app)
        .get('/api/users/me/medical-info')
        .set('Cookie', [ownerCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.medicalInfo).toBeNull();
    });

    it('owner can save medical info and read it back', async () => {
      const payload = {
        bloodGroup: 'O+',
        allergies: ['Penicillin', 'Peanuts'],
        conditions: ['Asthma', 'Hypertension'],
        medications: ['Albuterol Inhaler'],
        notes: 'Needs immediate bronchodilator if respiratory distress occurs.',
        shareWithResponders: true,
      };

      const putRes = await request(app)
        .put('/api/users/me/medical-info')
        .set('Cookie', [ownerCookie])
        .send(payload);

      expect(putRes.status).toBe(200);
      expect(putRes.body.success).toBe(true);
      expect(putRes.body.data.medicalInfo.bloodGroup).toBe('O+');
      expect(putRes.body.data.medicalInfo.allergies).toEqual(['Penicillin', 'Peanuts']);
      expect(putRes.body.data.medicalInfo.conditions).toEqual(['Asthma', 'Hypertension']);
      expect(putRes.body.data.medicalInfo.medications).toEqual(['Albuterol Inhaler']);
      expect(putRes.body.data.medicalInfo.shareWithResponders).toBe(true);

      // Verify with GET
      const getRes = await request(app)
        .get('/api/users/me/medical-info')
        .set('Cookie', [ownerCookie]);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.medicalInfo.bloodGroup).toBe('O+');
      expect(getRes.body.data.medicalInfo.notes).toBe(payload.notes);
      expect(getRes.body.data.medicalInfo.shareWithResponders).toBe(true);
    });

    it('trims strings properly on save', async () => {
      const payload = {
        bloodGroup: 'B-',
        allergies: ['  Sulfa drugs  ', ' Latex  '],
        conditions: ['  Diabetes Type 2  '],
        medications: ['  Metformin  '],
        notes: '   Check blood glucose levels   ',
        shareWithResponders: false,
      };

      const res = await request(app)
        .put('/api/users/me/medical-info')
        .set('Cookie', [ownerCookie])
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.data.medicalInfo.allergies).toEqual(['Sulfa drugs', 'Latex']);
      expect(res.body.data.medicalInfo.conditions).toEqual(['Diabetes Type 2']);
      expect(res.body.data.medicalInfo.medications).toEqual(['Metformin']);
      expect(res.body.data.medicalInfo.notes).toBe('Check blood glucose levels');
    });

    it('rejects unknown fields in PUT request body (strict Zod schema)', async () => {
      const payload = {
        bloodGroup: 'A+',
        allergies: ['Dust'],
        hackField: 'malicious',
      };

      const res = await request(app)
        .put('/api/users/me/medical-info')
        .set('Cookie', [ownerCookie])
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid bloodGroup enum', async () => {
      const payload = {
        bloodGroup: 'INVALID_GROUP',
      };

      const res = await request(app)
        .put('/api/users/me/medical-info')
        .set('Cookie', [ownerCookie])
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('rejects allergy items exceeding 60 characters or more than 10 items', async () => {
      const longItem = 'A'.repeat(61);
      const res = await request(app)
        .put('/api/users/me/medical-info')
        .set('Cookie', [ownerCookie])
        .send({ allergies: [longItem] });

      expect(res.status).toBe(400);

      const tooManyItems = Array.from({ length: 11 }, (_, i) => `Allergy ${i}`);
      const res2 = await request(app)
        .put('/api/users/me/medical-info')
        .set('Cookie', [ownerCookie])
        .send({ allergies: tooManyItems });

      expect(res2.status).toBe(400);
    });

    it('rejects notes exceeding 300 characters', async () => {
      const longNotes = 'N'.repeat(301);
      const res = await request(app)
        .put('/api/users/me/medical-info')
        .set('Cookie', [ownerCookie])
        .send({ notes: longNotes });

      expect(res.status).toBe(400);
    });

    it('owner can delete all medical info (DELETE /api/users/me/medical-info)', async () => {
      // First save
      await request(app)
        .put('/api/users/me/medical-info')
        .set('Cookie', [ownerCookie])
        .send({ bloodGroup: 'AB+', shareWithResponders: true });

      // Then delete
      const delRes = await request(app)
        .delete('/api/users/me/medical-info')
        .set('Cookie', [ownerCookie]);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      // Verify subsequent GET returns null
      const getRes = await request(app)
        .get('/api/users/me/medical-info')
        .set('Cookie', [ownerCookie]);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.medicalInfo).toBeNull();
    });

    it('never leaks medicalInfo in GET /api/users/me or other endpoints', async () => {
      await request(app)
        .put('/api/users/me/medical-info')
        .set('Cookie', [ownerCookie])
        .send({ bloodGroup: 'O-', notes: 'Confidential secret note', shareWithResponders: true });

      const profileRes = await request(app)
        .get('/api/users/me')
        .set('Cookie', [ownerCookie]);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.data.user.medicalInfo).toBeUndefined();
    });
  });

  describe('Incident Medical Info Access Control (/api/incidents/:id/medical-info)', () => {
    let incident;

    beforeEach(async () => {
      // Give owner saved medical info with shareWithResponders: true
      await request(app)
        .put('/api/users/me/medical-info')
        .set('Cookie', [ownerCookie])
        .send({
          bloodGroup: 'A+',
          allergies: ['Aspirin', 'Penicillin'],
          conditions: ['Asthma'],
          medications: ['Symbicort'],
          notes: 'Severe asthma attacks in cold weather.',
          shareWithResponders: true,
        });

      // Create an incident created by Alice
      incident = await Incident.create({
        incidentNumber: 'CC-5001',
        category: CATEGORIES.MEDICAL,
        severity: SEVERITIES.HIGH,
        status: STATUSES.PENDING,
        createdBy: citizenOwner._id,
        location: {
          type: 'Point',
          coordinates: [77.5946, 12.9716],
        },
        address: '123 MG Road, Bangalore',
      });
    });

    it('other user (citizen) gets 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/incidents/${incident._id}/medical-info`)
        .set('Cookie', [otherCitizenCookie]);

      expect(res.status).toBe(403);
      expect(res.body.data).toBeUndefined();
    });

    it('unassigned responder gets nothing (data.medicalInfo is null)', async () => {
      // Incident is assigned to responderAssigned and status is ACCEPTED
      incident.assignedResponder = responderAssigned._id;
      incident.status = STATUSES.ACCEPTED;
      await incident.save();

      // responderOther queries
      const res = await request(app)
        .get(`/api/incidents/${incident._id}/medical-info`)
        .set('Cookie', [otherRespCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.medicalInfo).toBeNull();
    });

    it('assigned responder gets nothing before ACCEPTED (e.g. status is PENDING)', async () => {
      // Incident has assignedResponder set but status is still PENDING
      incident.assignedResponder = responderAssigned._id;
      incident.status = STATUSES.PENDING;
      await incident.save();

      const res = await request(app)
        .get(`/api/incidents/${incident._id}/medical-info`)
        .set('Cookie', [assignedRespCookie]);

      expect(res.status).toBe(200);
      expect(res.body.data.medicalInfo).toBeNull();
    });

    it('assigned responder gets data after ACCEPTED when opted in', async () => {
      incident.assignedResponder = responderAssigned._id;
      incident.status = STATUSES.ACCEPTED;
      await incident.save();

      const res = await request(app)
        .get(`/api/incidents/${incident._id}/medical-info`)
        .set('Cookie', [assignedRespCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.medicalInfo).toBeDefined();
      expect(res.body.data.medicalInfo.bloodGroup).toBe('A+');
      expect(res.body.data.medicalInfo.allergies).toEqual(['Aspirin', 'Penicillin']);
      expect(res.body.data.medicalInfo.conditions).toEqual(['Asthma']);
      expect(res.body.data.medicalInfo.notes).toBe('Severe asthma attacks in cold weather.');
    });

    it('assigned responder gets data when status is IN_PROGRESS', async () => {
      incident.assignedResponder = responderAssigned._id;
      incident.status = STATUSES.IN_PROGRESS;
      await incident.save();

      const res = await request(app)
        .get(`/api/incidents/${incident._id}/medical-info`)
        .set('Cookie', [assignedRespCookie]);

      expect(res.status).toBe(200);
      expect(res.body.data.medicalInfo).not.toBeNull();
      expect(res.body.data.medicalInfo.bloodGroup).toBe('A+');
    });

    it('switching opt-in off hides data immediately (live read, no caching)', async () => {
      incident.assignedResponder = responderAssigned._id;
      incident.status = STATUSES.ACCEPTED;
      await incident.save();

      // 1. Initial call returns data
      const res1 = await request(app)
        .get(`/api/incidents/${incident._id}/medical-info`)
        .set('Cookie', [assignedRespCookie]);

      expect(res1.body.data.medicalInfo).not.toBeNull();

      // 2. Citizen turns off shareWithResponders
      await request(app)
        .put('/api/users/me/medical-info')
        .set('Cookie', [ownerCookie])
        .send({
          bloodGroup: 'A+',
          allergies: ['Aspirin', 'Penicillin'],
          conditions: ['Asthma'],
          medications: ['Symbicort'],
          notes: 'Severe asthma attacks in cold weather.',
          shareWithResponders: false, // Turn off
        });

      // 3. Next call immediately returns null
      const res2 = await request(app)
        .get(`/api/incidents/${incident._id}/medical-info`)
        .set('Cookie', [assignedRespCookie]);

      expect(res2.status).toBe(200);
      expect(res2.body.data.medicalInfo).toBeNull();
    });

    it('resolved incident hides data immediately', async () => {
      incident.assignedResponder = responderAssigned._id;
      incident.status = STATUSES.RESOLVED;
      await incident.save();

      const res = await request(app)
        .get(`/api/incidents/${incident._id}/medical-info`)
        .set('Cookie', [assignedRespCookie]);

      expect(res.status).toBe(200);
      expect(res.body.data.medicalInfo).toBeNull();
    });

    it('cancelled or rejected incident hides data', async () => {
      incident.assignedResponder = responderAssigned._id;
      incident.status = STATUSES.CANCELLED;
      await incident.save();

      const resCancelled = await request(app)
        .get(`/api/incidents/${incident._id}/medical-info`)
        .set('Cookie', [assignedRespCookie]);

      expect(resCancelled.body.data.medicalInfo).toBeNull();

      incident.status = STATUSES.REJECTED;
      await incident.save();

      const resRejected = await request(app)
        .get(`/api/incidents/${incident._id}/medical-info`)
        .set('Cookie', [assignedRespCookie]);

      expect(resRejected.body.data.medicalInfo).toBeNull();
    });

    it('incident endpoint does not reveal whether medical info exists if not shared', async () => {
      // Citizen who has no medical info at all
      const newCitizen = await User.create({
        name: 'Charlie Blank',
        email: 'charlie@example.com',
        phone: '9876543288',
        password: 'HashedPassword123!',
        role: ROLES.USER,
      });

      const newInc = await Incident.create({
        incidentNumber: 'CC-5002',
        category: CATEGORIES.FIRE,
        severity: SEVERITIES.CRITICAL,
        status: STATUSES.ACCEPTED,
        createdBy: newCitizen._id,
        assignedResponder: responderAssigned._id,
        location: {
          type: 'Point',
          coordinates: [77.5946, 12.9716],
        },
      });

      const res = await request(app)
        .get(`/api/incidents/${newInc._id}/medical-info`)
        .set('Cookie', [assignedRespCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.medicalInfo).toBeNull();
    });
  });
});
