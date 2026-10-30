import request from 'supertest';
import express from 'express';
import app from '../src/app.js';
import { z } from 'zod';
import validate from '../src/middleware/validate.js';
import AppError from '../src/utils/AppError.js';
import notFound from '../src/middleware/notFound.js';
import errorMiddleware from '../src/middleware/errorMiddleware.js';

describe('Phase 4: Backend Foundation Tests', () => {
  describe('GET /api/health', () => {
    it('should return 200 with standard success envelope and health data', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'CrisisConnect backend operational');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('status', 'UP');
      expect(res.body.data).toHaveProperty('timestamp');
    });
  });

  describe('404 Route Handler', () => {
    it('should return 404 with standard error envelope for non-existent route', async () => {
      const res = await request(app).get('/api/undefined-endpoint-for-testing');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('code', 'NOT_FOUND');
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  describe('Validation Middleware', () => {
    const testApp = express();
    testApp.use(express.json());

    const testSchema = z.object({
      email: z.string().email('Invalid email address'),
      age: z.number().min(18, 'Must be at least 18'),
    });

    testApp.post('/test-validate', validate(testSchema), (req, res) => {
      res.json({ success: true, data: req.body });
    });
    testApp.use(notFound);
    testApp.use(errorMiddleware);

    it('should return 400 VALIDATION_ERROR with field-level details on invalid input', async () => {
      const res = await request(testApp).post('/test-validate').send({
        email: 'invalid-email',
        age: 15,
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.length).toBeGreaterThan(0);
      const fields = res.body.errors.map((e) => e.field);
      expect(fields).toContain('email');
      expect(fields).toContain('age');
    });

    it('should pass and process request when data is valid', async () => {
      const res = await request(testApp).post('/test-validate').send({
        email: 'valid.user@example.com',
        age: 25,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data.email).toBe('valid.user@example.com');
    });
  });

  describe('AppError & Error Handling', () => {
    const testApp = express();
    testApp.use(express.json());

    testApp.get('/test-error', (req, res, next) => {
      next(new AppError('Custom forbidden resource', 403, 'FORBIDDEN'));
    });
    testApp.use(notFound);
    testApp.use(errorMiddleware);

    it('should properly serialize custom AppError with correct code and status', async () => {
      const res = await request(testApp).get('/test-error');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('code', 'FORBIDDEN');
      expect(res.body.message).toBe('Custom forbidden resource');
    });
  });
});
