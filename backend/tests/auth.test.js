import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { ROLES } from '../src/constants/roles.js';

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
});

describe('Phase 5: Auth & Authorization Tests', () => {
  const citizenPayload = {
    name: 'Jane Citizen',
    email: 'jane@example.com',
    phone: '9876543210',
    password: 'Password@123',
  };

  describe('POST /api/auth/register', () => {
    it('should register a USER successfully and set httpOnly auth cookies', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(citizenPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('jane@example.com');
      expect(res.body.data.user.role).toBe(ROLES.USER);
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.user.refreshTokenHash).toBeUndefined();

      // Check cookies
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('accessToken'))).toBe(true);
      expect(cookies.some((c) => c.includes('refreshToken'))).toBe(true);
    });

    it('should prevent role injection (client cannot escalate role to ADMIN)', async () => {
      const maliciousPayload = {
        ...citizenPayload,
        email: 'hacker@example.com',
        role: 'ADMIN',
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(maliciousPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe(ROLES.USER);
    });

    it('should reject registration if email is already taken', async () => {
      await request(app).post('/api/auth/register').send(citizenPayload);

      const res = await request(app)
        .post('/api/auth/register')
        .send(citizenPayload);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('DUPLICATE');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(citizenPayload);
    });

    it('should login with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: citizenPayload.email,
        password: citizenPayload.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(citizenPayload.email);
    });

    it('should reject login with wrong password without leaking account existence', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: citizenPayload.email,
        password: 'WrongPassword999',
      });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should reject login if account is deactivated/suspended', async () => {
      await User.updateOne({ email: citizenPayload.email }, { isActive: false });

      const res = await request(app).post('/api/auth/login').send({
        email: citizenPayload.email,
        password: citizenPayload.password,
      });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ACCOUNT_SUSPENDED');
    });
  });

  describe('Token Refresh & Rotation', () => {
    it('should rotate refresh token and revoke on logout', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send(citizenPayload);

      const cookies = regRes.headers['set-cookie'];
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));

      // 1. Perform refresh
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [refreshCookie]);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);

      const newCookies = refreshRes.headers['set-cookie'];
      const newRefreshCookie = newCookies.find((c) => c.startsWith('refreshToken='));
      const accessCookie = newCookies.find((c) => c.startsWith('accessToken='));

      // 2. Perform logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [accessCookie]);

      expect(logoutRes.status).toBe(200);

      // 3. Attempting to use refresh token after logout must fail
      const reuseRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [newRefreshCookie]);

      expect(reuseRes.status).toBe(401);
    });
  });

  describe('GET /api/auth/me & Profile Routes', () => {
    it('should return profile for authenticated user and update profile data', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send(citizenPayload);

      const cookies = regRes.headers['set-cookie'];
      const accessCookie = cookies.find((c) => c.startsWith('accessToken='));

      // Check /api/auth/me
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [accessCookie]);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.name).toBe(citizenPayload.name);

      // Check update /api/users/me
      const updateRes = await request(app)
        .patch('/api/users/me')
        .set('Cookie', [accessCookie])
        .send({ name: 'Jane Updated' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.user.name).toBe('Jane Updated');
    });
  });
});
