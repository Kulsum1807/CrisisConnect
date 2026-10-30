import express from 'express';
import * as authController from '../controllers/authController.js';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import authLimiter from '../middleware/rateLimiter.js';
import {
  registerSchema,
  registerResponderSchema,
  loginSchema,
} from '../validators/authValidator.js';

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  authController.register
);

router.post(
  '/register-responder',
  authLimiter,
  validate(registerResponderSchema),
  authController.registerResponder
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  authController.login
);

router.post('/refresh', authController.refresh);

router.post('/logout', protect, authController.logout);

router.get('/me', protect, authController.getMe);

export default router;
