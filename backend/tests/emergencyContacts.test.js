import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Incident from '../src/models/Incident.js';
import { RELATIONSHIPS } from '../src/constants/contacts.js';
import { CATEGORIES } from '../src/constants/categories.js';

let mongoServer;

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
});

describe('Emergency Contacts Feature Tests', () => {
  const registerUser = async (userPayload) => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(userPayload);
    const cookies = res.headers['set-cookie'];
    return { res, cookies, user: res.body.data?.user };
  };

  const userA = {
    name: 'User Alpha',
    email: 'alpha@example.com',
    phone: '9876543210',
    password: 'Password@123',
  };

  const userB = {
    name: 'User Beta',
    email: 'beta@example.com',
    phone: '9876543211',
    password: 'Password@123',
  };

  describe('POST /api/users/me/emergency-contacts', () => {
    it('should add an emergency contact successfully', async () => {
      const { cookies } = await registerUser(userA);

      const contactData = {
        name: 'John Doe',
        phone: '+919876543210',
        relationship: RELATIONSHIPS.FAMILY,
        email: 'john@example.com',
        isPrimary: true,
      };

      const res = await request(app)
        .post('/api/users/me/emergency-contacts')
        .set('Cookie', cookies)
        .send(contactData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.contact).toBeDefined();
      expect(res.body.data.contact._id).toBeDefined();
      expect(res.body.data.contact.name).toBe('John Doe');
      expect(res.body.data.contact.phone).toBe('+919876543210');
      expect(res.body.data.contact.relationship).toBe(RELATIONSHIPS.FAMILY);
      expect(res.body.data.contact.email).toBe('john@example.com');
      expect(res.body.data.contact.isPrimary).toBe(true);
    });

    it('should reject invalid phone numbers', async () => {
      const { cookies } = await registerUser(userA);

      const invalidContact = {
        name: 'Invalid Phone Contact',
        phone: '12345', // too short (< 10 digits)
        relationship: RELATIONSHIPS.FRIEND,
      };

      const res = await request(app)
        .post('/api/users/me/emergency-contacts')
        .set('Cookie', cookies)
        .send(invalidContact);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should enforce maximum limit of 5 contacts with 409 status', async () => {
      const { cookies } = await registerUser(userA);

      // Add 5 contacts
      for (let i = 1; i <= 5; i++) {
        const res = await request(app)
          .post('/api/users/me/emergency-contacts')
          .set('Cookie', cookies)
          .send({
            name: `Contact ${i}`,
            phone: `987654321${i}`,
            relationship: RELATIONSHIPS.FRIEND,
          });
        expect(res.status).toBe(201);
      }

      // Attempt to add a 6th contact
      const res6 = await request(app)
        .post('/api/users/me/emergency-contacts')
        .set('Cookie', cookies)
        .send({
          name: 'Contact 6 Extra',
          phone: '9876543299',
          relationship: RELATIONSHIPS.OTHER,
        });

      expect(res6.status).toBe(409);
      expect(res6.body.success).toBe(false);
      expect(res6.body.code).toBe('CONTACT_LIMIT_EXCEEDED');
    });
  });

  describe('GET /api/users/me/emergency-contacts', () => {
    it('should return list of user emergency contacts', async () => {
      const { cookies } = await registerUser(userA);

      await request(app)
        .post('/api/users/me/emergency-contacts')
        .set('Cookie', cookies)
        .send({
          name: 'Contact 1',
          phone: '9876543210',
          relationship: RELATIONSHIPS.FAMILY,
        });

      await request(app)
        .post('/api/users/me/emergency-contacts')
        .set('Cookie', cookies)
        .send({
          name: 'Contact 2',
          phone: '9876543211',
          relationship: RELATIONSHIPS.COLLEAGUE,
        });

      const res = await request(app)
        .get('/api/users/me/emergency-contacts')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.contacts).toHaveLength(2);
      expect(res.body.data.contacts[0].name).toBe('Contact 1');
      expect(res.body.data.contacts[1].name).toBe('Contact 2');
    });
  });

  describe('PATCH /api/users/me/emergency-contacts/:contactId', () => {
    it('should update an emergency contact', async () => {
      const { cookies } = await registerUser(userA);

      const addRes = await request(app)
        .post('/api/users/me/emergency-contacts')
        .set('Cookie', cookies)
        .send({
          name: 'Original Name',
          phone: '9876543210',
          relationship: RELATIONSHIPS.FAMILY,
        });

      const contactId = addRes.body.data.contact._id;

      const updateRes = await request(app)
        .patch(`/api/users/me/emergency-contacts/${contactId}`)
        .set('Cookie', cookies)
        .send({
          name: 'Updated Name',
          relationship: RELATIONSHIPS.FRIEND,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.contact.name).toBe('Updated Name');
      expect(updateRes.body.data.contact.relationship).toBe(RELATIONSHIPS.FRIEND);
    });

    it('should clear old primary when a new primary is set', async () => {
      const { cookies } = await registerUser(userA);

      const res1 = await request(app)
        .post('/api/users/me/emergency-contacts')
        .set('Cookie', cookies)
        .send({
          name: 'Contact 1',
          phone: '9876543210',
          relationship: RELATIONSHIPS.FAMILY,
          isPrimary: true,
        });
      const contact1Id = res1.body.data.contact._id;

      const res2 = await request(app)
        .post('/api/users/me/emergency-contacts')
        .set('Cookie', cookies)
        .send({
          name: 'Contact 2',
          phone: '9876543211',
          relationship: RELATIONSHIPS.FRIEND,
          isPrimary: false,
        });
      const contact2Id = res2.body.data.contact._id;

      // Update contact 2 to be primary
      const updateRes = await request(app)
        .patch(`/api/users/me/emergency-contacts/${contact2Id}`)
        .set('Cookie', cookies)
        .send({ isPrimary: true });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.contact.isPrimary).toBe(true);

      // Verify list: contact 1 is now false, contact 2 is true
      const listRes = await request(app)
        .get('/api/users/me/emergency-contacts')
        .set('Cookie', cookies);

      const c1 = listRes.body.data.contacts.find((c) => c._id === contact1Id);
      const c2 = listRes.body.data.contacts.find((c) => c._id === contact2Id);
      expect(c1.isPrimary).toBe(false);
      expect(c2.isPrimary).toBe(true);
    });
  });

  describe('DELETE /api/users/me/emergency-contacts/:contactId', () => {
    it('should delete an emergency contact', async () => {
      const { cookies } = await registerUser(userA);

      const addRes = await request(app)
        .post('/api/users/me/emergency-contacts')
        .set('Cookie', cookies)
        .send({
          name: 'To Delete',
          phone: '9876543210',
          relationship: RELATIONSHIPS.OTHER,
        });
      const contactId = addRes.body.data.contact._id;

      const delRes = await request(app)
        .delete(`/api/users/me/emergency-contacts/${contactId}`)
        .set('Cookie', cookies);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const listRes = await request(app)
        .get('/api/users/me/emergency-contacts')
        .set('Cookie', cookies);
      expect(listRes.body.data.contacts).toHaveLength(0);
    });
  });

  describe('Authorization & Isolation (IDOR prevention)', () => {
    it('should return 404 when another user tries to update or delete my contacts', async () => {
      const { cookies: cookiesA } = await registerUser(userA);
      const { cookies: cookiesB } = await registerUser(userB);

      // User A creates a contact
      const addRes = await request(app)
        .post('/api/users/me/emergency-contacts')
        .set('Cookie', cookiesA)
        .send({
          name: "User A's Contact",
          phone: '9876543210',
          relationship: RELATIONSHIPS.FAMILY,
        });
      const contactId = addRes.body.data.contact._id;

      // User B tries to update User A's contact
      const patchRes = await request(app)
        .patch(`/api/users/me/emergency-contacts/${contactId}`)
        .set('Cookie', cookiesB)
        .send({ name: 'Hacked Name' });

      expect(patchRes.status).toBe(404);
      expect(patchRes.body.success).toBe(false);

      // User B tries to delete User A's contact
      const delRes = await request(app)
        .delete(`/api/users/me/emergency-contacts/${contactId}`)
        .set('Cookie', cookiesB);

      expect(delRes.status).toBe(404);
      expect(delRes.body.success).toBe(false);

      // Verify contact is unchanged under User A
      const listRes = await request(app)
        .get('/api/users/me/emergency-contacts')
        .set('Cookie', cookiesA);
      expect(listRes.body.data.contacts).toHaveLength(1);
      expect(listRes.body.data.contacts[0].name).toBe("User A's Contact");
    });
  });

  describe('Privacy & Leak Prevention', () => {
    it('never returns emergencyContacts from profile, user queries or incident responses', async () => {
      const { cookies } = await registerUser(userA);

      // Add emergency contact
      await request(app)
        .post('/api/users/me/emergency-contacts')
        .set('Cookie', cookies)
        .send({
          name: 'Secret Contact',
          phone: '9876543210',
          relationship: RELATIONSHIPS.FAMILY,
        });

      // 1. GET /api/users/me profile should NOT contain emergencyContacts
      const meRes = await request(app)
        .get('/api/users/me')
        .set('Cookie', cookies);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.emergencyContacts).toBeUndefined();

      // 2. Incident creation & retrieval should NOT leak emergencyContacts in createdBy populate
      const incidentRes = await request(app)
        .post('/api/incidents')
        .set('Cookie', cookies)
        .send({
          category: CATEGORIES.FIRE,
          description: 'Testing emergency contact leak protection',
          location: {
            lat: 19.076,
            lng: 72.8777,
          },
          address: 'Mumbai, India',
        });

      expect(incidentRes.status).toBe(201);
      const incident = incidentRes.body.data.incident;
      expect(incident.createdBy.emergencyContacts).toBeUndefined();

      // Fetch incident by ID
      const getIncidentRes = await request(app)
        .get(`/api/incidents/${incident._id}`)
        .set('Cookie', cookies);

      expect(getIncidentRes.status).toBe(200);
      expect(getIncidentRes.body.data.incident.createdBy.emergencyContacts).toBeUndefined();
    });
  });
});
